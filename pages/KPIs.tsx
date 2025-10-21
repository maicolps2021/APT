import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE } from '../lib/config';
import Card from '../components/Card';

// Define the expected data structure from the v_kpis_conagui view
interface ChannelDistribution {
  [key: string]: number;
}

interface DailyLeads {
  day: number;
  count: number;
}

interface KPIsData {
  total_leads: number;
  leads_by_channel: ChannelDistribution;
  leads_by_day: DailyLeads[];
}

const KPIs: React.FC = () => {
  const [kpis, setKpis] = useState<KPIsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKPIs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // The view might return multiple rows if there are multiple days of data
      const { data, error } = await supabase
        .from('v_kpis_conagui')
        .select('*')
        .eq('event_code', EVENT_CODE);

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Aggregate data from all rows (days)
        const totalLeads = data.reduce((sum, row) => sum + (row.leads_total || 0), 0);
        
        const leadsByChannel: ChannelDistribution = data.reduce((acc, row) => {
            if (row.guia > 0) acc['Guia'] = (acc['Guia'] || 0) + row.guia;
            if (row.agencia > 0) acc['Agencia'] = (acc['Agencia'] || 0) + row.agencia;
            if (row.hotel > 0) acc['Hotel'] = (acc['Hotel'] || 0) + row.hotel;
            if (row.mayorista > 0) acc['Mayorista'] = (acc['Mayorista'] || 0) + row.mayorista;
            // Add other potential channels from the view if they exist
            return acc;
        }, {} as ChannelDistribution);

        const leadsByDay: DailyLeads[] = data.map(row => ({
            day: row.day,
            count: row.leads_total || 0,
        })).sort((a, b) => a.day - b.day);

        setKpis({
          total_leads: totalLeads,
          leads_by_channel: leadsByChannel,
          leads_by_day: leadsByDay,
        });

      } else {
        setKpis(null);
      }
    } catch (err: any) {
      console.error("Error fetching KPIs:", err);
      setError("Failed to load KPI data. Please ensure the 'v_kpis_conagui' view exists and try again.");
      setKpis(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  const renderChannelDistribution = () => {
    if (!kpis || !kpis.leads_by_channel || kpis.total_leads === 0) {
      return <p className="text-slate-400">No channel data available.</p>;
    }

    const channels = Object.entries(kpis.leads_by_channel)
      .map(([channel, count]): [string, number] => [channel, Number(count) || 0])
      .sort(([, a], [, b]) => b - a);

    return (
      <ul className="space-y-2">
        {channels.map(([channel, count]) => {
          const percentage = ((count / kpis.total_leads) * 100).toFixed(1);
          return (
            <li key={channel} className="flex justify-between items-center text-sm">
              <span className="text-slate-300 capitalize">{channel}</span>
              <span className="font-semibold text-white">{count} ({percentage}%)</span>
            </li>
          );
        })}
      </ul>
    );
  };
  
  const renderBarChart = () => {
    if (!kpis || !kpis.leads_by_day || kpis.leads_by_day.length === 0) {
      return <div className="flex items-center justify-center h-48 bg-slate-700/50 rounded-lg"><p className="text-slate-400">No data for chart.</p></div>;
    }

    const maxCount = Math.max(...kpis.leads_by_day.map(d => d.count), 0);
    if (maxCount === 0) {
         return <div className="flex items-center justify-center h-48 bg-slate-700/50 rounded-lg"><p className="text-slate-400">No leads to display in chart.</p></div>;
    }

    return (
      <div className="flex justify-around items-end h-48 w-full bg-slate-700/50 p-4 rounded-lg space-x-4">
        {kpis.leads_by_day.map(({ day, count }) => (
          <div key={day} className="flex flex-col items-center flex-1 h-full pt-4">
             <div className="flex flex-col items-center justify-end w-full h-full">
                <span className="text-xs text-slate-300 mb-1">{count}</span>
                <div 
                    className="w-full bg-primary-500 rounded-t-md hover:bg-primary-400 transition-all" 
                    style={{ height: `${(count / maxCount) * 85}%` }}
                    title={`Day ${day}: ${count} leads`}
                ></div>
             </div>
            <span className="text-xs mt-2 text-slate-300 font-bold">Day {day}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-white">KPI Dashboard</h1>
            <p className="text-slate-400 mt-2">Key performance indicators for {EVENT_CODE}.</p>
        </div>
        <button 
            onClick={fetchKPIs} 
            disabled={loading}
            className="mt-4 md:mt-0 flex items-center justify-center rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="http://www.w3.org/2000/svg">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          )}
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && !kpis && (
          <div className="text-center p-8 text-slate-400">Loading KPIs...</div>
      )}

      {error && <div className="text-center p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">{error}</div>}

      {!loading && !error && !kpis && (
        <div className="text-center p-8 text-slate-400">No KPI data found for this event.</div>
      )}

      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <Card className="md:col-span-1">
            <h3 className="text-lg font-semibold text-primary-400 mb-3">Total Leads</h3>
            <p className="text-5xl font-bold text-white">{kpis.total_leads}</p>
          </Card>
          <Card className="md:col-span-2">
            <h3 className="text-lg font-semibold text-primary-400 mb-3">Leads by Channel</h3>
            {renderChannelDistribution()}
          </Card>

          <Card className="md:col-span-3">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <h3 className="text-lg font-semibold text-primary-400 mb-3">Leads by Day</h3>
                    <table className="min-w-full text-slate-200">
                        <thead className="border-b border-slate-600">
                            <tr>
                            <th className="py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Day</th>
                            <th className="py-2 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Leads</th>
                            </tr>
                        </thead>
                        <tbody>
                        {kpis.leads_by_day && kpis.leads_by_day.length > 0 ? (
                            kpis.leads_by_day.map(({ day, count }) => (
                                <tr key={day} className="border-b border-slate-700 last:border-b-0">
                                    <td className="py-2">{day}</td>
                                    <td className="py-2 text-right font-semibold">{count}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={2} className="py-4 text-center text-slate-400">No daily data.</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>
                <div className="lg:col-span-2">
                    <h3 className="text-lg font-semibold text-primary-400 mb-3">Daily Distribution</h3>
                    {renderBarChart()}
                </div>
             </div>
          </Card>
        </div>
      )}
      <style>{`
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default KPIs;