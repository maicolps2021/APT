import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { collection, doc, updateDoc, query, where, orderBy, getDocs, Timestamp, deleteDoc } from 'firebase/firestore';
import { createPortal } from 'react-dom';
import { db } from '../lib/supabaseClient';
import { EVENT_CODE, WHATSAPP } from '../lib/config';
import type { Lead } from '../types';
import Card from '../components/Card';
import LeadDetailModal from '../components/LeadDetailModal';
import { useAuth } from '../contexts/AuthContext';
import { sendWhatsAppVia } from '../services/messaging';
import { getResolvedWhatsAppText } from '../lib/templates';
import { Mail, MessageSquare, CheckCircle2, MoreVertical, Calendar, Phone, Send, Plane, Clock, LoaderCircle, Search, UserPlus, Trash2, Bot } from 'lucide-react';
import { LEAD_CATEGORY_LABELS } from '../types';
import { LEAD_CATEGORY_ORDER } from '../lib/categoryMap';
import { inferStatusFromLead } from '../lib/status';

// Acepta Firestore Timestamp, string ISO/fecha, number (ms), o null/undefined.
function asDate(x: any): Date | null {
  // Firestore Timestamp tiene .toDate()
  // @ts-ignore
  if (x && typeof x === 'object' && typeof x.toDate === 'function') {
    try { const d = x.toDate(); return isFinite(d.getTime()) ? d : null; } catch { return null; }
  }
  if (typeof x === 'number') {
    const d = new Date(x);
    return isFinite(d.getTime()) ? d : null;
  }
  if (typeof x === 'string') {
    const s = x.trim();
    if (!s) return null;
    // Admite "YYYY-MM-DD" y ISO; Date(...) lo tolera, pero validamos
    const d = new Date(s);
    return isFinite(d.getTime()) ? d : null;
  }
  if (x instanceof Date) {
    return isFinite(x.getTime()) ? x : null;
  }
  return null;
}

function isValidDate(d: Date | null): d is Date {
  return !!(d && isFinite(d.getTime()));
}

// Helpers locales para compatibilidad
type AnyLead = Lead & Record<string, any>;

