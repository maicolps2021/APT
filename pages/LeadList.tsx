import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE } from '../lib/config';
import type { Lead } from '../types';
import Card from '../components/Card';

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
                        {lead.channel && <div>Channel: <span className="font-medium text-slate-100">{lead.channel}</span></div>}
                        {lead.interest && <div>Interest: <span className="font-medium text-slate-100">{lead.interest}</span></div>}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-sm text-slate-400">
                        {new Date(lead.created_at).toLocaleString()}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-slate-400">
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
