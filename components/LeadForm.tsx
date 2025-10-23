import React, { useState, useRef } from "react";
import { db } from "../lib/supabaseClient"; // Renamed, but path is the same for simplicity
import { collection, addDoc, getDocs, query, where, serverTimestamp, Timestamp } from "firebase/firestore";
import { EVENT_CODE, ORG_UUID } from "../lib/config";
import type { Lead } from '../types';
import { List, PlusCircle, RotateCcw } from 'lucide-react';

const mapDay = () => {
  const d = new Date().getDate();
  return d >= 27 && d <= 29 ? d : 27; // force 27 if you're out of dates
};

interface LeadFormProps {
    onSuccess: (lead: Lead) => void;
    onReset: () => void;
    successLead: Lead | null;
}

export function LeadForm({ onSuccess, onReset, successLead }: LeadFormProps) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<Lead | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleResetForm = () => {
    if (formRef.current) formRef.current.reset();
    setLoading(false);
    setErr(null);
    setDuplicate(null);
    onReset();
  };

  const createLead = async (payload: Omit<Lead, 'id' | 'created_at'>) => {
    setLoading(true);
    setErr(null);
  
    try {
      const docPayload = { ...payload, created_at: serverTimestamp() };
      const docRef = await addDoc(collection(db, "leads"), docPayload);
      onSuccess({ ...payload, id: docRef.id, created_at: new Date().toISOString() });
      setLoading(false);
    } catch (error) {
      console.error("Error creating lead:", error);
      setErr("Error al guardar. Revisa las reglas de seguridad de Firestore para permitir la escritura (write).");
      setLoading(false);
    }
  };

  const buildPayloadFromForm = (): Omit<Lead, 'id' | 'created_at'> | null => {
    if (!formRef.current) return null;
    const f = new FormData(formRef.current);
    const slot: 'AM' | 'PM' = new Date().getHours() < 13 ? "AM" : "PM";

    return {
      org_id: ORG_UUID,
      event_code: EVENT_CODE,
      source: "QR" as const,
      day: mapDay(),
      slot,
      name: String(f.get("name") || ""),
      company: String(f.get("company") || ""),
      role: (f.get("role") || undefined) as Lead['role'],
      channel: String(f.get("role") || ""),
      whatsapp: String(f.get("whatsapp") || ""),
      email: String(f.get("email") || ""),
      interest: (f.get("interest") || undefined) as Lead['interest'],
      next_step: 'Condiciones' as const,
      scoring: "B" as const,
    };
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setErr(null); setDuplicate(null);

    const f = new FormData(e.currentTarget);
    const whatsapp = (f.get("whatsapp") as string || "").replace(/\s+/g, "");
    const email = (f.get("email") as string || "").trim().toLowerCase();

    if (!whatsapp && !email) {
      const payload = buildPayloadFromForm();
      if(payload) await createLead(payload);
      return;
    }

    // Check for duplicates with Firestore
    try {
      const leadsRef = collection(db, 'leads');
      const queries = [];
      if (whatsapp) {
          queries.push(query(leadsRef, where('event_code', '==', EVENT_CODE), where('whatsapp', '==', whatsapp)));
      }
      if (email) {
          queries.push(query(leadsRef, where('event_code', '==', EVENT_CODE), where('email', '==', email)));
      }

      const querySnapshots = await Promise.all(queries.map(q => getDocs(q)));
      
      const foundDocs: Lead[] = [];
      querySnapshots.forEach(snapshot => {
          snapshot.forEach(doc => {
              const data = doc.data();
              // Duck-typing to check for Firestore Timestamp object to avoid TS build error
              const createdAt = data.created_at && typeof data.created_at.toDate === 'function' 
                ? data.created_at.toDate().toISOString() 
                : new Date().toISOString();
              foundDocs.push({ id: doc.id, ...data, created_at: createdAt } as Lead);
          });
      });
      
      setLoading(false);
      if (foundDocs.length > 0) {
        setDuplicate(foundDocs[0]);
      } else {
        const payload = buildPayloadFromForm();
        if(payload) await createLead(payload);
      }
    } catch (error: any) {
      setErr("Could not verify lead: " + error.message);
      setLoading(false);
    }
  }

  const handleCreateAnyway = async () => {
    const payload = buildPayloadFromForm();
    if (payload) await createLead(payload);
  };

  if (successLead) {
    return (
        <div className="flex flex-col items-center justify-center text-center h-full animate-fade-in">
            <div className="bg-green-100 dark:bg-green-900/50 rounded-full p-4 mb-4">
                <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">¡Éxito!</h2>
            <p className="text-gray-600 dark:text-gray-300 mt-2 max-w-sm">
                El lead <span className="font-semibold">{successLead.name}</span> de <span className="font-semibold">{successLead.company}</span> ha sido guardado.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">¿Cuál es el siguiente paso?</p>
            
            <div className="mt-8 w-full space-y-3">
                <button 
                    onClick={handleResetForm}
                    className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                    <PlusCircle size={18} />
                    Capturar Otro Lead
                </button>
                <a href="#/leads" className="w-full block rounded-lg bg-gray-200 dark:bg-gray-700 py-3 font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2">
                    <List size={18} />
                    Ver Lista de Leads
                </a>
            </div>
        </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-semibold mb-5 text-gray-900 dark:text-white">Formulario de Registro Rápido</h2>
      <form onSubmit={onSubmit} ref={formRef} className="space-y-4 text-gray-800 dark:text-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input name="name" placeholder="Nombre y Apellido" required className="input" />
          <input name="company" placeholder="Empresa" className="input" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <select name="role" className="input" defaultValue="">
            <option value="" disabled>Canal (Guía/Agencia/Hotel/Mayorista/Transportista)</option>
            <option>Guia</option><option>Agencia</option><option>Hotel</option><option>Mayorista</option><option>Transportista</option><option>Otro</option>
          </select>
          <select name="interest" className="input" defaultValue="">
            <option value="" disabled>Interés</option>
            <option>Tour</option><option>Traslado</option><option>Ambos</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input name="whatsapp" placeholder="WhatsApp (+506…)" className="input" />
          <input type="email" name="email" placeholder="Email" className="input" />
        </div>
        
        <div className="flex items-center gap-3 pt-4">
            <button 
                type="button" 
                onClick={handleResetForm}
                className="w-auto flex-shrink-0 rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-3 font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                title="Clear form"
            >
                <RotateCcw size={18} />
            </button>
            <button disabled={loading || !!duplicate} className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-all">
                {loading ? "Verificando…" : "Guardar lead"}
            </button>
        </div>

        {err && <p className="text-red-500 dark:text-red-400 text-sm text-center">{err}</p>}
      </form>
      {duplicate && (
        <div className="mt-4 border border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-yellow-800 dark:text-yellow-200 animate-fade-in">
           <h3 className="font-bold text-lg">⚠️ Posible Duplicado Encontrado</h3>
           <p className="text-sm">Ya existe un lead con datos de contacto similares:</p>
           <div className="my-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
              <p><strong>Nombre:</strong> {duplicate.name}</p>
              <p><strong>Empresa:</strong> {duplicate.company}</p>
           </div>
           <div className="flex gap-4 mt-4">
              <button type="button" onClick={() => setDuplicate(null)} className="w-full rounded-lg bg-gray-500 py-2 font-semibold text-white hover:bg-gray-600 transition-all">Cancelar</button>
              <button type="button" onClick={handleCreateAnyway} disabled={loading} className="w-full rounded-lg bg-yellow-600 py-2 font-semibold text-white hover:bg-yellow-700 transition-all disabled:bg-gray-500">
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