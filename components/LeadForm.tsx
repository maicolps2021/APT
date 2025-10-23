import React, { useState, useEffect } from 'react';
import { db } from '../lib/supabaseClient'; // Path kept for simplicity, points to Firebase now
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ORG_UUID, EVENT_CODE, EVENT_DATES } from '../lib/config';
import type { Lead } from '../types';
import { generateWelcomeMessage } from '../lib/geminiService';
import { getTvChannel } from '../lib/broadcastService';
import { hasGemini } from '../lib/ai';
import { emitTvEvent } from '../lib/tvBus';
import { CheckCircle, LoaderCircle } from 'lucide-react';

interface LeadFormProps {
  onSuccess: (lead: Lead) => void;
  onReset: () => void;
  successLead: Lead | null;
}

const initialFormData: Partial<Lead> = {
  source: 'MANUAL',
  day: new Date(EVENT_DATES.split(',')[0]).getUTCDate(),
  slot: 'AM',
  role: 'Guia',
  interest: 'Ambos',
  next_step: 'Condiciones',
  scoring: 'B',
};

export const LeadForm: React.FC<LeadFormProps> = ({ onSuccess, onReset, successLead }) => {
  const [formData, setFormData] = useState<Partial<Lead>>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (successLead) {
      const timer = setTimeout(() => {
        onReset();
        setFormData(initialFormData);
        setIsLoading(false);
        setError(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successLead, onReset]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.whatsapp) {
      setError("Name and WhatsApp are required.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const leadPayload: Omit<Lead, 'id' | 'created_at'> = {
      org_id: ORG_UUID,
      event_code: EVENT_CODE,
      source: formData.source || 'MANUAL',
      day: Number(formData.day),
      slot: formData.slot || 'AM',
      name: formData.name,
      company: formData.company || '',
      role: formData.role || 'Otro',
      channel: formData.channel || formData.role || 'Otro',
      whatsapp: formData.whatsapp.replace(/\D/g, ''),
      email: formData.email || '',
      interest: formData.interest || 'Ambos',
      next_step: formData.next_step || 'Condiciones',
      scoring: formData.scoring || 'C',
      owner: formData.owner || '',
      notes: formData.notes || '',
      tags: [],
    };

    try {
      const docRef = await addDoc(collection(db, 'leads'), {
        ...leadPayload,
        created_at: serverTimestamp(),
      });

      const newLead: Lead = {
        id: docRef.id,
        created_at: new Date().toISOString(),
        ...leadPayload,
      };

      if (hasGemini()) {
        const welcomeMessage = await generateWelcomeMessage(newLead);
        
        const eventPayload = {
          lead: { id: newLead.id, name: newLead.name, company: newLead.company, notes: newLead.notes },
          welcomeMessage: welcomeMessage,
        };

        // Primary: Firestore (multi-device)
        await emitTvEvent(eventPayload);

        // Secondary optimization (same-device)
        const channel = getTvChannel();
        if (channel) {
          channel.postMessage(eventPayload);
        }
      }
      
      onSuccess(newLead);

    } catch (err: any) {
      console.error("Error adding lead:", err);
      setError("Failed to save lead. Please check console for details and ensure Firestore rules allow 'create' on the 'leads' collection.");
      setIsLoading(false);
    }
  };

  if (successLead) {
    return (
      <div className="text-center p-8 flex flex-col items-center justify-center h-full animate-fade-in">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Captured!</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {successLead.name} from {successLead.company} has been successfully registered.
        </p>
         <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
          Returning to form automatically...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Name*</label>
          <input name="name" onChange={handleChange} value={formData.name || ''} className="input" required />
        </div>
        <div>
          <label className="label">Company</label>
          <input name="company" onChange={handleChange} value={formData.company || ''} className="input" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">WhatsApp*</label>
          <input name="whatsapp" type="tel" onChange={handleChange} value={formData.whatsapp || ''} className="input" placeholder="+50612345678" required />
        </div>
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" onChange={handleChange} value={formData.email || ''} className="input" />
        </div>
      </div>

      <div>
        <label className="label">Role</label>
        <select name="role" onChange={handleChange} value={formData.role || ''} className="input">
          <option>Guia</option>
          <option>Agencia</option>
          <option>Hotel</option>
          <option>Mayorista</option>
          <option>Transportista</option>
          <option>Otro</option>
        </select>
      </div>
      
      <div className="pt-4">
        <button type="submit" disabled={isLoading} className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 flex items-center justify-center">
          {isLoading ? (
            <>
              <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Saving...
            </>
          ) : 'Capture Lead'}
        </button>
      </div>
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      <style>{`.label { @apply block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1; }`}</style>
    </form>
  );
};