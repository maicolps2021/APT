import React, { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/supabaseClient';
import { MessageSquare, Mail, Share2, Clock } from 'lucide-react';
import { ORG_UUID } from '@/lib/config';

type Props = { orgId: string; leadId: string };
type AnyAct = Record<string, any>;

function rel(d: Date) {
  const s = Math.floor((Date.now() - d.getTime())/1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s/60); if (m < 60) return `${m}m`;
  const h = Math.floor(m/60); if (h < 24) return `${h}h`;
  const d2 = Math.floor(h/24); return `${d2}d`;
}
function asDate(x:any): Date | null {
  // @ts-ignore
  if (x?.toDate) try { const d = x.toDate(); return isFinite(+d)? d:null; } catch {}
  if (typeof x==='string' || typeof x==='number') { const d = new Date(x); return isFinite(+d)? d:null; }
  if (x instanceof Date) return isFinite(+x)? x:null;
  return null;
}

const ActivityLog: React.FC<Props> = ({ orgId, leadId }) => {
  const [rows, setRows] = useState<AnyAct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=> {
    (async ()=>{
      setLoading(true);
      try {
        // The collection path for activity is directly under the lead
        const col = collection(db, 'leads', leadId, 'activity');
        const snap = await getDocs(query(col, orderBy('at','desc'), limit(20)));
        setRows(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      } catch (e) {
        console.error("Failed to load activity log", e)
      }
      finally { setLoading(false); }
    })();
  }, [orgId, leadId]);

  if (loading) return <div className="text-xs opacity-70 p-3">Loading activity…</div>;
  if (!rows.length) return null; // Hide if no activity

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
      <div className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">Activity</div>
      <ul className="space-y-2">
        {rows.map(r => {
          const at = asDate(r.at);
          const when = at ? rel(at) : '';
          let Icon = Clock; let label = r.type || 'event';
          if (r.type === 'share') { Icon = Share2; label = `Shared via ${r.channel}`; }
          if (r.type === 'wa')    { Icon = MessageSquare; label = 'WhatsApp message sent'; }
          if (r.type === 'email') { Icon = Mail; label = 'Email opened/composed'; }
          return (
            <li key={r.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Icon className="w-4 h-4 opacity-80 flex-shrink-0" />
              <span className="truncate flex-grow">{label}</span>
              {when && <span className="ml-auto text-xs opacity-60 flex-shrink-0">{when}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ActivityLog;
