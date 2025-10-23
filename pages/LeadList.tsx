import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { collection, doc, updateDoc, query, where, orderBy, limit, startAfter, getDocs, Timestamp, deleteDoc } from 'firebase/firestore';
import { createPortal } from 'react-dom';
import { db } from '../lib/supabaseClient';
import { EVENT_CODE } from '../lib/config';
import type { Lead } from '../types';
import Card from '../components/Card';
import LeadDetailModal from '../components/LeadDetailModal';
import { useAuth } from '../contexts/AuthContext';
import { sendWhatsApp, isReady } from '../services/messaging';
import { WHATSAPP } from '../lib/config';
import { Mail, MessageSquare, CheckCircle2, MoreVertical, Calendar, Phone, Send, Plane, Clock, LoaderCircle, Search, UserPlus, Trash2 } from 'lucide-react';

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

function normPhone(p?: string) {
  if (!p) return '';
  return p.replace(/[()\-\s]/g, '').trim();
}

// Mapeo de Metadatos de Siguiente Paso
const NEXT_STEP_META: Record<string, { icon: React.ComponentType<any>; label: string }> = {
  Condiciones: { icon: Send, label: 'Enviar Condiciones' },
  Reunion: { icon: Calendar, label: 'Agendar Reunión' },
  Llamada15: { icon: Phone, label: 'Llamada 15min' },
  FamTrip: { icon: Plane, label: 'FamTrip' },
  WhatsApp: { icon: MessageSquare, label: 'WhatsApp Follow-up' },
};

