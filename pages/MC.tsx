import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { EVENT_CODE, ORG_UUID } from "../lib/config";

type LeadRow = {
  id: string;
  name: string | null;
  company: string | null;
  whatsapp: string | null;
  email: string | null;
  created_at: string;
};

export default function MCDashboard() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  // 1) Carga inicial
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select("id,name,company,whatsapp,email,created_at")
        .eq("event_code", EVENT_CODE)
        .eq("org_id", ORG_UUID)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!mounted) return;
      if (error) {
        console.error("[MC] select error:", error.message);
        setLeads([]);
      } else {
        setLeads(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 2) Realtime en INSERT (y opcional UPDATE/DELETE)
  useEffect(() => {
    const channel = supabase
      .channel("realtime-leads")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leads",
          filter: `event_code=eq.${EVENT_CODE}`, // server-side filter
        },
        (payload) => {
          const row = payload.new as LeadRow & { org_id?: string };
          // The org_id is not selected in the main query, but it's present in the payload
          if (row && (row as any).org_id === ORG_UUID) {
            setLeads((prev) => [row, ...prev]);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[MC] realtime suscrito");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
       <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white">MC Dashboard</h1>
        <p className="text-slate-400 mt-2">Real-time view of all captured leads.</p>
        <h2 className="mt-2 text-2xl font-bold text-primary-400">{leads.length} Leads Captured</h2>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/50">
        <table className="min-w-full text-slate-200">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">NAME</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">COMPANY</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">CONTACT</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">TIME</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading && (
              <tr>
                <td className="px-4 py-4 text-center text-slate-400" colSpan={4}>Loading...</td>
              </tr>
            )}
            {!loading && leads.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={4}>No leads captured yet.</td>
              </tr>
            )}
            {leads.map((l) => {
              const contact = l.whatsapp || l.email || "—";
              const time = new Date(l.created_at).toLocaleTimeString();
              return (
                <tr key={l.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">{l.name ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{l.company ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{contact}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-400">{time}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
