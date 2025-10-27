import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../lib/supabaseClient';
import { collection, getDocs, query, where, orderBy, Timestamp, getCountFromServer } from 'firebase/firestore';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import Card from '../components/Card';
import KpiFilters from '../components/KpiFilters';
import { toCSV, downloadCSV } from '../lib/csv';
import { LoaderCircle } from 'lucide-react';
import { getLeadsPerHour, LeadsPerHourPoint } from '../lib/analytics';

// Helpers
function toDateValue(d: Date) { return d.toISOString().slice(0, 10); } // YYYY-MM-DD
function asDate(x: any): Date {
  if (x?.toDate) return x.toDate();
  const s = typeof x === 'string' ? x : '';
  const parsed = s ? new Date(s) : null;
  return parsed && !isNaN(+parsed) ? parsed : new Date();
}
function dayKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

type AnyLead = Record<string, any>;
function getChannel(l: AnyLead) { return (l.role || 'Otro').toString().trim(); }
function getCreatedAt(l: AnyLead): Date { return asDate(l.created_at); }

const KPIs: React.FC = () => {
  const [from, setFrom] = useState<string>(() => toDateValue(new Date(Date.now() - 6 * 86400000)));
  const [to, setTo] = useState<string>(() => toDateValue(new Date()));
  const [channel, setChannel] = useState<string>(() => localStorage.getItem('kpi_channel') || '');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [leads, setLeads] = useState<AnyLead[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [currentTotal, setCurrentTotal] = useState<number>(0);
  const [prevTotal, setPrevTotal] = useState<number>(0);
  
  const [hourlyData, setHourlyData] = useState<LeadsPerHourPoint[]>([]);
  const [loadingHourly, setLoadingHourly] = useState(true);

  useEffect(() => { localStorage.setItem('kpi_channel', channel); }, [channel]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Current period
      const fromDate = new Date(from + 'T00:00:00Z');
      const toDate = new Date(to + 'T23:59:59Z');
      
      const queryConstraints = [
        where('event_code', '==', EVENT_CODE),
        where('org_id', '==', ORG_UUID),
        where('created_at', '>=', Timestamp.fromDate(fromDate)),
        where('created_at', '<=', Timestamp.fromDate(toDate)),
      ];
      if (channel) {
        queryConstraints.push(where('role', '==', channel));
      }

      const leadsRef = collection(db, 'leads');
      const qCount = query(leadsRef, ...queryConstraints);
      const snapCount = await getCountFromServer(qCount);
      setCurrentTotal(snapCount.data().count);
      
      const qData = query(qCount, orderBy('created_at', 'asc'));
      const snapData = await getDocs(qData);
      const rows = snapData.docs.map(d => ({ id: d.id, ...d.data() }));
      setLeads(rows);

      // Previous period for comparison
      const delta = toDate.getTime() - fromDate.getTime();
      const prevFrom = new Date(fromDate.getTime() - delta);
      const prevTo = new Date(fromDate.getTime() - 1);

      const prevQueryConstraints = [
        where('event_code', '==', EVENT_CODE),
        where('org_id', '==', ORG_UUID),
        where('created_at', '>=', Timestamp.fromDate(prevFrom)),
        where('created_at', '<=', Timestamp.fromDate(prevTo)),
      ];
      if (channel) {
        prevQueryConstraints.push(where('role', '==', channel));
      }
      
      const qPrevCount = query(leadsRef, ...prevQueryConstraints);
      const prevSnap = await getCountFromServer(qPrevCount);
      setPrevTotal(prevSnap.data().count);
      
      setLastUpdated(new Date());
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to load KPIs');
    } finally {
      setLoading(false);
    }
  }, [from, to, channel]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  
  useEffect(() => {
    if (from === to) {
      setLoadingHourly(true);
      const selectedDate = new Date(from + 'T12:00:00Z');
      getLeadsPerHour({
        orgId: ORG_UUID,
        eventCode: EVENT_CODE,
        date: selectedDate,
      })
      .then(setHourlyData)
      .catch(err => console.error("Failed to load hourly data", err))
      .finally(() => setLoadingHourly(false));
    } else {
      setHourlyData([]);
      setLoadingHourly(false);
    }
  }, [from, to]);
  
  useEffect(() => {
      const uniqueChannels = Array.from(new Set(leads.map(getChannel))).sort();
      setChannels(uniqueChannels);
  }, [leads]);

  const aggregates = useMemo(() => {
    const byDay = new Map<string, number>();
    const byChannel = new Map<string, number>();

    leads.forEach(l => {
      const d = getCreatedAt(l);
      const dk = dayKey(d);
      byDay.set(dk, (byDay.get(dk) || 0) + 1);
      byChannel.set(getChannel(l), (byChannel.get(getChannel(l)) || 0) + 1);
    });

    const dayArr = Array.from(byDay.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
    const channelArr = Array.from(byChannel.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    const todayKey = dayKey(new Date());
    const leadsToday = leads.filter(l => dayKey(getCreatedAt(l)) === todayKey).length;

    return { dayArr, channelArr, leadsToday };
  }, [leads]);

  function onExport() {
    const rows = leads.map(l => ({
      id: l.id,
      created_at: getCreatedAt(l).toISOString(),
      name: l.name || '',
      email: l.email || '',
      whatsapp: l.whatsapp || '',
      company: l.company || '',
      channel: getChannel(l),
      status: l.status || '',
      next_step: l.next_step || ''
    }));
    downloadCSV(`leads_${EVENT_CODE}_${from}_${to}.csv`, toCSV(rows));
  }

  const diff = currentTotal - prevTotal;
  const trend = diff === 0 ? '—' : diff > 0 ? `▲ +${diff}` : `▼ ${diff}`;
  const trendColor = diff === 0 ? 'text-gray-600 dark:text-gray-400' : diff > 0 ? 'text-green-600' : 'text-red-600';
  
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Event KPIs</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Analyze lead capture performance in real-time.</p>
      </div>

      <KpiFilters
        from={from} to={to} channel={channel} channels={channels}
        onChange={({ from: f, to: t, channel: c }) => { setFrom(f); setTo(t); setChannel(c); }}
        onRefresh={fetchAll}
        lastUpdated={lastUpdated}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-xs opacity-70 mb-1">Total (range)</div>
          <div className="text-2xl font-semibold">{currentTotal}</div>
          <div className={`text-xs mt-1 font-medium ${trendColor}`}>vs prev: {trend}</div>
        </Card>
        <Card>
          <div className="text-xs opacity-70 mb-1">Today</div>
          <div className="text-2xl font-semibold">{aggregates.leadsToday}</div>
        </Card>
        <Card>
          <div className="text-xs opacity-70 mb-1">Channels used</div>
          <div className="text-2xl font-semibold">{aggregates.channelArr.length}</div>
        </Card>
         <Card className="flex items-center justify-center">
          <button onClick={onExport} className="px-4 py-2 w-full rounded-lg bg-gray-800 text-white dark:bg-gray-100 dark:text-black hover:opacity-90 font-semibold">Export CSV</button>
        </Card>
      </div>

      {loading && <div className="text-center p-8"><LoaderCircle className="animate-spin inline-block" /> Loading KPIs...</div>}
      {error && <div className="text-center p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">{error}</div>}
      
      {!loading && !error && (
        <>
        {leads.length === 0 ? (
           <div className="text-center py-16 text-gray-500 dark:text-gray-400">No leads found in the selected range.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-semibold mb-3">Leads by Channel</h3>
              <div className="space-y-2">
                {aggregates.channelArr.map(({ name, count }) => {
                  const max = aggregates.channelArr[0]?.count || 1;
                  const w = `${Math.max(6, Math.round((count / max) * 100))}%`;
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-1 opacity-75">
                        <span>{name}</span><span>{count}</span>
                      </div>
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded">
                        <div className="h-3 bg-blue-600 rounded" style={{ width: w }} title={`${name}: ${count}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold mb-3">Leads per Hour</h3>
              {from !== to ? (
                <div className="flex items-center justify-center h-28 text-sm text-center text-gray-500 dark:text-gray-400 p-4">
                  Select a single day in the date range to view the hourly breakdown.
                </div>
              ) : loadingHourly ? (
                <div className="flex items-center justify-center h-28">
                  <LoaderCircle className="animate-spin" />
                </div>
              ) : (
                <div className="flex items-end gap-1 h-28">
                  {hourlyData.map(({ hour, count }) => {
                    const max = Math.max(...hourlyData.map(x => x.count), 1);
                    const h = `${Math.round((count / max) * 100)}%`;
                    return (
                      <div key={hour} className="flex-1 flex flex-col justify-end items-center">
                        <div className="w-full bg-indigo-600 rounded-t" style={{ height: h || '1px' }} title={`${hour}:00 - ${hour}:59 → ${count} leads`} />
                        <div className="text-[10px] text-center mt-1 opacity-70">{hour}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
             <Card className="lg:col-span-2">
                <h3 className="font-semibold mb-3">Leads per Day</h3>
                 <div className="flex items-end gap-1 h-28">
                    {aggregates.dayArr.map(({ date, count }) => {
                        const max = Math.max(...aggregates.dayArr.map(x => x.count), 1);
                        const h = `${Math.round((count / max) * 100)}%`;
                        return (
                        <div key={date} className="flex-1 flex flex-col justify-end items-center" title={`${date}: ${count} leads`}>
                            <div className="w-full bg-emerald-600 rounded-t" style={{ height: h || '1px' }} />
                            <div className="text-[10px] text-center mt-1 opacity-70 transform -rotate-45">{date.substring(5)}</div>
                        </div>
                        );
                    })}
                </div>
            </Card>
          </div>
        )}
        </>
      )}
    </div>
  );
};

export default KPIs;