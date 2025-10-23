import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../lib/supabaseClient'; // This is Firebase
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import type { Lead } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getPersonalizedWhatsAppMessage, generateEmailLink } from '../lib/templates';
import LeadDetailModal from '../components/LeadDetailModal';
import { Search, Mail, MessageSquare, Edit, RefreshCw, LoaderCircle } from 'lucide-react';

const LeadList: React.FC = () => {
    const { status: authStatus, error: authError } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    
    const fetchLeads = useCallback(async () => {
        if (authStatus !== 'authenticated') {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const leadsRef = collection(db, 'leads');
            const q = query(leadsRef, 
                where('event_code', '==', EVENT_CODE), 
                where('org_id', '==', ORG_UUID),
                orderBy('created_at', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const leadsData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                const createdAt = data.created_at instanceof Timestamp ? data.created_at.toDate().toISOString() : new Date().toISOString();
                return { id: doc.id, ...data, created_at: createdAt } as Lead;
            });
            setLeads(leadsData);
        } catch (err: any) {
            console.error("Error fetching leads:", err);
            setError("Failed to load leads. Please check Firestore security rules.");
        } finally {
            setLoading(false);
        }
    }, [authStatus]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const handleWhatsAppClick = async (lead: Lead) => {
        if (!lead.whatsapp) {
            alert("No WhatsApp number available for this lead.");
            return;
        }
        const message = await getPersonalizedWhatsAppMessage(lead);
        const waLink = `https://wa.me/${lead.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
        window.open(waLink, '_blank');
    };

    const handleSaveLead = (updatedLead: Lead) => {
        setLeads(prevLeads => prevLeads.map(l => l.id === updatedLead.id ? updatedLead : l));
        setSelectedLead(null);
    };

    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const search = searchTerm.toLowerCase();
            return (
                lead.name.toLowerCase().includes(search) ||
                (lead.company && lead.company.toLowerCase().includes(search)) ||
                (lead.email && lead.email.toLowerCase().includes(search)) ||
                (lead.whatsapp && lead.whatsapp.includes(search))
            );
        });
    }, [leads, searchTerm]);

    const renderLeadRow = (lead: Lead) => (
        <tr key={lead.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50">
            <td className="px-4 py-3">
                <p className="font-semibold text-gray-900 dark:text-white">{lead.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{lead.company || 'N/A'}</p>
            </td>
            <td className="px-4 py-3">
                {lead.whatsapp && <p className="text-sm">{lead.whatsapp}</p>}
                {lead.email && <p className="text-sm">{lead.email}</p>}
            </td>
            <td className="px-4 py-3 text-sm">{lead.role || 'N/A'}</td>
            <td className="px-4 py-3 text-sm text-center">{lead.scoring || '-'}</td>
            <td className="px-4 py-3 text-sm">{lead.next_step || 'N/A'}</td>
            <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleWhatsAppClick(lead)} disabled={!lead.whatsapp} className="p-2 rounded-md hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed">
                        <MessageSquare className="h-5 w-5 text-green-500" />
                    </button>
                    <a href={lead.email ? generateEmailLink(lead) : '#'} target="_blank" rel="noreferrer" className={`p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 ${!lead.email ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Mail className="h-5 w-5 text-blue-500" />
                    </a>
                    <button onClick={() => setSelectedLead(lead)} className="p-2 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/50">
                        <Edit className="h-5 w-5 text-yellow-500" />
                    </button>
                </div>
            </td>
        </tr>
    );
    
    if (authStatus === 'initializing') {
        return <div className="text-center p-8">Authenticating...</div>
    }
    if (authStatus === 'error') {
        return <div className="text-center p-4 bg-red-100 border border-red-300 rounded-lg text-red-700 dark:text-red-300">Authentication failed: {authError}.</div>
    }

    return (
        <div className="mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lead List</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Total Leads: {leads.length}</p>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, company..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10 w-full"
                        />
                    </div>
                    <button onClick={fetchLeads} disabled={loading} className="p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                        {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Details</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Scoring</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Next Step</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {loading && <tr><td colSpan={6} className="text-center p-8 text-gray-500 dark:text-gray-400">Loading leads...</td></tr>}
                            {error && <tr><td colSpan={6} className="text-center p-4 text-red-500">{error}</td></tr>}
                            {!loading && filteredLeads.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-gray-500 dark:text-gray-400">No leads found.</td></tr>}
                            {!loading && filteredLeads.map(renderLeadRow)}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedLead && (
                <LeadDetailModal
                    isOpen={!!selectedLead}
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                    onSave={handleSaveLead}
                />
            )}
        </div>
    );
};

export default LeadList;
