import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/supabaseClient';
import { collection, query, onSnapshot, orderBy, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ORG_UUID, EVENT_CODE } from '../lib/config';
import type { Lead } from '../types';
import LeadDetailModal from '../components/LeadDetailModal';
import { Search, LoaderCircle } from 'lucide-react';
import { exportLeadsCsv } from '../lib/export';
import { inferStatusFromLead, LeadStatus } from '../lib/status';

// --- Tipos para filtros y ordenación ---
type StatusFilter = 'ALL' | LeadStatus;
type NextStepFilter = 'ALL' | 'Condiciones' | 'Reunion' | 'Llamada15' | 'FamTrip' | 'WhatsApp';
type ChannelFilter = 'ALL' | 'QR' | 'MANUAL';
type SortOrder = 'NEWEST' | 'OLDEST';
type CategoryFilter =
  | 'ALL'
  | 'Tourop'
  | 'Hoteles'
  | 'Transportistas'
  | 'Parques'
  | 'Guías'
  | 'Souvenirs y restaurantes'
  | 'UNSET';
const PAGE_SIZES = [25, 50, 100, -1] as const;
type PageSize = typeof PAGE_SIZES[number];

// --- Helpers de normalización ---
function norm(s: any): string {
  return (s ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function mapToCategory(lead: any): CategoryFilter {
  const raw = norm(lead?.category || lead?.role || '');
  if (!raw) return 'UNSET';
  if (/(tour.?oper|operador|agency|agencia)/.test(raw)) return 'Tourop';
  if (/hotel/.test(raw)) return 'Hoteles';
  if (/(transport|shuttle|bus|coaster|hiace)/.test(raw)) return 'Transportistas';
  if (/(parque|park|attraction|atraccion|puentes|hanging|waterfall)/.test(raw)) return 'Parques';
  if (/(guia|guide)/.test(raw)) return 'Guías';
  if (/(souvenir|gift|restaurant|restaurante|cafe|comida)/.test(raw)) return 'Souvenirs y restaurantes';
  return 'UNSET';
}

function usePersistentState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error(`Could not save state for key "${key}" to localStorage.`, e);
    }
  }, [key, state]);

  return [state, setState];
}

