import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/supabaseClient';
import { collection, query, onSnapshot, orderBy, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ORG_UUID, EVENT_CODE } from '../lib/config';
import type { Lead } from '../types';
import LeadDetailModal from '../components/LeadDetailModal';
import { Search } from 'lucide-react';
import { exportLeadsCsv } from '../lib/export';
import { getCategoryLabel } from '../lib/categoryMap';

const LeadList: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

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
                    // Firestore Timestamps need to be converted to a serializable format
                    // like ISO strings for state management and passing to components.
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

    const filteredLeads = useMemo(() => {
        if (!searchTerm) return leads;
        const lowercasedTerm = searchTerm.toLowerCase().trim();
        return leads.filter(lead =>
            lead.name?.toLowerCase().includes(lowercasedTerm) ||
            lead.company?.toLowerCase().includes(lowercasedTerm) ||
            lead.email?.toLowerCase().includes(lowercasedTerm) ||
            lead.phone_raw?.includes(lowercasedTerm)
        );
    }, [leads, searchTerm]);

    const handleRowClick = (lead: Lead) => {
        setSelectedLead(lead);
    };

    const handleCloseModal = () => {
        setSelectedLead(null);
    };

    const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
        const leadRef = doc(db, 'leads', leadId);
        try {
            // Optimistic update in local state to feel faster
            setLeads(prevLeads => prevLeads.map(l => l.id === leadId ? {...l, status: newStatus} : l));
            await updateDoc(leadRef, { 
                status: newStatus,
                updated_at: Timestamp.now()
            });
            // Snapshot listener will sync the final state from DB
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status.");
            // Revert optimistic update on failure (optional, snapshot will do it)
        }
    };
    
    const scoringColors: Record<string, string> = {
        A: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        B: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        C: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };

    return (
        <div className="mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Lead List</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">All captured leads in real-time ({leads.length} total).</p>
                </div>
                <div className="flex items-center gap-2 mt-4 md:mt-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name, company, email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                    <button
                        onClick={() => exportLeadsCsv(filteredLeads)}
                        disabled={filteredLeads.length === 0}
                        className="px-4 py-2 rounded-lg bg-gray-800 text-white dark:bg-gray-100 dark:text-black hover:opacity-90 font-semibold disabled:opacity-50"
                    >
                        Export CSV
                    </button>
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
                        {loading && (
                            <tr><td colSpan={6} className="text-center p-8">Loading leads...</td></tr>
                        )}
                        {error && (
                            <tr><td colSpan={6} className="text-center p-8 text-red-500">{error}</td></tr>
                        )}
                        {!loading && filteredLeads.length === 0 && (
                             <tr><td colSpan={6} className="text-center p-16 text-gray-500">
                                {searchTerm ? 'No leads match your search.' : 'No leads captured yet.'}
                            </td></tr>
                        )}
                        {!loading && filteredLeads.map(lead => (
                            <tr key={lead.id} onClick={() => handleRowClick(lead)} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                    <div>{lead.name}</div>
                                    <div className="text-xs text-gray-500">{lead.company || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4">{getCategoryLabel(lead.role)}</td>
                                 <td className="px-6 py-4 text-xs">
                                    {lead.email && <div>{lead.email}</div>}
                                    {lead.phone_raw && <div>{lead.phone_raw}</div>}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${scoringColors[lead.scoring || 'C'] || scoringColors['C']}`}>
                                        {lead.scoring || 'C'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <select
                                        value={lead.status || 'NEW'}
                                        onChange={(e) => handleStatusChange(lead.id, e.target.value as Lead['status'])}
                                        onClick={(e) => e.stopPropagation()}
                                        className="input text-xs p-1 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="NEW">New</option>
                                        <option value="CONTACTED">Contacted</option>
                                        <option value="PROPOSED">Proposed</option>
                                        <option value="WON">Won</option>
                                        <option value="LOST">Lost</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 text-xs">
                                    {lead.created_at ? new Date(lead.created_at).toLocaleString('es-CR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedLead && (
                <LeadDetailModal
                    lead={selectedLead}
                    isOpen={!!selectedLead}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

export default LeadList;
