import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/supabaseClient';
import { collection, query, where, orderBy, getDocs, limit, startAfter, getCountFromServer, QueryDocumentSnapshot, DocumentData, doc, getDoc } from 'firebase/firestore';
import { ORG_UUID, EVENT_CODE } from '../lib/config';
import type { Lead, LeadCategory } from '../types';
import { LEAD_CATEGORY_LABELS } from '../types';
import Card from '../components/Card';
import LeadDetailModal from '../components/LeadDetailModal';
import { LoaderCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportLeadsCsv } from '../lib/export';

const PAGE_SIZE = 25;

const LeadList: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    // Filtering and Searching
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<LeadCategory | ''>('');

    // Pagination
    const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [page, setPage] = useState(1);
    const [totalLeads, setTotalLeads] = useState(0);

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1);
            setLastVisible(null);
            setFirstVisible(null);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchLeads = useCallback(async (direction: 'next' | 'prev' | 'first' = 'first') => {
        setLoading(true);
        setError(null);

        try {
            const leadsRef = collection(db, 'leads');
            
            // Base constraints
            let baseConstraints = [
                where('org_id', '==', ORG_UUID),
                where('event_code', '==', EVENT_CODE),
            ];
            
            if (statusFilter) {
                baseConstraints.push(where('status', '==', statusFilter));
            }
            if (categoryFilter) {
                baseConstraints.push(where('role', '==', categoryFilter));
            }
            
            const countQuery = query(leadsRef, ...baseConstraints);
            const countSnapshot = await getCountFromServer(countQuery);
            setTotalLeads(countSnapshot.data().count);
            
            let dataQuery = query(leadsRef, ...baseConstraints, orderBy('created_at', 'desc'), limit(PAGE_SIZE));

            if (direction === 'next' && lastVisible) {
                dataQuery = query(leadsRef, ...baseConstraints, orderBy('created_at', 'desc'), startAfter(lastVisible), limit(PAGE_SIZE));
            } else if (direction === 'prev' && firstVisible) {
                // Simplified "previous" logic by resetting to page 1
                setPage(1);
            }
            
            const documentSnapshots = await getDocs(dataQuery);

            let fetchedLeads = documentSnapshots.docs.map(doc => {
                 const data = doc.data();
                 const createdAt = data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at;
                 return { id: doc.id, ...data, created_at: createdAt } as Lead;
            });

            if (debouncedSearchTerm) {
                const lowercasedFilter = debouncedSearchTerm.toLowerCase();
                fetchedLeads = fetchedLeads.filter(
                    lead =>
                        lead.name.toLowerCase().includes(lowercasedFilter) ||
                        lead.company?.toLowerCase().includes(lowercasedFilter) ||
                        lead.email?.toLowerCase().includes(lowercasedFilter)
                );
            }

            setLeads(fetchedLeads);
            setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
            setFirstVisible(documentSnapshots.docs[0] || null);
        } catch (err: any) {
            console.error("Error fetching leads:", err);
            setError("Could not load leads. Please check permissions and database configuration.");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, categoryFilter, debouncedSearchTerm, lastVisible, firstVisible]);
    
    useEffect(() => {
        fetchLeads('first');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, categoryFilter, debouncedSearchTerm]);

    const handleNextPage = () => {
        if (lastVisible) {
            setPage(p => p + 1);
            fetchLeads('next');
        }
    };
    
    const handlePrevPage = () => {
        if (page > 1) {
            // This is a simplified implementation for previous page.
            // A full implementation would require reversing the query order and using endBefore.
            setPage(1);
            setLastVisible(null);
            setFirstVisible(null);
            fetchLeads('first');
        }
    };

    const handleRowClick = (lead: Lead) => {
        setSelectedLead(lead);
    };

    const handleCloseModal = () => {
        const currentLeadId = selectedLead?.id;
        setSelectedLead(null);
        
        if (!currentLeadId) {
            fetchLeads('first');
            return;
        }
        
        // Optimistically update just the one row if we can find it
        const leadRef = doc(db, 'leads', currentLeadId);
        getDoc(leadRef).then(docSnap => {
            if (docSnap.exists()) {
                const updatedData = docSnap.data();
                const createdAt = updatedData.created_at?.toDate ? updatedData.created_at.toDate().toISOString() : updatedData.created_at;
                const updatedLead = { id: docSnap.id, ...updatedData, created_at: createdAt } as Lead;
                setLeads(currentLeads => currentLeads.map(l => l.id === updatedLead.id ? updatedLead : l));
            } else {
                fetchLeads('first'); // Fallback to full refresh
            }
        }).catch(() => fetchLeads('first'));
    };
    
    const handleExport = async () => {
      setLoading(true);
      try {
        const leadsRef = collection(db, 'leads');
        let constraints: any[] = [ // Use any[] to allow conditional pushes
          where('org_id', '==', ORG_UUID),
          where('event_code', '==', EVENT_CODE),
          orderBy('created_at', 'desc'),
        ];
        if (statusFilter) constraints.push(where('status', '==', statusFilter));
        if (categoryFilter) constraints.push(where('role', '==', categoryFilter));

        const q = query(leadsRef, ...constraints);
        const snapshot = await getDocs(q);
        const allLeads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
        
        const leadsToExport = debouncedSearchTerm
            ? allLeads.filter(lead =>
                lead.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                lead.company?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
            )
            : allLeads;
        
        exportLeadsCsv(leadsToExport);
      } catch (err) {
        console.error("Export failed:", err);
        setError("Could not export leads.");
      } finally {
        setLoading(false);
      }
    };

    const leadStatuses: (Lead['status'])[] = ['NEW', 'CONTACTED', 'PROPOSED', 'WON', 'LOST'];
    const leadCategories = Object.keys(LEAD_CATEGORY_LABELS) as LeadCategory[];

    return (
        <div className="mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Lead List</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">View and manage all captured event leads.</p>
                </div>
                <button 
                  onClick={handleExport}
                  className="mt-4 md:mt-0 px-4 py-2 rounded-lg bg-gray-800 text-white dark:bg-gray-100 dark:text-black hover:opacity-90 font-semibold"
                >
                  Export CSV
                </button>
            </div>
            
            <Card>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, company, or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10 w-full"
                        />
                    </div>
                    <div className="flex gap-4">
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); setLastVisible(null); }}
                            className="input"
                        >
                            <option value="">All Statuses</option>
                            {leadStatuses.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                         <select
                            value={categoryFilter}
                            onChange={(e) => { setCategoryFilter(e.target.value as LeadCategory | ''); setPage(1); setLastVisible(null); }}
                            className="input"
                        >
                            <option value="">All Categories</option>
                            {leadCategories.map(cat => (
                                <option key={cat} value={cat}>{LEAD_CATEGORY_LABELS[cat]}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">LEAD</th>
                                <th scope="col" className="px-6 py-3">ROLE</th>
                                <th scope="col" className="px-6 py-3">CONTACT</th>
                                <th scope="col" className="px-6 py-3">SCORING</th>
                                <th scope="col" className="px-6 py-3">STATUS</th>
                                <th scope="col" className="px-6 py-3">NEXT STEP</th>
                                <th scope="col" className="px-6 py-3">CAPTURED</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center p-8"><LoaderCircle className="animate-spin inline-block" /></td></tr>
                            ) : error ? (
                                <tr><td colSpan={7} className="text-center p-8 text-red-500">{error}</td></tr>
                            ) : leads.length === 0 ? (
                                <tr><td colSpan={7} className="text-center p-8">No leads found.</td></tr>
                            ) : (
                                leads.map(lead => (
                                    <tr key={lead.id} onClick={() => handleRowClick(lead)} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-white">{lead.name}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{lead.company}</div>
                                        </td>
                                        <td className="px-6 py-4">{lead.role ? LEAD_CATEGORY_LABELS[lead.role] : '—'}</td>
                                        <td className="px-6 py-4">{lead.whatsapp || lead.email || '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                                lead.scoring === 'A' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                lead.scoring === 'B' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                            }`}>
                                                {lead.scoring || 'C'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{lead.status || 'NEW'}</td>
                                        <td className="px-6 py-4">{lead.next_step || '—'}</td>
                                        <td className="px-6 py-4">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="flex justify-between items-center pt-4">
                    <span className="text-sm text-gray-700 dark:text-gray-400">
                        Page {page} | Total: {totalLeads}
                    </span>
                    <div className="inline-flex mt-2 xs:mt-0">
                        <button onClick={handlePrevPage} disabled={page === 1} className="flex items-center justify-center px-4 h-10 text-base font-medium text-white bg-gray-800 rounded-l hover:bg-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50">
                            <ChevronLeft className="w-5 h-5 mr-2" /> Prev
                        </button>
                        <button onClick={handleNextPage} disabled={!lastVisible || leads.length < PAGE_SIZE} className="flex items-center justify-center px-4 h-10 text-base font-medium text-white bg-gray-800 border-0 border-l border-gray-700 rounded-r hover:bg-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50">
                            Next <ChevronRight className="w-5 h-5 ml-2" />
                        </button>
                    </div>
                </div>
            </Card>

            {selectedLead && (
                <LeadDetailModal
                    isOpen={!!selectedLead}
                    onClose={handleCloseModal}
                    lead={selectedLead}
                />
            )}
        </div>
    );
};

export default LeadList;