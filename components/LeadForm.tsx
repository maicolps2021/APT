import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { EVENT_CODE, ORG_UUID } from "../lib/config";

const mapDay = () => {
  const d = new Date().getDate();
  return d >= 27 && d <= 29 ? d : 27; // force 27 if you're out of dates
};

export function LeadForm() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setErr(null); setOk(false);
    const f = new FormData(e.currentTarget);
    const slot = new Date().getHours() < 13 ? "AM" : "PM";

    const payload = {
      org_id: ORG_UUID,
      event_code: EVENT_CODE,
      source: "QR",
      day: mapDay(),
      slot,
      name: f.get("name"),
      company: f.get("company"),
      role: f.get("role"),
      channel: f.get("role"),
      whatsapp: f.get("whatsapp"),
      email: f.get("email"),
      interest: f.get("interest"),
      next_step: f.get("next_step"),
      scoring: f.get("scoring") ?? "B",
    };

    const { error } = await supabase.from("leads").insert([payload]);
    if (error) {
      setErr(error.message);
    } else { 
      setOk(true); 
      (e.target as HTMLFormElement).reset(); 
    }
    setLoading(false);
  }

  const inputClass = "w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all";

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-slate-200">
      <div className="grid grid-cols-2 gap-3">
        <input name="name" placeholder="Nombre y Apellido" required className={inputClass} />
        <input name="company" placeholder="Empresa" className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select name="role" className={inputClass} defaultValue="">
          <option value="" disabled>Canal (Guía/Agencia/Hotel/Mayorista)</option>
          <option>Guia</option><option>Agencia</option><option>Hotel</option><option>Mayorista</option><option>Otro</option>
        </select>
        <select name="interest" className={inputClass} defaultValue="">
          <option value="" disabled>Interés</option>
          <option>Tour</option><option>Traslado</option><option>Ambos</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input name="whatsapp" placeholder="WhatsApp (+506…)" className={inputClass} />
        <input type="email" name="email" placeholder="Email" className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select name="next_step" className={inputClass} defaultValue="Condiciones">
          <option>Reunion</option><option>Llamada15</option><option>Condiciones</option><option>FamTrip</option>
        </select>
        <select name="scoring" className={inputClass} defaultValue="B">
          <option>A</option><option>B</option><option>C</option>
        </select>
      </div>

      <button disabled={loading} className="w-full rounded-lg bg-primary-600 py-3 font-semibold text-white hover:bg-primary-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all">
        {loading ? "Guardando…" : "Guardar lead"}
      </button>

      {ok && <p className="text-primary-400 text-sm text-center">¡Lead guardado! Te contactamos en ≤2 horas.</p>}
      {err && <p className="text-red-400 text-sm text-center">{err}</p>}
    </form>
  );
}
