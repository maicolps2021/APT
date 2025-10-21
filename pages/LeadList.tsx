
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import type { Lead } from '../types';
import Card from '../components/Card';
import { generateWhatsAppLink, generateEmailLink } from '../lib/templates';

const LeadList: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Captured Leads</h1>
          <p className="text-slate-400 mt-2">A real-time list of all registered attendees for {EVENT_CODE}.</p>
        </div>
        <div className="flex items-center gap-2">
           <input
            type="text"
            placeholder="Search by name or company..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input w-64"
          />
          <button
            onClick={fetchLeads}
            disabled={loading}
            className="flex items-center justify-center rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed transition-all h-[46px]"
          >
            {/* Refresh Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <Card>
        {loading && <p className="text-center text-slate-400 p-8">Loading leads...</p>}
        {error && <p className="text-center text-red-400 p-8">{error}</p>}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-slate-200">
              <thead className="border-b border-slate-600">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Company</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Contact</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Details</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Registered</th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredLeads.length > 0 ? filteredLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-white">{lead.name}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{lead.company}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-sm text-slate-300">
                        {lead.whatsapp && <div>WA: {lead.whatsapp}</div>}
                        {lead.email && <div>{lead.email}</div>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-sm text-slate-300">
                        {lead.channel && <div><span className="font-medium text-slate-100">{lead.channel}</span></div>}
                        {lead.interest && <div>Interest: <span className="font-medium text-slate-100">{lead.interest}</span></div>}
                        {lead.tags && lead.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lead.tags.map(tag => (
                              <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-slate-700 text-slate-300 font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-sm text-slate-400">
                        {new Date(lead.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-3">
                           {lead.notes && (
                            <div title={lead.notes}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                           )}
                           {lead.whatsapp && (
                            <a href={generateWhatsAppLink(lead)} target="_blank" rel="noopener noreferrer" title="Send WhatsApp Template" className="text-slate-400 hover:text-primary-400 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.433-9.89-9.889-9.89-5.452 0-9.887 4.428-9.888 9.891.001 2.23.651 4.385 1.886 6.205l.232.392-1.082 3.939 4.032-1.056.377.224z" /></svg>
                            </a>
                           )}
                           {lead.email && (
                            <a href={generateEmailLink(lead)} target="_blank" rel="noopener noreferrer" title="Send Email Template" className="text-slate-400 hover:text-primary-400 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                              </svg>
                            </a>
                           )}
                        </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-slate-400">
                      {searchTerm ? 'No leads match your search.' : 'No leads have been captured yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default LeadList;
