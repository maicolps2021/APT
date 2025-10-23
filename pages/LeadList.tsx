import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../lib/supabaseClient'; // Path kept for simplicity, points to Firebase now
import { collection, getDocs, doc, deleteDoc, updateDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import type { Lead } from '../types';
import Card from '../components/Card';
import LeadDetailModal from '../components/LeadDetailModal';
import { Search, Mail, Send, Edit, Trash2, CheckSquare, LoaderCircle, AlertCircle, Check } from 'lucide-react';
import { getPersonalizedWhatsAppMessage, generateEmailLink } from '../lib/templates';
import { useAuth } from '../contexts/AuthContext';
import { hasBuilderBot, sendBuilderBotMessage } from '../services/builderbotService';

type SendStatus = 'idle' | 'sending' | 'sent' | 'error';

const LeadList: React.FC = () => {
    const { status: authStatus, error: authError } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [sendStatuses, setSendStatuses] = useState<Record<string, SendStatus>>({});

    const fetchLeads = useCallback(async () => {
        if (authStatus !== 'authenticated') {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const leadsRef = collection(db, 'leads');
            const q = query(
                leadsRef,
                where('event_code', '==', EVENT_CODE),
                where('org_id', '==', ORG_UUID),
                orderBy('created_at', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const leadsData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                 const createdAt = data.created_at && typeof data.created_at.toDate === 'function' 
                    ? data.created_at.toDate().toISOString() 
                    : new Date().toISOString();
                
                return { 
                    id: doc.id, 
                    ...data,
                    created_at: createdAt,
                    meeting_at: data.meeting_at && typeof data.meeting_at.toDate === 'function' ? data.meeting_at.toDate().toISOString() : data.meeting_at,
                 } as Lead;
            });
            setLeads(leadsData);
        } catch (err: any) {
            console.error("Error fetching leads:", err);
            if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
                 setError("Could not connect to the database. This is often caused by an ad-blocker. Please try disabling it for this site and refresh.");
            } else {
                setError("Failed to load leads. Please ensure the 'leads' collection exists and you have read permissions.");
            }
        } finally {
            setLoading(false);
        }
    }, [authStatus]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);
    
    const filteredLeads = useMemo(() => {
        if (!searchTerm) return leads;
        const lowercasedFilter = searchTerm.toLowerCase();
        return leads.filter(lead =>
            lead.name.toLowerCase().includes(lowercasedFilter) ||
            (lead.company && lead.company.toLowerCase().includes(lowercasedFilter))
        );
    }, [leads, searchTerm]);

    const handleOpenModal = (lead: Lead) => setSelectedLead(lead);
    const handleCloseModal = () => setSelectedLead(null);
    const handleSaveLead = (updatedLead: Lead) => {
        setLeads(prevLeads =>
            prevLeads.map(lead => (lead.id === updatedLead.id ? updatedLead : lead))
        );
    };

    const handleSendWhatsApp = async (lead: Lead) => {
        if (!lead.whatsapp || !hasBuilderBot()) {
            alert('BuilderBot is not configured or lead has no WhatsApp number.');
            return;
        }
        setSendStatuses(prev => ({ ...prev, [lead.id]: 'sending' }));
        try {
            const message = await getPersonalizedWhatsAppMessage(lead);
            await sendBuilderBotMessage(lead.whatsapp, message);
            setSendStatuses(prev => ({ ...prev, [lead.id]: 'sent' }));
            setTimeout(() => setSendStatuses(prev => ({ ...prev, [lead.id]: 'idle' })), 3000);
        } catch (error) {
            console.error("Failed to send WhatsApp message:", error);
            setSendStatuses(prev => ({ ...prev, [lead.id]: 'error' }));
            alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleDeleteLead = async (leadId: string) => {
        if (window.confirm('Are you sure you want to delete this lead permanently?')) {
            try {
                await deleteDoc(doc(db, 'leads', leadId));
                setLeads(prev => prev.filter(lead => lead.id !== leadId));
            } catch (err) {
                 console.error("Error deleting lead:", err);
                 alert("Failed to delete lead. Check console for details.");
            }
        }
    };

    const handleMarkStepComplete = async (lead: Lead) => {
        try {
            const leadRef = doc(db, 'leads', lead.id);
            await updateDoc(leadRef, { next_step: null });
            
            // Directly update the state for this specific lead to fix the disappearing buttons bug
            setLeads(prevLeads =>
                prevLeads.map(l =>
                    l.id === lead.id ? { ...l, next_step: undefined } : l
                )
            );
        } catch (err) {
            console.error("Error updating lead step:", err);
            alert("Failed to update lead. Check console for details.");
        }
    };
    
    const nextStepLabels: Record<string, string> = {
        'Condiciones': 'Enviar Condiciones',
        'Reunion': 'Agendar Reunión',
        'Llamada15': 'Llamada 15min',
        'FamTrip': 'Invitar a FamTrip'
    };
    
    const formatDateTime = (isoString?: string) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleString('es-CR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderContent = () => {
        if (authStatus === 'initializing') return <p className="text-center p-8">Authenticating...</p>;
        if (authStatus === 'error') return <p className="text-center p-4 bg-red-100 text-red-700 rounded-lg">Authentication failed: {authError}.</p>;
        if (loading) return <p className="text-center p-8">Loading leads...</p>;
        if (error) return <p className="text-center p-4 bg-red-100 text-red-700 rounded-lg">{error}</p>;
        if (filteredLeads.length === 0) return <p className="text-center p-8">No leads found.</p>;

        return (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Company</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Details</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Registered</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {filteredLeads.map(lead => (
                            <tr key={lead.id}>
                                <td className="px-6 py-4 whitespace-nowrap"><div className="font-bold text-gray-900 dark:text-white">{lead.name}</div><div className="text-sm text-gray-500">{lead.role}</div></td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{lead.company}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300"><div>WA: {lead.whatsapp}</div><div>{lead.email}</div></td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                    {lead.next_step && <div className="text-blue-600 font-semibold">Next: {nextStepLabels[lead.next_step] || lead.next_step}</div>}
                                    {lead.meeting_at && <div className="text-green-600 font-semibold">Meeting: {formatDateTime(lead.meeting_at)}</div>}
                                    {lead.notes && <div className="text-xs italic">Note: {lead.notes.substring(0, 20)}...</div>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatDateTime(lead.created_at)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center gap-2">
                                        {lead.next_step && <button onClick={() => handleMarkStepComplete(lead)} className="action-button" title="Mark Step as Complete"><CheckSquare size={18} /></button>}
                                        <button onClick={() => handleOpenModal(lead)} className="action-button" title="Edit Lead"><Edit size={18} /></button>
                                        <button onClick={() => handleSendWhatsApp(lead)} disabled={sendStatuses[lead.id] === 'sending' || sendStatuses[lead.id] === 'sent'} className="action-button" title="Send WhatsApp">
                                            {sendStatuses[lead.id] === 'sending' ? <LoaderCircle size={18} className="animate-spin" /> :
                                             sendStatuses[lead.id] === 'sent' ? <Check size={18} className="text-green-500" /> :
                                             sendStatuses[lead.id] === 'error' ? <AlertCircle size={18} className="text-red-500" /> :
                                             <Send size={18} />}
                                        </button>
                                        <a href={generateEmailLink(lead)} className="action-button" title="Send Email"><Mail size={18} /></a>
                                        <button onClick={() => handleDeleteLead(lead.id)} className="action-button" title="Delete Lead"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Captured Leads</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">A real-time list of all registered attendees for {EVENT_CODE}.</p>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input type="text" placeholder="Search by name or company..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input pl-10 w-full md:w-64" />
                    </div>
                </div>
            </div>
            {renderContent()}
            {selectedLead && <LeadDetailModal lead={selectedLead} isOpen={!!selectedLead} onClose={handleCloseModal} onSave={handleSaveLead} />}
            <style>{`.action-button { @apply p-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed; }`}</style>
        </div>
    );
};

export default LeadList;