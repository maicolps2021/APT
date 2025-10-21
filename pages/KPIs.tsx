import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE } from '../lib/config';
import Card from '../components/Card';
import type { KPIsData } from '../types';
import { generateKpiAnalysis } from '../lib/geminiService';
import { hasGemini } from '../lib/ai';
import { RefreshCw, LoaderCircle } from 'lucide-react';


const KPIs: React.FC = () => {
  const [kpis, setKpis] = useState<KPIsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchKPIs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('v_kpis_conagui')
        .select('*')
        .eq('event_code', EVENT_CODE);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const totalLeads = data.reduce((sum, row) => sum + (row.leads_total || 0), 0);
        
        const leadsByChannel: { [key: string]: number } = data.reduce((acc, row) => {
            if (row.guia > 0) acc['Guia'] = (acc['Guia'] || 0) + row.guia;
            if (row.agencia > 0) acc['Agencia'] = (acc['Agencia'] || 0) + row.agencia;
            if (row.hotel > 0) acc['Hotel'] = (acc['Hotel'] || 0) + row.hotel;
            if (row.mayorista > 0) acc['Mayorista'] = (acc['Mayorista'] || 0) + row.mayorista;
            return acc;
        }, {} as { [key: string]: number });

        const leadsByDay: { day: number, count: number }[] = data.map(row => ({
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

  const handleGenerateAnalysis = async () => {
    if (!aiQuery.trim() || !kpis) return;
    setIsAnalyzing(true);
    setAiError(null);
    setAiResponse('');
    try {
      const response = await generateKpiAnalysis(aiQuery, kpis);
      setAiResponse(response);
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderChannelDistribution = () => {
    if (!kpis || !kpis.leads_by_channel || kpis.total_leads === 0) {
      return <p className="text-gray-500 dark:text-gray-400">No channel data available.</p>;
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
              <span className="text-gray-700 dark:text-gray-300 capitalize">{channel}</span>
              <span className="font-semibold text-gray-900 dark:text-white">{count} ({percentage}%)</span>
            </li>
          );
        })}
      </ul>
    );
  };
  
  const renderBarChart = () => {
    if (!kpis || !kpis.leads_by_day || kpis.leads_by_day.length === 0) {
      return <div className="flex items-center justify-center h-48 bg-gray-100 dark:bg-gray-800/50 rounded-lg"><p className="text-gray-500 dark:text-gray-400">No data for chart.</p></div>;
    }

    const maxCount = Math.max(...kpis.leads_by_day.map(d => d.count), 0);
    if (maxCount === 0) {
         return <div className="flex items-center justify-center h-48 bg-gray-100 dark:bg-gray-800/50 rounded-lg"><p className="text-gray-500 dark:text-gray-400">No leads to display in chart.</p></div>;
    }

    return (
      <div className="flex justify-around items-end h-48 w-full bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg space-x-4">
        {kpis.leads_by_day.map(({ day, count }) => (
          <div key={day} className="flex flex-col items-center flex-1 h-full pt-4">
             <div className="flex flex-col items-center justify-end w-full h-full">
                <span className="text-xs text-gray-600 dark:text-gray-300 mb-1">{count}</span>
                <div 
                    className="w-full bg-blue-500 rounded-t-md hover:bg-blue-400 transition-all" 
                    style={{ height: `${(count / maxCount) * 85}%` }}
                    title={`Day ${day}: ${count} leads`}
                ></div>
             </div>
            <span className="text-xs mt-2 text-gray-700 dark:text-gray-300 font-bold">Day {day}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">KPI Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Key performance indicators for {EVENT_CODE}.</p>
        </div>
        <button 
            onClick={fetchKPIs} 
            disabled={loading}
            className="mt-4 md:mt-0 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:bg-gray-200 dark:disabled:bg-gray-900 disabled:cursor-not-allowed transition-all"
        >
          <RefreshCw className={`mr-2 h-5 w-5 ${loading ? 'animate-spin': ''}`} />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && !kpis && (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400">Loading KPIs...</div>
      )}

      {error && <div className="text-center p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">{error}</div>}

      {!loading && !error && !kpis && (
        <div className="text-center p-8 text-gray-500 dark:text-gray-400">No KPI data found for this event.</div>
      )}

      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <Card className="md:col-span-1">
            <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">Total Leads</h3>
            <p className="text-5xl font-bold text-gray-900 dark:text-white">{kpis.total_leads}</p>
          </Card>
          <Card className="md:col-span-2">
            <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">Leads by Channel</h3>
            {renderChannelDistribution()}
          </Card>

          <Card className="md:col-span-3">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">Leads by Day</h3>
                    <table className="min-w-full text-gray-800 dark:text-gray-200">
                        <thead className="border-b border-gray-200 dark:border-gray-600">
                            <tr>
                            <th className="py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Day</th>
                            <th className="py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Leads</th>
                            </tr>
                        </thead>
                        <tbody>
                        {kpis.leads_by_day && kpis.leads_by_day.length > 0 ? (
                            kpis.leads_by_day.map(({ day, count }) => (
                                <tr key={day} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                    <td className="py-2">{day}</td>
                                    <td className="py-2 text-right font-semibold">{count}</td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={2} className="py-4 text-center text-gray-500 dark:text-gray-400">No daily data.</td></tr>
                        )}
                        </tbody>
                    </table>
                </div>
                <div className="lg:col-span-2">
                    <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">Daily Distribution</h3>
                    {renderBarChart()}
                </div>
             </div>
          </Card>
          {hasGemini() && (
            <Card className="md:col-span-3">
              <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">AI-Powered Event Analysis</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Ask complex questions about your event data. The AI will use Thinking Mode for a deep analysis.
              </p>
              <textarea
                  className="input w-full min-h-[80px]"
                  placeholder="e.g., Based on the daily lead capture and channel distribution, what is our biggest opportunity for growth on the last day of the event? Suggest three concrete actions."
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  disabled={isAnalyzing}
              />
              <button
                  onClick={handleGenerateAnalysis}
                  disabled={isAnalyzing || !aiQuery.trim()}
                  className="mt-4 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-all flex items-center justify-center"
              >
                  {isAnalyzing ? (
                      <>
                          <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                          Analyzing with Thinking Mode...
                      </>
                  ) : "Generate Analysis"}
              </button>
              {aiError && <p className="text-red-500 text-sm text-center mt-4">{aiError}</p>}
              {aiResponse && (
                  <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">Analysis Result:</h4>
                      <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">{aiResponse}</div>
                  </div>
              )}
            </Card>
          )}
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
