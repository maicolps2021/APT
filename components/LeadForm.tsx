
import React, { useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { EVENT_CODE, ORG_UUID } from "../lib/config";
import type { Lead } from '../types';

const mapDay = () => {
  const d = new Date().getDate();
  return d >= 27 && d <= 29 ? d : 27; // force 27 if you're out of dates
};

const availableTags = ['transfer-first', 'guide-pro', 'hotel-train'];

export function LeadForm() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Lead | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const createLead = async (payload: Partial<Lead>) => {
    setLoading(true);
    setErr(null);
    setOk(false);
  
    const { error } = await supabase.from("leads").insert([payload]);
    if (error) {
      setErr(error.message);
    } else {
      setOk(true);
      if (formRef.current) formRef.current.reset();
      setTags([]);
      setDuplicate(null);
    }
    setLoading(false);
  };

  const buildPayloadFromForm = (notes?: string) => {
    if (!formRef.current) return null;
    const f = new FormData(formRef.current);
    const slot = new Date().getHours() < 13 ? "AM" : "PM";
    const formNotes = f.get("notes") as string || '';

    return {
      org_id: ORG_UUID,
      event_code: EVENT_CODE,
      // FIX: The 'source' property was inferred as a generic 'string', which is not assignable
      // to the specific literal union type '"QR" | "MANUAL"' in the Lead interface. Using
      // 'as const' tells TypeScript to infer the most specific type, 'QR', resolving the error.
      source: "QR" as const,
      day: mapDay(),
      slot,
      name: f.get("name"),
      company: f.get("company"),
      role: f.get("role"),
      channel: f.get("role"),
      whatsapp: f.get("whatsapp"),
      email: f.get("email"),
      interest: f.get("interest"),
      next_step: 'Condiciones',
      scoring: "B",
      tags: tags,
      notes: notes ? notes : formNotes,
    };
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setErr(null); setOk(false); setDuplicate(null);

    const f = new FormData(e.currentTarget);
    const whatsapp = (f.get("whatsapp") as string || "").replace(/\s+/g, "");
    const email = (f.get("email") as string || "").trim().toLowerCase();

    if (!whatsapp && !email) {
      const payload = buildPayloadFromForm();
      if(payload) await createLead(payload);
      return;
    }

    // Check for duplicates
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('event_code', EVENT_CODE)
      .or(`whatsapp.eq.${whatsapp},email.eq.${email}`);
    
    setLoading(false);
    if (error) {
      setErr("Could not verify lead: " + error.message);
      return;
    }

    if (data && data.length > 0) {
      setDuplicate(data[0] as Lead);
    } else {
      const payload = buildPayloadFromForm();
      if(payload) await createLead(payload);
    }
  }

  const handleCreateAnyway = async () => {
    const payload = buildPayloadFromForm('posible duplicado');
    if (payload) await createLead(payload);
  };

  const handleTagToggle = (tag: string) => {
    setTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <>
      <form onSubmit={onSubmit} ref={formRef} className="space-y-4 text-slate-200">
        <div className="grid grid-cols-2 gap-4">
          <input name="name" placeholder="Nombre y Apellido" required className="input" />
          <input name="company" placeholder="Empresa" className="input" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <select name="role" className="input" defaultValue="">
            <option value="" disabled>Canal (Guía/Agencia/Hotel/Mayorista)</option>
            <option>Guia</option><option>Agencia</option><option>Hotel</option><option>Mayorista</option><option>Otro</option>
          </select>
          <select name="interest" className="input" defaultValue="">
            <option value="" disabled>Interés</option>
            <option>Tour</option><option>Traslado</option><option>Ambos</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <input name="whatsapp" placeholder="WhatsApp (+506…)" className="input" />
          <input type="email" name="email" placeholder="Email" className="input" />
        </div>
        
        <div>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  tags.includes(tag)
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        
        <textarea name="notes" placeholder="Notas adicionales..." className="input h-20" />
        
        <button disabled={loading || !!duplicate} className="w-full rounded-lg bg-primary-600 py-3 font-semibold text-white hover:bg-primary-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all mt-2">
          {loading ? "Verificando…" : "Guardar lead"}
        </button>

        {ok && <p className="text-primary-400 text-sm text-center">¡Lead guardado! Te contactamos en ≤2 horas.</p>}
        {err && <p className="text-red-400 text-sm text-center">{err}</p>}
      </form>
      {duplicate && (
        <div className="mt-4 border border-yellow-500 bg-yellow-900/50 p-4 rounded-lg text-yellow-200 animate-fade-in">
           <h3 className="font-bold text-lg">⚠️ Posible Duplicado Encontrado</h3>
           <p className="text-sm">Ya existe un lead con datos de contacto similares:</p>
           <div className="my-2 p-2 bg-slate-800 rounded text-sm">
              <p><strong>Nombre:</strong> {duplicate.name}</p>
              <p><strong>Empresa:</strong> {duplicate.company}</p>
           </div>
           <div className="flex gap-4 mt-4">
              <button type="button" onClick={() => setDuplicate(null)} className="w-full rounded-lg bg-slate-600 py-2 font-semibold text-white hover:bg-slate-500 transition-all">Cancelar</button>
              <button type="button" onClick={handleCreateAnyway} disabled={loading} className="w-full rounded-lg bg-yellow-600 py-2 font-semibold text-white hover:bg-yellow-700 transition-all disabled:bg-slate-600">
                {loading ? "Guardando..." : "Crear de todas formas"}
              </button>
           </div>
        </div>
      )}
      <style>{`
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}