const LeadList: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    // --- Estados de filtros y paginación ---
    const [q, setQ] = usePersistentState('leadlist_q', '');
    const [statusFilter, setStatusFilter] = usePersistentState<StatusFilter>('leadlist_status', 'ALL');
    const [nextStepFilter, setNextStepFilter] = usePersistentState<NextStepFilter>('leadlist_nextstep', 'ALL');
    const [channelFilter, setChannelFilter] = usePersistentState<ChannelFilter>('leadlist_channel', 'ALL');
    const [categoryFilter, setCategoryFilter] = usePersistentState<CategoryFilter>('leadlist_category', 'ALL');
    const [sortOrder, setSortOrder] = usePersistentState<SortOrder>('leadlist_sort', 'NEWEST');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = usePersistentState<PageSize>('leadlist_pagesize', 25);

    useEffect(() => {
        setLoading(true);
        try {
            const leadsRef = collection(db, 'leads');
            const q = query(
                leadsRef,
                where('org_id', '==', ORG_UUID),
                where('event_code', '==', EVENT_CODE),
                orderBy('created_at', 'desc')
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const leadsData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const createdAt = data.created_at;
                    const meetingAt = data.meeting_at;

                    return {
                        id: doc.id,
                        ...data,
                        created_at: createdAt?.toDate ? createdAt.toDate().toISOString() : String(createdAt || ''),
                        meeting_at: meetingAt?.toDate ? meetingAt.toDate().toISOString() : String(meetingAt || ''),
                    } as Lead;
                });
                setLeads(leadsData);
                setLoading(false);
            }, (err) => {
                console.error("Error fetching leads:", err);
                setError("Could not load leads. Please check permissions and network.");
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (err) {
            console.error("Query setup error:", err);
            setError("Failed to set up lead query.");
            setLoading(false);
        }
    }, []);

    const leadsFilteredAndSorted = useMemo(() => {
        const needle = q.trim().toLowerCase();
        
        const filtered = leads.filter(l => {
            const passStatus = statusFilter === 'ALL' ? true : inferStatusFromLead(l) === statusFilter;
            const passNextStep = nextStepFilter === 'ALL' ? true : (l.next_step || '') === nextStepFilter;
            const passChannel = channelFilter === 'ALL' ? true : (l.source || '') === channelFilter;
            const passCategory = categoryFilter === 'ALL' ? true : mapToCategory(l) === categoryFilter;
            const haystack = [l.name, l.company, l.email, l.phone_raw].filter(Boolean).join(' ').toLowerCase();
            const passText = needle === '' ? true : haystack.includes(needle);
            return passStatus && passNextStep && passChannel && passCategory && passText;
        });

        const withDate = filtered.map(l => ({ l, d: l.created_at ? new Date(l.created_at) : new Date(0) }));
        const comparator = sortOrder === 'NEWEST'
          ? (a: {d: Date}, b: {d: Date}) => b.d.getTime() - a.d.getTime()
          : (a: {d: Date}, b: {d: Date}) => a.d.getTime() - b.d.getTime();
        withDate.sort(comparator);

        return withDate.map(x => x.l);
    }, [leads, q, statusFilter, nextStepFilter, channelFilter, categoryFilter, sortOrder]);

    const total = leadsFilteredAndSorted.length;
    const pageCount = pageSize === -1 ? 1 : Math.max(1, Math.ceil(total / pageSize));

    useEffect(() => { setPage(1); }, [q, statusFilter, nextStepFilter, channelFilter, categoryFilter, sortOrder, pageSize]);
    
    useEffect(() => {
        if (page > pageCount) setPage(pageCount);
    }, [page, pageCount]);

    const pagedLeads = useMemo(() => {
        if (pageSize === -1) return leadsFilteredAndSorted;
        const start = (page - 1) * pageSize;
        return leadsFilteredAndSorted.slice(start, start + pageSize);
    }, [leadsFilteredAndSorted, page, pageSize]);

    const range = useMemo(() => {
        if (total === 0) return { from: 0, to: 0, total: 0 };
        if (pageSize === -1) return { from: 1, to: total, total };
        const from = (page - 1) * pageSize + 1;
        const to = Math.min(page * pageSize, total);
        return { from, to, total };
    }, [total, page, pageSize]);

    const handleRowClick = (lead: Lead) => setSelectedLead(lead);
    const handleCloseModal = () => setSelectedLead(null);
    function goTo(p: number) { setPage(Math.min(Math.max(1, p), pageCount)); }

    const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
        const leadRef = doc(db, 'leads', leadId);
        try {
            setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? {...l, status: newStatus} : l));
            await updateDoc(leadRef, { status: newStatus, updated_at: Timestamp.now() });
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status.");
        }
    };
    
    const scoringColors: Record<string, string> = {
        A: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        B: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        C: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };

    const compactPageNumbers = useMemo(() => {
        if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
        const pages: (number | string)[] = [1];
        if (page > 3) pages.push('...');
        for (let i = Math.max(2, page - 1); i <= Math.min(pageCount - 1, page + 1); i++) pages.push(i);
        if (page < pageCount - 2) pages.push('...');
        pages.push(pageCount);
        return [...new Set(pages)];
    }, [page, pageCount]);


    return (
        <div className="mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Lead List</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">All captured leads in real-time ({leads.length} total).</p>
                </div>
                 <div className="flex items-center gap-2 mt-4 md:mt-0">
                    <button
                        onClick={() => exportLeadsCsv(leadsFilteredAndSorted)}
                        disabled={leadsFilteredAndSorted.length === 0}
                        className="px-4 py-2 rounded-lg bg-gray-800 text-white dark:bg-gray-100 dark:text-black hover:opacity-90 font-semibold disabled:opacity-50"
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="space-y-3 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    <div className="relative xl:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input type="text" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="input pl-10" />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)} className="input"><option value="ALL">Todos los estados</option><option value="NEW">New</option><option value="CONTACTED">Contacted</option><option value="PROPOSED">Proposed</option><option value="WON">Won</option><option value="LOST">Lost</option></select>
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as CategoryFilter)} className="input"><option value="ALL">Todas las categorías</option><option value="Tourop">TourOperador</option><option value="Hoteles">Hoteles</option><option value="Transportistas">Transportistas</option><option value="Parques">Parques</option><option value="Guías">Guías</option><option value="Souvenirs y restaurantes">Souvenirs y Restaurantes</option></select>
                    <select value={nextStepFilter} onChange={e => setNextStepFilter(e.target.value as NextStepFilter)} className="input"><option value="ALL">Todos los sig. pasos</option><option value="Condiciones">Enviar Condiciones</option><option value="Reunion">Agendar Reunión</option><option value="Llamada15">Llamada 15min</option><option value="FamTrip">FamTrip</option><option value="WhatsApp">WhatsApp Follow-up</option></select>
                    <select value={sortOrder} onChange={e => setSortOrder(e.target.value as SortOrder)} className="input"><option value="NEWEST">Más recientes</option><option value="OLDEST">Más antiguos</option></select>
                </div>
            </div>

            <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">Lead</th>
                            <th scope="col" className="px-6 py-3">Role</th>
                            <th scope="col" className="px-6 py-3">Contact</th>
                            <th scope="col" className="px-6 py-3">Scoring</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                            <th scope="col" className="px-6 py-3">Captured</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (<tr><td colSpan={6} className="text-center p-8"><LoaderCircle className="h-6 w-6 animate-spin inline-block" /></td></tr>)}
                        {error && (<tr><td colSpan={6} className="text-center p-8 text-red-500">{error}</td></tr>)}
                        {!loading && pagedLeads.length === 0 && (
                             <tr><td colSpan={6} className="text-center p-16 text-gray-500">
                                {leads.length > 0 ? 'No hay leads que coincidan con los filtros.' : 'Aún no se han capturado leads.'}
                            </td></tr>
                        )}
                        {!loading && pagedLeads.map(lead => (
                            <tr key={lead.id} onClick={() => handleRowClick(lead)} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"><div>{lead.name}</div><div className="text-xs text-gray-500">{lead.company || 'N/A'}</div></td>
                                <td className="px-6 py-4">{mapToCategory(lead)}</td>
                                <td className="px-6 py-4 text-xs">{lead.email && <div>{lead.email}</div>}{lead.phone_raw && <div>{lead.phone_raw}</div>}</td>
                                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${scoringColors[lead.scoring || 'C'] || scoringColors['C']}`}>{lead.scoring || 'C'}</span></td>
                                <td className="px-6 py-4"><select value={lead.status || 'NEW'} onChange={(e) => handleStatusChange(lead.id, e.target.value as Lead['status'])} onClick={(e) => e.stopPropagation()} className="input text-xs p-1 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"><option value="NEW">New</option><option value="CONTACTED">Contacted</option><option value="PROPOSED">Proposed</option><option value="WON">Won</option><option value="LOST">Lost</option></select></td>
                                <td className="px-6 py-4 text-xs">{lead.created_at ? new Date(lead.created_at).toLocaleString('es-CR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                        <select aria-label="Tamaño de página" className="input p-2 text-sm" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}>
                            <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option><option value={-1}>Todos</option>
                        </select>
                        <span>por página</span>
                    </div>
                    <div>Mostrando {range.from}–{range.to} de {range.total}</div>
                    <nav className="flex items-center gap-1" aria-label="Pagination">
                        <button className="btn btn-sm" onClick={() => goTo(1)} disabled={page <= 1}>«</button>
                        <button className="btn btn-sm" onClick={() => goTo(page - 1)} disabled={page <= 1}>‹</button>
                        {compactPageNumbers.map((p, i) =>
                            typeof p === 'string'
                            ? <span key={`ellipsis-${i}`} className="px-2">...</span>
                            : <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : ''}`} onClick={() => goTo(p)}>{p}</button>
                        )}
                        <button className="btn btn-sm" onClick={() => goTo(page + 1)} disabled={page >= pageCount}>›</button>
                        <button className="btn btn-sm" onClick={() => goTo(pageCount)} disabled={page >= pageCount}>»</button>
                    </nav>
                </div>
            )}


            {selectedLead && (
                <LeadDetailModal
                    lead={selectedLead}
                    isOpen={!!selectedLead}
                    onClose={handleCloseModal}
                />
            )}
             <style>{`
                .btn { @apply px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed; }
                .btn-sm { @apply px-2.5 py-1 text-xs; }
                .btn-primary { @apply bg-blue-600 text-white border-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500; }
            `}</style>
        </div>
    );
};

export default LeadList;