function resolveLeadPhone(lead: AnyLead): string | undefined {
  const keys = ['phone', 'phone_number', 'telefono', 'whatsapp', 'mobile', 'cell'];
  for (const k of keys) {
    const v = lead?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

// Mapeo de Metadatos de Siguiente Paso
const NEXT_STEP_META: Record<string, { icon: React.ComponentType<any>; label: string }> = {
  Condiciones: { icon: Send, label: 'Enviar Condiciones' },
  Reunion: { icon: Calendar, label: 'Agendar Reunión' },
  Llamada15: { icon: Phone, label: 'Llamada 15min' },
  FamTrip: { icon: Plane, label: 'FamTrip' },
  WhatsApp: { icon: MessageSquare, label: 'WhatsApp Follow-up' },
};

// Define a clear type for sort order to improve readability.
type SortOrder = 'NEWEST' | 'OLDEST';

const LeadList: React.FC = () => {
  const { status: authStatus } = useAuth();
  const [allLeads, setAllLeads] = useState<AnyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sendingMessage, setSendingMessage] = useState<Record<string, boolean>>({});

  // Filtros persistentes
  const [q, setQ] = useState(() => localStorage.getItem('lead_search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(() => localStorage.getItem('lead_filter_status') || 'ALL');
  const [nextStepFilter, setNextStepFilter] = useState<string>(() => localStorage.getItem('lead_filter_step') || 'ALL');
  const [channelFilter, setChannelFilter] = useState<string>(() => localStorage.getItem('lead_filter_channel') || 'ALL');
  // FIX: Renamed 'orderBy' to 'sortOrder' to avoid conflict with the 'orderBy' function imported from Firestore.
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => (localStorage.getItem('lead_order_by') as SortOrder) || 'NEWEST');

  // Menú de siguiente paso
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  type MenuPos = { x: number; y: number } | null;
  const [menuPos, setMenuPos] = useState<MenuPos>(null);

  // Persistir filtros en localStorage
  useEffect(() => { localStorage.setItem('lead_search', q); }, [q]);
  useEffect(() => { localStorage.setItem('lead_filter_status', statusFilter); }, [statusFilter]);
  useEffect(() => { localStorage.setItem('lead_filter_step', nextStepFilter); }, [nextStepFilter]);
  useEffect(() => { localStorage.setItem('lead_filter_channel', channelFilter); }, [channelFilter]);
  // FIX: Updated the dependency and key for persisting the sort order.
  useEffect(() => { localStorage.setItem('lead_order_by', sortOrder); }, [sortOrder]);

  const fetchAllLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryConstraints: any[] = [
        where('event_code', '==', EVENT_CODE),
        orderBy('created_at', 'desc'),
      ];

      let q = query(collection(db, 'leads'), ...queryConstraints);
      const snap = await getDocs(q);
      const newLeads = snap.docs.map(d => {
        const data = d.data();
        const date = asDate(data.created_at);
        const createdAt = isValidDate(date) ? date.toISOString() : new Date(0).toISOString();
        return { id: d.id, ...data, created_at: createdAt } as AnyLead;
      });
      
      setAllLeads(newLeads);
    } catch (err: any) {
      console.error("Error fetching leads:", err);
      setError("Failed to load leads. Please check connection and Firestore rules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchAllLeads();
    }
  }, [authStatus, fetchAllLeads]);

  const leads = useMemo(() => {
    const needle = q.trim().toLowerCase();

    const filtered = (allLeads || []).filter(l => {
      const inferredStatus = inferStatusFromLead(l);
      const passStatus = statusFilter === 'ALL' ? true : inferredStatus === statusFilter;
      
      const passNextStep = nextStepFilter === 'ALL' ? true : (l.next_step || '') === nextStepFilter;

      const passChannel = channelFilter === 'ALL' ? true : (l.source || '').toUpperCase() === channelFilter.toUpperCase();

      const haystack = [l.name, l.company, l.email, l.phone_e164, l.phone_raw].filter(Boolean).join(' ').toLowerCase();
      const passText = needle === '' ? true : haystack.includes(needle);

      return passStatus && passNextStep && passChannel && passText;
    });

    const withDate = filtered.map(l => ({
      l,
      d: asDate(l.created_at) || new Date(0)
    }));
    
    // FIX: Use the 'sortOrder' state variable in an explicit comparator to sort the leads correctly. This resolves the TypeScript error where the state variable was being treated as a function due to a name collision.
    withDate.sort((a, b) => sortOrder === 'NEWEST'
      ? b.d.getTime() - a.d.getTime()
      : a.d.getTime() - b.d.getTime());

    return withDate.map(x => x.l);
    // FIX: Updated the dependency array to use the renamed 'sortOrder' state.
  }, [allLeads, q, statusFilter, nextStepFilter, channelFilter, sortOrder]);

  const handleUpdateLeadState = (id: string, patch: Partial<Lead>) => {
    setAllLeads(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('¿Eliminar este lead definitivamente?')) return;
    setAllLeads(ls => ls.filter(l => l.id !== leadId));
    try {
      await deleteDoc(doc(db, 'leads', leadId));
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar. Recargando la lista.');
      fetchAllLeads();
    } finally {
      setOpenMenuId(null);
      setMenuPos(null);
    }
  };
  
  const handleSendWhatsApp = async (provider: 'wa' | 'builderbot', lead: AnyLead) => {
    const messageKey = `${lead.id}-${provider}`;
    setSendingMessage(prev => ({ ...prev, [messageKey]: true }));
    try {
        const toRaw = resolveLeadPhone(lead) || WHATSAPP;
        if (!toRaw) {
            alert('No phone available for WhatsApp.');
            return;
        }
        const text = await getResolvedWhatsAppText(lead);
        if (!text) {
            alert('WhatsApp template is empty for this lead category.');
            return;
        }
        await sendWhatsAppVia(provider, { to: toRaw, text, leadId: lead.id });
        if (provider === 'builderbot') alert('Message sent via BuilderBot!');
    } catch (err) {
        console.error(err);
        alert(`Could not send WhatsApp via ${provider}.`);
    } finally {
        setSendingMessage(prev => ({ ...prev, [messageKey]: false }));
    }
};

  const renderActions = (lead: AnyLead) => (
     <div className="flex items-center gap-1">
        <button
          className="action-btn"
          title="WhatsApp" aria-label="WhatsApp"
          disabled={sendingMessage[`${lead.id}-wa`]}
          onClick={(e) => { e.stopPropagation(); handleSendWhatsApp('wa', lead); }}
        >
          {sendingMessage[`${lead.id}-wa`] ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
        </button>
        <button
          className="action-btn"
          title="BuilderBot" aria-label="BuilderBot"
          disabled={sendingMessage[`${lead.id}-builderbot`]}
          onClick={(e) => { e.stopPropagation(); handleSendWhatsApp('builderbot', lead); }}
        >
          {sendingMessage[`${lead.id}-builderbot`] ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
        </button>
        <button
          className="action-btn"
          title="Email" aria-label="Email"
          onClick={(e) => {
            e.stopPropagation();
            const subject = encodeURIComponent(`[${EVENT_CODE}] Follow-up`);
            const body = encodeURIComponent(`Hi ${lead.name || ''},\n\nThanks for visiting our stand.\n\nBest regards,`);
            window.open(`mailto:${lead.email || ''}?subject=${subject}&body=${body}`, '_blank');
          }}
        >
          <Mail className="w-4 h-4" />
        </button>
        <div className="relative">
          <button
            className="action-btn"
            aria-haspopup="menu" aria-expanded={openMenuId === lead.id}
            onClick={(e) => {
              e.stopPropagation();
              if (openMenuId === lead.id) {
                setOpenMenuId(null);
                setMenuPos(null);
              } else {
                const btn = e.currentTarget as HTMLElement;
                const r = btn.getBoundingClientRect();
                setMenuPos({ x: r.left, y: r.bottom + 4 }); // 4px de separación
                setOpenMenuId(lead.id);
              }
            }}>
            <MoreVertical className="w-4 h-4" />
          </button>
          {openMenuId === lead.id && menuPos &&
            createPortal(
              <>
                {/* Backdrop para cerrar al hacer click fuera */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => { setOpenMenuId(null); setMenuPos(null); }}
                />
                <div
                  role="menu"
                  className="fixed z-50 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md shadow-xl p-1"
                  style={{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }}
                >
                  {Object.entries(NEXT_STEP_META).map(([key, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={key}
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-sm text-left"
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'leads', lead.id), { next_step: key, updated_at: Timestamp.now() });
                            handleUpdateLeadState(lead.id, { next_step: key as any });
                          } catch (e) { console.error(e); }
                          setOpenMenuId(null); setMenuPos(null);
                        }}
                      >
                        <Icon className="w-4 h-4" /><span>{meta.label}</span>
                      </button>
                    );
                  })}

                  <div className="my-1 h-px bg-gray-200 dark:bg-gray-800" />

                  <button
                    role="menuitem"
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-sm text-red-600 text-left"
                    onClick={() => handleDeleteLead(lead.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </>,
              document.body
            )
          }
        </div>
      </div>
  );

  const renderContent = () => {
    if (loading) return <div className="text-center p-8"><LoaderCircle className="animate-spin inline-block mr-2" /> Loading leads...</div>;
    if (error) return <div className="text-center p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">{error}</div>;
    if (allLeads.length === 0) {
      return (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">No leads captured yet.</p>
          <a href="#/capture" className="mt-4 inline-flex items-center justify-center rounded-lg px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
            <UserPlus className="mr-2 h-4 w-4" />
            Capture First Lead
          </a>
        </div>
      );
    }
     if (leads.length === 0) {
        return (
            <div className="text-center py-16">
                <p className="text-gray-500 dark:text-gray-400">No leads match the current filters.</p>
            </div>
        );
    }
    return (
      <>
        {/* Mobile View */}
        <div className="md:hidden space-y-3">
          {leads.map(lead => {
            const createdAt = asDate(lead.created_at);
            return (
                <div key={lead.id} onClick={() => setSelectedLead(lead)} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900 space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                    <div className="text-base font-semibold">{lead.name || '—'}</div>
                    <div className="text-sm opacity-70">{lead.company || '—'}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700`}>{inferStatusFromLead(lead)}</span>
                </div>
                <div className="text-sm opacity-80">
                    <div>{lead.email || '—'}</div>
                    <div>{resolveLeadPhone(lead) || '—'}</div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-800 pt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {renderActions(lead)}
                      <button
                        className="action-btn text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 focus:ring-red-400"
                        title="Eliminar" aria-label="Eliminar"
                        onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-xs text-gray-400">{isValidDate(createdAt) ? createdAt.toLocaleDateString() : '—'}</span>
                </div>
                </div>
            );
        })}
        </div>

        {/* Desktop View */}
        <div className="overflow-x-auto hidden md:block">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="th">Name</th>
                <th className="th">Contact</th>
                <th className="th">Status</th>
                <th className="th">Next Step</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {leads.map(lead => (
                <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-white">{lead.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{lead.company || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {resolveLeadPhone(lead) && <div>WA: {resolveLeadPhone(lead)}</div>}
                    {lead.email && <div>{lead.email}</div>}
                  </td>
                  <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium`}>{inferStatusFromLead(lead)}</span></td>
                  <td className="px-6 py-4">
                     {lead.next_step ? (()=> {
                       const meta = NEXT_STEP_META[lead.next_step] || {icon: Clock, label: lead.next_step};
                       return <div className="flex items-center gap-2 text-sm"><meta.icon className="w-4 h-4" /><span>{meta.label}</span></div>;
                    })() : <div className="flex items-center gap-2 text-sm text-gray-400"><Clock className="w-4 h-4" /><span>Define</span></div>}
                  </td>
                  <td className="px-6 py-4">{renderActions(lead)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };
  
  return (
    <div className="mx-auto max-w-7xl">
       <style>{`
        .th { @apply px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider; }
        .action-btn { @apply inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-wait; }
       `}</style>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Lead List</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">All captured leads for {EVENT_CODE}.</p>
        </div>
      </div>
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-4 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="relative sm:col-span-2 md:col-span-3 lg:col-span-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, company, email..."
              className="w-full pl-10 input" />
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="input">
            <option value="ALL">All status</option>
            <option value="NEW">NEW</option><option value="CONTACTED">CONTACTED</option><option value="PROPOSED">PROPOSED</option><option value="WON">WON</option><option value="LOST">LOST</option>
          </select>
          <select value={nextStepFilter} onChange={e=>setNextStepFilter(e.target.value)} className="input">
            <option value="ALL">All next steps</option>
            {Object.entries(NEXT_STEP_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
          </select>
          <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className="input">
            <option value="ALL">All channels</option>
            <option value="QR">QR</option>
            <option value="MANUAL">MANUAL</option>
          </select>
          {/* FIX: The value and onChange handler now correctly reference 'sortOrder' and 'setSortOrder'. */}
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value as SortOrder)} className="input col-span-2 lg:col-span-1">
            <option value="NEWEST">Newest first</option>
            <option value="OLDEST">Oldest first</option>
          </select>
        </div>
        {renderContent()}
      </Card>
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
};

export default LeadList;