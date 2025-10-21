import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Lead } from '../types';

const MC: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        console.error("Error fetching leads:", fetchError);
      } else {
        setLeads(data || []);
      }
      setLoading(false);
    };

    fetchLeads();

    const channel = supabase
      .channel('public:leads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        setLeads(currentLeads => [payload.new as Lead, ...currentLeads]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white">MC Dashboard</h1>
        <p className="text-slate-400 mt-2">Real-time view of all captured leads.</p>
        <p className="mt-2 text-2xl font-bold text-primary-400">{leads.length} Leads Captured</p>
      </div>

      {loading && <p className="text-center text-lg">Loading leads...</p>}
      {error && <p className="text-center text-red-500 text-lg">Error: {error}</p>}
      
      {!loading && !error && (
        <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-900/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Company</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Contact</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{lead.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{lead.company}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      <div>{lead.email}</div>
                      <div>{lead.whatsapp}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{new Date(lead.created_at).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MC;