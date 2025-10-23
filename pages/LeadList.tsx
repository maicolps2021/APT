import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../lib/supabaseClient'; // This is Firebase
import { collection, getDocs, query, where, orderBy, Timestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import type { Lead } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getPersonalizedWhatsAppMessage, generateEmailLink } from '../lib/templates';
import { sendBuilderBotMessage } from '../services/builderbotService';
import LeadDetailModal from '../components/LeadDetailModal';
import { Search, Mail, Edit, RefreshCw, LoaderCircle, Send, Check, X, Trash2, CheckSquare } from 'lucide-react';

const nextStepLabels: Record<string, string> = {
    Reunion: 'Agendar Reunión',
    Llamada15: 'Llamada 15min',
    Condiciones: 'Enviar Condiciones',
    FamTrip: 'Invitar a FamTrip',
};

const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
        return new Date(isoString).toLocaleString('es-CR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(',', '');
    } catch (e) {
        return 'Invalid Date';
    }
};

const truncate = (text: string, length: number) => {
    if (!text || text.length <= length) return text;
    return text.substring(0, length) + '...';
};


const LeadList: React.FC = () => {
    const { status: authStatus, error: authError } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [sendingStates, setSendingStates] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({});
    
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
                 const meetingAt = data.meeting_at instanceof Timestamp ? data.meeting_at.toDate().toISOString() : data.meeting_at;
                return { id: doc.id, ...data, created_at: createdAt, meeting_at: meetingAt } as Lead;
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
        setSendingStates(prev => ({ ...prev, [lead.id]: 'sending' }));
        try {
            const message = await getPersonalizedWhatsAppMessage(lead);
            await sendBuilderBotMessage(lead.whatsapp, message);
            setSendingStates(prev => ({ ...prev, [lead.id]: 'sent' }));
            setTimeout(() => setSendingStates(prev => ({...prev, [lead.id]: 'idle'})), 3000);
        } catch (err) {
            console.error("Failed to send WhatsApp message via BuilderBot:", err);
            alert("Failed to send message. Please check the console for details.");
            setSendingStates(prev => ({ ...prev, [lead.id]: 'error' }));
        }
    };
    
    const handleDeleteLead = async (leadId: string) => {
        if (!window.confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
            return;
        }
        try {
            await deleteDoc(doc(db, 'leads', leadId));
            setLeads(prev => prev.filter(l => l.id !== leadId));
        } catch (err) {
            console.error("Error deleting lead:", err);
            alert("Failed to delete lead. Please check permissions.");
        }
    };
    
    const handleMarkStepComplete = async (lead: Lead) => {
        try {
            const leadRef = doc(db, 'leads', lead.id);
            await updateDoc(leadRef, { next_step: null });
            // Update local state for immediate feedback
            setLeads(prevLeads => prevLeads.map(l => l.id === lead.id ? { ...l, next_step: undefined } : l));
        } catch (err) {
            console.error("Error updating lead step:", err);
            alert("Could not update lead status. Please try again.");
        }
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

    const renderLeadRow = (lead: Lead) => {
        const sendState = sendingStates[lead.id] || 'idle';
        
        return (
            <tr key={lead.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50">
                <td className="px-4 py-3 align-top">
                    <p className="font-semibold text-gray-900 dark:text-white">{lead.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{lead.role || 'N/A'}</p>
                </td>
                <td className="px-4 py-3 align-top text-sm text-gray-700 dark:text-gray-300">
                    {lead.company || 'N/A'}
                </td>
                <td className="px-4 py-3 align-top text-sm text-gray-700 dark:text-gray-300">
                    {lead.whatsapp && <div>WA: {lead.whatsapp}</div>}
                    {lead.email && <div>{lead.email}</div>}
                </td>
                <td className="px-4 py-3 align-top text-sm">
                    {lead.next_step && <div className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-2">Next: {nextStepLabels[lead.next_step] || lead.next_step}</div>}
                    {lead.meeting_at && <div className="text-green-600 dark:text-green-400">Meeting: {formatDate(lead.meeting_at)}</div>}
                    {lead.notes && <div className="text-gray-500 italic mt-1">Note: {truncate(lead.notes, 25)}</div>}
                </td>
                <td className="px-4 py-3 align-top text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(lead.created_at)}
                </td>
                <td className="px-4 py-3 align-top text-right">
                    <div className="flex items-center justify-end gap-1">
                        {lead.next_step && (
                           <button onClick={() => handleMarkStepComplete(lead)} title="Mark step as complete" className="p-2 rounded-md hover:bg-green-100 dark:hover:bg-green-900/50"><CheckSquare className="h-5 w-5 text-green-500" /></button>
                        )}
                        <button onClick={() => setSelectedLead(lead)} title="Edit Lead" className="p-2 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/50"><Edit className="h-5 w-5 text-yellow-500" /></button>
                        <button
                            onClick={() => handleWhatsAppClick(lead)}
                            disabled={!lead.whatsapp || sendState === 'sending' || sendState === 'sent'}
                            className="p-2 rounded-md hover:bg-sky-100 dark:hover:bg-sky-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Send WhatsApp via BuilderBot"
                        >
                            {sendState === 'sending' && <LoaderCircle className="h-5 w-5 text-gray-500 animate-spin" />}
                            {sendState === 'sent' && <Check className="h-5 w-5 text-green-500" />}
                            {sendState === 'error' && <X className="h-5 w-5 text-red-500" />}
                            {sendState === 'idle' && <Send className="h-5 w-5 text-sky-500" />}
                        </button>
                        <a href={lead.email ? generateEmailLink(lead) : undefined} onClick={(e) => !lead.email && e.preventDefault()} target="_blank" rel="noreferrer" title="Send Email" className={`p-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 ${!lead.email ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <Mail className="h-5 w-5 text-blue-500" />
                        </a>
                        <button onClick={() => handleDeleteLead(lead.id)} title="Delete Lead" className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50"><Trash2 className="h-5 w-5 text-red-500" /></button>
                    </div>
                </td>
            </tr>
        )
    };
    
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
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Captured Leads</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">A real-time list of all registered attendees for {EVENT_CODE}.</p>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or company..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10 w-full"
                        />
                    </div>
                    <button onClick={fetchLeads} disabled={loading} className="p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Company</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Details</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Registered</th>
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