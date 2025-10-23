
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../lib/supabaseClient';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { EVENT_CODE, ORG_UUID, EVENT_DATES } from '../lib/config';
import type { Lead, KPIsData, DailyLeads, ChannelDistribution } from '../types';
import Card from '../components/Card';
import KpiFilters, { KpiFilterState } from '../components/KpiFilters';
import { hasGemini } from '../lib/ai';
import { generateKpiAnalysis } from '../lib/geminiService';
import { LoaderCircle, Sparkles } from 'lucide-react';

const KPIs: React.FC = () => {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const eventDays = useMemo<number[]>(() => {
    const dates = (EVENT_DATES as string).split(',').map(d => {
        const date = new Date(String(d).trim());
        return date.getUTCDate();
    });
    return [...new Set(dates)].sort((a,b)=> a - b);
  }, []);

  const [filters, setFilters] = useState<KpiFilterState>({
    day: 'all',
    source: 'all',
  });

  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const leadsRef = collection(db, 'leads');
      const q = query(leadsRef,
        where('event_code', '==', EVENT_CODE),
        where('org_id', '==', ORG_UUID),
        orderBy('created_at', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const leadsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.created_at && typeof data.created_at.toDate === 'function'
          ? data.created_at.toDate().toISOString()
          : new Date().toISOString();
        return { id: doc.id, ...data, created_at: createdAt } as Lead;
      });
      setAllLeads(leadsData);
    } catch (err: any) {
      console.error("Error fetching leads for KPIs:", err);
      setError("Could not load lead data for KPIs. Please check the console.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = useMemo(() => {
    return allLeads.filter(lead => {
      const dayMatch = filters.day === 'all' || lead.day === filters.day;
      const sourceMatch = filters.source === 'all' || lead.source === filters.source;
      return dayMatch && sourceMatch;
    });
  }, [allLeads, filters]);

  const kpis = useMemo<KPIsData>(() => {
    const leads_by_channel: ChannelDistribution = {};
    const leads_by_day_map: { [key: number]: number } = {};

    for (const lead of filteredLeads) {
      // By channel (using 'role' as channel)
      const channel = lead.role || 'Otro';
      leads_by_channel[channel] = (leads_by_channel[channel] || 0) + 1;

      // By day
      const day = lead.day;
      leads_by_day_map[day] = (leads_by_day_map[day] || 0) + 1;
    }

    const leads_by_day: DailyLeads[] = Object.entries(leads_by_day_map)
      .map(([day, count]) => ({ day: Number(day), count }))
      .sort((a, b) => a.day - b.day);

    return {
      total_leads: filteredLeads.length,
      leads_by_channel,
      leads_by_day,
    };
  }, [filteredLeads]);

  const handleFilterChange = <K extends keyof KpiFilterState>(key: K, value: KpiFilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleAiAnalysis = async () => {
    if (!aiQuery.trim() || !hasGemini()) return;
    setIsAnalyzing(true);
    setAiResponse('');
    try {
      const response = await generateKpiAnalysis(aiQuery, kpis);
      setAiResponse(response);
    } catch (err) {
      setAiResponse("An error occurred during analysis.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const BarChart: React.FC<{ data: { label: string, value: number }[] }> = ({ data }) => {
    const maxValue = Math.max(...data.map(d => d.value), 0);
    return (
      <div className="space-y-2">
        {data.map(({ label, value }) => (
          <div key={label} className="grid grid-cols-4 items-center gap-2 text-sm">
            <div className="col-span-1 text-gray-600 dark:text-gray-400 truncate">{label}</div>
            <div className="col-span-3 flex items-center gap-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full"
                  style={{ width: maxValue > 0 ? `${(value / maxValue) * 100}%` : '0%' }}
                />
              </div>
              <div className="font-semibold w-8 text-right">{value}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  const leadsByDayChartData = kpis.leads_by_day.map(d => ({ label: `Day ${d.day}`, value: d.count }));
  const leadsByChannelChartData = Object.entries(kpis.leads_by_channel).map(([channel, count]) => ({ label: channel, value: count })).sort((a,b) => b.value - a.value);

  if (loading) return <div className="text-center p-8">Loading KPI data...</div>;
  if (error) return <div className="text-center p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">{error}</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Event KPIs</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Analyze lead capture performance in real-time.</p>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">Filters</h2>
        <KpiFilters filters={filters} onFilterChange={handleFilterChange} eventDays={eventDays} />
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 text-center">
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">Total Leads Captured</h3>
            <p className="text-5xl font-extrabold text-gray-900 dark:text-white mt-2">{kpis.total_leads}</p>
        </Card>
        <Card className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-4">Leads per Day</h3>
            {kpis.leads_by_day.length > 0 ? <BarChart data={leadsByDayChartData} /> : <p className="text-gray-500">No data for this period.</p>}
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-4">Leads by Channel (Role)</h3>
        {Object.keys(kpis.leads_by_channel).length > 0 ? <BarChart data={leadsByChannelChartData} /> : <p className="text-gray-500">No data for this period.</p>}
      </Card>

      {hasGemini() && (
        <Card>
          <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">AI-Powered Analysis</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Ask a question about the current KPI data. For example: "Which was our best performing day and why?"</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Ask anything..."
              className="input flex-grow"
              disabled={isAnalyzing}
            />
            <button
              onClick={handleAiAnalysis}
              disabled={isAnalyzing || !aiQuery.trim()}
              className="w-full sm:w-auto rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 flex items-center justify-center gap-2"
            >
              {isAnalyzing ? <LoaderCircle className="animate-spin" /> : <Sparkles size={16} />}
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
          {aiResponse && (
            <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                 <pre className="bg-transparent p-0 whitespace-pre-wrap font-sans">{aiResponse}</pre>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default KPIs;
