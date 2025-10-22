

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import type { Lead } from '../types';
import Card from '../components/Card';
import { generateWhatsAppLink, generateEmailLink } from '../lib/templates';
import { RefreshCw, Info, MessageSquare, Mail, Send, LoaderCircle, CheckCircle, XCircle } from 'lucide-react';
import { hasBuilderBot, sendBuilderBotMessage } from '../services/builderbotService';

type ContactStatus = 'idle' | 'sending' | 'sent' | 'error';

const LeadList: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contactStatus, setContactStatus] = useState<Record<string, ContactStatus>>({});

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('event_code', EVENT_CODE)
        .eq('org_id', ORG_UUID)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data as Lead[]);
    } catch (err: any) {
      console.error("Error fetching leads:", err);
      setError("Failed to load leads. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    return leads.filter(lead =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leads, searchTerm]);

  const handleSendBuilderBot = async (lead: Lead) => {
    setContactStatus(prev => ({ ...prev, [lead.id]: 'sending' }));
    try {
      const message = generateWhatsAppLink(lead, true); // Get only the message text
      await sendBuilderBotMessage(lead.whatsapp!, message);
      setContactStatus(prev => ({ ...prev, [lead.id]: 'sent' }));
    } catch (err) {
      console.error("Failed to send message via BuilderBot", err);
      setContactStatus(prev => ({ ...prev, [lead.id]: 'error' }));
    } finally {
        setTimeout(() => {
            setContactStatus(prev => ({ ...prev, [lead.id]: 'idle' }));
        }, 3000);
    }
  };

  const getActionIcon = (lead: Lead) => {
    const status = contactStatus[lead.id] || 'idle';
    switch (status) {
        case 'sending':
            return <LoaderCircle className="h-5 w-5 text-gray-400 animate-spin" />;
        case 'sent':
            return <CheckCircle className="h-5 w-5 text-green-500" />;
        case 'error':
            return <XCircle className="h-5 w-5 text-red-500" />;
        default:
            return (
                <button onClick={() => handleSendBuilderBot(lead)} title="Send via BuilderBot" className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                    <Send className="h-5 w-5" />
                </button>
            );
    }
  };

  const leadActions = (lead: Lead) => (
    <div className="flex items-center justify-center gap-4 text-gray-400">
        {lead.notes && (
        <div title={lead.notes}>
            <Info className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
        </div>
        )}
        {lead.whatsapp && (
        <a href={generateWhatsAppLink(lead)} target="_blank" rel="noopener noreferrer" title="Send WhatsApp Template" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
            <MessageSquare className="h-5 w-5" />
        </a>
        )}
        {hasBuilderBot() && lead.whatsapp && getActionIcon(lead)}
        {lead.email && (
        <a href={generateEmailLink(lead)} target="_blank" rel="noopener noreferrer" title="Send Email Template" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
            <Mail className="h-5 w-5" />
        </a>
        )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">Captured Leads</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">A real-time list of all registered attendees for {EVENT_CODE}.</p>
        </div>
        <div className="flex w-full md:w-auto items-center gap-2">
           <input
            type="text"
            placeholder="Search by name or company..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input w-full md:w-64"
          />
          <button
            onClick={fetchLeads}
            disabled={loading}
            className="flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:bg-gray-200 dark:disabled:bg-gray-900 disabled:cursor-not-allowed transition-all h-[49px]"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <Card>
        {loading && <p className="text-center text-gray-500 dark:text-gray-400 p-8">Loading leads...</p>}
        {error && <p className="text-center text-red-500 p-8">{error}</p>}
        {!loading && !error && (
            <>
                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="min-w-full text-gray-800 dark:text-gray-200">
                    <thead className="border-b border-gray-200 dark:border-gray-700">
                        <tr>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Details</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Registered</th>
                        <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredLeads.length > 0 ? filteredLeads.map(lead => (
                        <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap">
                                <div className="font-semibold text-gray-900 dark:text-white">{lead.name}</div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">{lead.company}</td>
                            <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                {lead.whatsapp && <div>WA: {lead.whatsapp}</div>}
                                {lead.email && <div>{lead.email}</div>}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                {lead.channel && <div><span className="font-medium text-gray-800 dark:text-gray-100">{lead.channel}</span></div>}
                                {lead.interest && <div>Interest: <span className="font-medium text-gray-800 dark:text-gray-100">{lead.interest}</span></div>}
                                {lead.tags && lead.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {lead.tags.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                                        {tag}
                                    </span>
                                    ))}
                                </div>
                                )}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {new Date(lead.created_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                                {leadActions(lead)}
                            </td>
                        </tr>
                        )) : (
                        <tr>
                            <td colSpan={6} className="py-8 px-4 text-center text-gray-500 dark:text-gray-400">
                            {searchTerm ? 'No leads match your search.' : 'No leads have been captured yet.'}
                            </td>
                        </tr>
                        )}
                    </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {filteredLeads.length > 0 ? filteredLeads.map(lead => (
                        <div key={lead.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg text-gray-900 dark:text-white">{lead.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{lead.company}</p>
                                </div>
                                {leadActions(lead)}
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm space-y-2">
                                {(lead.whatsapp || lead.email) && (
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-200">Contact</h4>
                                        <p className="text-gray-500 dark:text-gray-400">{lead.whatsapp}</p>
                                        <p className="text-gray-500 dark:text-gray-400">{lead.email}</p>
                                    </div>
                                )}
                                {(lead.channel || lead.interest) && (
                                    <div>
                                        <h4 className="font-semibold text-gray-700 dark:text-gray-200">Details</h4>
                                        <p className="text-gray-500 dark:text-gray-400">
                                            {lead.channel && <span>{lead.channel}</span>}
                                            {lead.interest && <span> | Interest: {lead.interest}</span>}
                                        </p>
                                    </div>
                                )}
                                <p className="text-xs text-gray-400 dark:text-gray-500 pt-2">
                                    Registered: {new Date(lead.created_at).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    )) : (
                        <p className="py-8 text-center text-gray-500 dark:text-gray-400">
                            {searchTerm ? 'No leads match your search.' : 'No leads have been captured yet.'}
                        </p>
                    )}
                </div>
            </>
        )}
      </Card>
    </div>
  );
};

export default LeadList;