const LeadList: React.FC = () => {
  const { status: authStatus } = useAuth();
  const [leads, setLeads] = useState<AnyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Filtros persistentes
  const [filterStatus, setFilterStatus] = useState<string>(() => localStorage.getItem('lead_filter_status') || '');
  const [filterStep, setFilterStep] = useState<string>(() => localStorage.getItem('lead_filter_step') || '');
  const [filterChannel, setFilterChannel] = useState<string>(() => localStorage.getItem('lead_filter_channel') || '');
  const [search, setSearch] = useState<string>(() => localStorage.getItem('lead_search') || '');
  
  // Paginación
  const PAGE_SIZE = 100;
  const [loadingPage, setLoadingPage] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<any | null>(null);

  // Menú de siguiente paso
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  type MenuPos = { x: number; y: number } | null;
  const [menuPos, setMenuPos] = useState<MenuPos>(null);


  // Persistir filtros en localStorage
  useEffect(() => { localStorage.setItem('lead_filter_status', filterStatus); }, [filterStatus]);
  useEffect(() => { localStorage.setItem('lead_filter_step', filterStep); }, [filterStep]);
  useEffect(() => { localStorage.setItem('lead_filter_channel', filterChannel); }, [filterChannel]);
  useEffect(() => { localStorage.setItem('lead_search', search); }, [search]);
  
  const availableChannels = useMemo(() => {
    const allKnownChannels = new Set<string>();
    leads.forEach(l => {
      if(l.channel) allKnownChannels.add(l.channel);
    });
    // Add roles as potential channels
    ['Guia', 'Agencia', 'Hotel', 'Mayorista', 'Transportista', 'Otro'].forEach(r => allKnownChannels.add(r));
    return Array.from(allKnownChannels);
  }, [leads]);

  const fetchLeads = useCallback(async (isInitial = false) => {
    if (loadingPage) return;
    
    if (isInitial) {
      setLoading(true);
      lastDocRef.current = null;
    } else {
      setLoadingPage(true);
    }
    setError(null);

    try {
      const queryConstraints: any[] = [
        where('event_code', '==', EVENT_CODE),
        orderBy('created_at', 'desc'),
        limit(PAGE_SIZE)
      ];

      // Apply server-side filters
      if (filterStatus) {
        queryConstraints.push(where('status', '==', filterStatus));
      }
      if (filterStep) {
        queryConstraints.push(where('next_step', '==', filterStep));
      }
      if (filterChannel) {
        // Use 'role' as the channel field for filtering
        queryConstraints.push(where('role', '==', filterChannel));
      }

      let q = query(collection(db, 'leads'), ...queryConstraints);

      if (!isInitial && lastDocRef.current) {
        q = query(q, startAfter(lastDocRef.current));
      }

      const snap = await getDocs(q);
      const newLeads = snap.docs.map(d => {
        const data = d.data();
        const date = asDate(data.created_at);
        const createdAt = isValidDate(date) ? date.toISOString() : new Date(0).toISOString();
        return { id: d.id, ...data, created_at: createdAt } as AnyLead;
      });
      
      setLeads(prev => isInitial ? newLeads : [...prev, ...newLeads]);
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setHasMore(snap.docs.length === PAGE_SIZE);

    } catch (err: any) {
      console.error("Error fetching leads:", err);
      setError("Failed to load leads. Please check connection and Firestore rules.");
    } finally {
      setLoading(false);
      setLoadingPage(false);
    }
  }, [filterStatus, filterStep, filterChannel]);

  // Recargar cuando cambian los filtros
  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchLeads(true);
    }
  }, [authStatus, fetchLeads, filterStatus, filterStep, filterChannel]);

  const filteredLeads = useMemo(() => {
    const txt = search.trim().toLowerCase();
    
    const baseList = txt 
        ? leads.filter(l => 
            (l.name || '').toLowerCase().includes(txt) || 
            (l.company || '').toLowerCase().includes(txt) || 
            (l.email || '').toLowerCase().includes(txt)
          )
        : leads;
        
    return baseList.sort((a, b) => {
        const da = asDate(a.created_at);
        const db = asDate(b.created_at);
        const ta = isValidDate(da) ? da.getTime() : 0;
        const tb = isValidDate(db) ? db.getTime() : 0;
        return tb - ta; // desc
    });

  }, [leads, search]);

  const handleUpdateLeadState = (id: string, patch: Partial<Lead>) => {
    setLeads(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('¿Eliminar este lead definitivamente?')) return;
    // Optimista: quita de UI primero
    setLeads(ls => ls.filter(l => l.id !== leadId));
    try {
      await deleteDoc(doc(db, 'leads', leadId));
    } catch (err) {
      console.error(err);
      alert('No se pudo eliminar. Recargando la lista.');
      // (opcional) recarga o reinyecta si quieres deshacer la optimista
    } finally {
      setOpenMenuId(null);
      setMenuPos(null);
    }
  };
  
  const renderActions = (lead: AnyLead) => (
     <div className="flex items-center gap-1">
        <button
          className="action-btn"
          title="WhatsApp" aria-label="WhatsApp"
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const toRaw = resolveLeadPhone(lead) || WHATSAPP;
              if (!toRaw) { alert('No phone available for WhatsApp.'); return; }
              const to = normPhone(toRaw);
              const text = `Hi ${(lead.name || '').split(' ')[0] || 'there'}, thanks for visiting our stand today! This is ${lead.company || 'our team'}. Let us know if you'd like a quick call or a tailored proposal.`;
              await sendWhatsApp({ to, text, leadId: lead.id });
            } catch (err) { console.error(err); alert('Could not send WhatsApp.'); }
          }}
        >
          <MessageSquare className="w-4 h-4" />
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
        <button
          className="action-btn"
          title="Mark done" aria-label="Mark done"
          onClick={async (e) => {
            e.stopPropagation();
            try {
              const nextStatus = lead.status === 'NEW' ? 'CONTACTED' : (lead.status || 'CONTACTED');
              await updateDoc(doc(db, 'leads', lead.id), { status: nextStatus, next_step: null, updated_at: Timestamp.now() });
              handleUpdateLeadState(lead.id, { status: nextStatus, next_step: undefined });
            } catch (err) { console.error(err); }
          }}
        >
          <CheckCircle2 className="w-4 h-4" />
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
    if (loading) return <div className="text-center p-8">Loading leads...</div>;
    if (error) return <div className="text-center p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">{error}</div>;
    if (leads.length === 0 && !loading) {
      return (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">No leads match the current filters.</p>
          <a href="#/capture" className="mt-4 inline-flex items-center justify-center rounded-lg px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
            <UserPlus className="mr-2 h-4 w-4" />
            Capture First Lead
          </a>
        </div>
      );
    }
    return (
      <>
        {/* Mobile View */}
        <div className="md:hidden space-y-3">
          {filteredLeads.map(lead => {
            const createdAt = asDate(lead.created_at);
            return (
                <div key={lead.id} onClick={() => setSelectedLead(lead)} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900 space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                    <div className="text-base font-semibold">{lead.name || '—'}</div>
                    <div className="text-sm opacity-70">{lead.company || '—'}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700`}>{lead.status || 'NEW'}</span>
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
                <th className="th">Scoring</th>
                <th className="th">Next Step</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLeads.map(lead => (
                <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-white">{lead.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{lead.company || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {resolveLeadPhone(lead) && <div>WA: {resolveLeadPhone(lead)}</div>}
                    {lead.email && <div>{lead.email}</div>}
                  </td>
                  <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium`}>{lead.scoring || 'N/A'}</span></td>
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

        {hasMore && !loading && (
          <div className="flex justify-center my-4">
            <button onClick={() => fetchLeads(false)} disabled={loadingPage} className="px-4 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60">
              {loadingPage ? (<><LoaderCircle className="w-4 h-4 animate-spin mr-2 inline" />Loading…</>) : 'Load More'}
            </button>
          </div>
        )}
      </>
    );
  };
  
  return (
    <div className="mx-auto max-w-7xl">
       <style>{`
        .th { @apply px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider; }
        .action-btn { @apply inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400; }
       `}</style>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Lead List</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">All captured leads for {EVENT_CODE}.</p>
        </div>
      </div>
      <Card>
        <div className="flex flex-wrap gap-2 items-center justify-between mb-4 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, company, email..."
              className="w-full pl-10 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2" />
          </div>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="input flex-shrink-0">
            <option value="">All status</option>
            <option>NEW</option><option>CONTACTED</option><option>PROPOSED</option><option>WON</option><option>LOST</option>
          </select>
          <select value={filterStep} onChange={e=>setFilterStep(e.target.value)} className="input flex-shrink-0">
            <option value="">All next steps</option>
            {Object.entries(NEXT_STEP_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
          </select>
          <select value={filterChannel} onChange={e=>setFilterChannel(e.target.value)} className="input flex-shrink-0">
            <option value="">All channels</option>
            {availableChannels.map(c => <option key={c} value={c}>{c}</option>)}
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
