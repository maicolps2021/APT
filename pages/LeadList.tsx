import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../lib/supabaseClient'; // Path kept for simplicity, points to Firebase now
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import type { Lead } from '../types';
import Card from '../components/Card';
import LeadDetailModal from '../components/LeadDetailModal';
import { Search, Mail, MessageSquare, Edit, Briefcase, Tag, Star } from 'lucide-react';
import { getPersonalizedWhatsAppMessage, generateEmailLink } from '../lib/templates';
import { useAuth } from '../contexts/AuthContext';

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
            const q = query(
                leadsRef,
                where('event_code', '==', EVENT_CODE),
                where('org_id', '==', ORG_UUID),
                orderBy('created_at', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const leadsData = querySnapshot.docs.map(doc => {
                const data = doc.data();
                const createdAt = data.created_at instanceof Timestamp 
                    ? data.created_at.toDate().toISOString() 
                    : new Date().toISOString();
                
                return { 
                    id: doc.id, 
                    ...data,
                    created_at: createdAt,
                    meeting_at: data.meeting_at instanceof Timestamp ? data.meeting_at.toDate().toISOString() : data.meeting_at,
                 } as Lead;
            });
            setLeads(leadsData);
        } catch (err: any) {
            console.error("Error fetching leads:", err);
            setError("Failed to load leads. Please ensure the 'leads' collection exists and you have read permissions.");
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
            (lead.company && lead.company.toLowerCase().includes(lowercasedFilter)) ||
            (lead.email && lead.email.toLowerCase().includes(lowercasedFilter))
        );
    }, [leads, searchTerm]);

    const handleOpenModal = (lead: Lead) => {
        setSelectedLead(lead);
    };

    const handleCloseModal = () => {
        setSelectedLead(null);
    };

    const handleSaveLead = (updatedLead: Lead) => {
        setLeads(prevLeads =>
            prevLeads.map(lead => (lead.id === updatedLead.id ? updatedLead : lead))
        );
    };

    const handleSendWhatsApp = async (lead: Lead) => {
        const message = await getPersonalizedWhatsAppMessage(lead);
        const whatsappNumber = (lead.whatsapp || '').replace(/\D/g, "");
        if (whatsappNumber) {
            window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank');
        } else {
            alert('No WhatsApp number available for this lead.');
        }
    };
    
    const renderScoring = (score?: 'A' | 'B' | 'C') => {
        if (!score) return <span className="text-gray-400">N/A</span>;
        const colorMap = {
            A: 'text-green-500',
            B: 'text-yellow-500',
            C: 'text-red-500',
        };
        return <Star className={`h-5 w-5 ${colorMap[score]}`} fill="currentColor" />;
    };

    const renderContent = () => {
        if (authStatus === 'initializing') {
            return <div className="text-center p-8 text-gray-500 dark:text-gray-400">Authenticating...</div>
        }
        if (authStatus === 'error') {
            return <div className="text-center p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">Authentication failed: {authError}. Please check your Firebase project settings.</div>
        }
        if (loading) {
            return <div className="text-center p-8 text-gray-500 dark:text-gray-400">Loading leads...</div>
        }
        if (error) {
            return <div className="text-center p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">{error}</div>
        }
        if (filteredLeads.length === 0) {
            return <div className="text-center p-8 text-gray-500 dark:text-gray-400">No leads found.</div>
        }

        return (
            <div className="space-y-4">
                {filteredLeads.map(lead => (
                    <Card key={lead.id} className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div className="md:col-span-2">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{lead.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                <span className="flex items-center gap-1"><Briefcase size={14} />{lead.company || 'N/A'}</span>
                                <span className="flex items-center gap-1"><Tag size={14} />{lead.role || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-start md:justify-center">
                            {renderScoring(lead.scoring)}
                            <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">{lead.next_step || ''}</span>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => handleSendWhatsApp(lead)} className="action-button" title="Send WhatsApp"><MessageSquare size={18} /></button>
                            <a href={generateEmailLink(lead)} className="action-button" title="Send Email"><Mail size={18} /></a>
                            <button onClick={() => handleOpenModal(lead)} className="action-button" title="Edit Lead"><Edit size={18} /></button>
                        </div>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Lead List</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        {filteredLeads.length} of {leads.length} leads shown.
                    </p>
                </div>
                <div className="relative mt-4 md:mt-0 w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, company..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input pl-10 w-full md:w-64"
                    />
                </div>
            </div>
            
            {renderContent()}

            {selectedLead && (
                <LeadDetailModal
                    lead={selectedLead}
                    isOpen={!!selectedLead}
                    onClose={handleCloseModal}
                    onSave={handleSaveLead}
                />
            )}
            <style>{`.action-button { @apply p-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all; }`}</style>
        </div>
    );
};

export default LeadList;
