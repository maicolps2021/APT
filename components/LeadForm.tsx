

import React, { useState, FormEvent, useMemo, useRef } from 'react';
import { ORG_UUID, EVENT_CODE, EVENT_DATES } from '../lib/config';
import type { Lead } from '../types';
import { generateWelcomeMessage } from '../lib/geminiService';
import { emitTvEvent } from '../lib/tvBus';
import { CheckCircle, LoaderCircle, PartyPopper, RefreshCw } from 'lucide-react';
import { hasGemini } from '../lib/ai';
import { LEAD_CATEGORY_LABELS } from '../types';
import { LEAD_CATEGORY_ORDER } from '../lib/categoryMap';
import { normalizePhoneCR } from '../lib/phone';
import { createLeadUnique } from '../lib/leads';


interface LeadFormProps {
  onSuccess: (lead: Lead) => void;
  onReset: () => void;
  successLead: Lead | null;
}

const getCurrentEventDay = () => {
    const today = new Date().getUTCDate();
    const eventDays = (EVENT_DATES as string).split(',').map(d => new Date(d.trim()).getUTCDate());
    return eventDays.find(d => d === today) || eventDays[0] || new Date().getUTCDate();
};

const getCurrentSlot = (): 'AM' | 'PM' => {
    const hour = new Date().getUTCHours(); // Using UTC for consistency
    return hour < 12 ? 'AM' : 'PM';
};

export const LeadForm: React.FC<LeadFormProps> = ({ onSuccess, onReset, successLead }) => {
  const initialFormData: Omit<Lead, 'id' | 'created_at' | 'org_id' | 'event_code' | 'day' | 'slot' | 'source'> = {
    name: '',
    company: '',
    role: 'guias',
    whatsapp: '',
    email: '',
    interest: 'Ambos',
  };
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);


  const canSubmit = useMemo(() => {
    return formData.name.trim().length > 2 && (formData.whatsapp?.trim() || formData.email?.trim());
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isLoading) return;

    setIsLoading(true);
    setError(null);
    
    const norm = normalizePhoneCR(formData.whatsapp);
    if (formData.whatsapp && !norm) {
        setError("Teléfono inválido. Ingrese un número de 8 dígitos o con prefijo 506.");
        setIsLoading(false);
        return;
    }

    const source: Lead['source'] = 'MANUAL';

    const newLeadData = {
      ...formData,
      org_id: ORG_UUID,
      event_code: EVENT_CODE,
      source,
      day: getCurrentEventDay(),
      slot: getCurrentSlot(),
      phone_raw: formData.whatsapp || '',
      phone_e164: norm?.e164 || '',
      phone_local: norm?.local || '',
    };

    try {
      const leadId = await createLeadUnique(newLeadData);
      const createdLead: Lead = { ...newLeadData, id: leadId, created_at: new Date().toISOString() };
      
      onSuccess(createdLead);

      if (hasGemini()) {
        const welcomeMessage = await generateWelcomeMessage(createdLead);
        await emitTvEvent({
          lead: {
            id: createdLead.id,
            name: createdLead.name,
            company: createdLead.company
          },
          welcomeMessage,
        });
      }
      
      // Kiosk mode: reset form and focus first input for next entry
      setFormData(initialFormData);
      onReset();
      queueMicrotask(() => {
        nameInputRef.current?.focus();
      });

    } catch (err: any) {
       if (err?.message === 'DUPLICATE_PHONE') {
          setError('Este número de teléfono ya ha sido registrado.');
      } else {
          console.error("Error saving lead:", err);
          setError("Could not save the lead. Please check the console for details.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (successLead) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-full animate-fade-in">
        <PartyPopper className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">¡Registro Exitoso!</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          ¡Bienvenido, <span className="font-semibold">{successLead.name}</span>! Gracias por registrarte.
        </p>
        <button
          onClick={onReset}
          className="mt-6 inline-flex items-center justify-center rounded-lg px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Registrar a alguien más
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Lead Capture</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-4 mb-6">Complete the form to register a new attendee.</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="label">Full Name</label>
          <input ref={nameInputRef} id="name" name="name" type="text" value={formData.name} onChange={handleChange} className="input" required />
        </div>
        <div>
          <label htmlFor="company" className="label">Company (optional)</label>
          <input id="company" name="company" type="text" value={formData.company} onChange={handleChange} className="input" />
        </div>
      </div>

      <div>
        <label htmlFor="role" className="label">Role</label>
        <select id="role" name="role" value={formData.role} onChange={handleChange} className="input">
          {LEAD_CATEGORY_ORDER.map(key => (
            <option key={key} value={key}>{LEAD_CATEGORY_LABELS[key]}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="whatsapp" className="label">WhatsApp (optional)</label>
          <input id="whatsapp" name="whatsapp" type="tel" value={formData.whatsapp || ''} onChange={handleChange} placeholder="+50612345678" className="input" />
        </div>
        <div>
          <label htmlFor="email" className="label">Email (optional)</label>
          <input id="email" name="email" type="email" value={formData.email || ''} onChange={handleChange} className="input" />
        </div>
      </div>
       <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">Please provide at least a WhatsApp number or an email.</p>

      <div>
        <label htmlFor="interest" className="label">Interest</label>
        <select id="interest" name="interest" value={formData.interest} onChange={handleChange} className="input">
          <option>Tour</option>
          <option>Traslado</option>
          <option>Ambos</option>
        </select>
      </div>
      
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <button type="submit" disabled={!canSubmit || isLoading} className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center">
        {isLoading ? (
          <>
            <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
            Saving...
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-5 w-5" />
            Register Lead
          </>
        )}
      </button>

       <style>{`
        .label { @apply block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1; }
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </form>
  );
};
