
import React, { useState } from 'react';
import type { Lead } from '../types';
import { db } from '../lib/supabaseClient'; // This is Firebase
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ORG_UUID, EVENT_CODE, EVENT_DATES } from '../lib/config';
import { LoaderCircle, UserPlus, PartyPopper } from 'lucide-react';
import { generateWelcomeMessage } from '../lib/geminiService';

interface LeadFormProps {
  onSuccess: (lead: Lead) => void;
  onReset: () => void;
  successLead: Lead | null;
}

const getCurrentEventDetails = () => {
    const today = new Date();
    const currentDay = today.getUTCDate();
    const currentHour = today.getUTCHours();
    const eventDays = EVENT_DATES.split(',').map(d => new Date(d.trim()).getUTCDate());
    
    // Find matching day or default to first
    const day = eventDays.find(d => d === currentDay) || eventDays[0] || new Date().getUTCDate();
    const slot = currentHour < 12 ? 'AM' : 'PM';
    
    return { day, slot };
};

export const LeadForm: React.FC<LeadFormProps> = ({ onSuccess, onReset, successLead }) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    role: 'Guia',
    whatsapp: '',
    email: '',
    interest: 'Ambos',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setError('El nombre es requerido.');
      return;
    }
    setLoading(true);
    setError(null);

    const { day, slot } = getCurrentEventDetails();

    const leadPayload: Omit<Lead, 'id' | 'created_at'> = {
      org_id: ORG_UUID,
      event_code: EVENT_CODE,
      source: 'MANUAL',
      day,
      slot,
      name: formData.name.trim(),
      company: formData.company.trim() || undefined,
      role: formData.role as Lead['role'],
      channel: formData.role, // Set channel same as role for KPIs
      whatsapp: formData.whatsapp.trim() || undefined,
      email: formData.email.trim().toLowerCase() || undefined,
      interest: formData.interest as Lead['interest'],
      // Set other optional fields to undefined if empty
      next_step: undefined,
      scoring: undefined,
      owner: undefined,
      meeting_at: undefined,
      notes: undefined,
      tags: [],
    };

    try {
      const docRef = await addDoc(collection(db, 'leads'), {
        ...leadPayload,
        created_at: serverTimestamp(),
      });

      const newLead: Lead = {
        ...leadPayload,
        id: docRef.id,
        created_at: new Date().toISOString(), // Approximate for immediate use
      };
      
      onSuccess(newLead);
      
      // Generate welcome message for display
      generateWelcomeMessage(newLead).then(setWelcomeMessage);

    } catch (err: any) {
      console.error("Error adding lead:", err);
      setError("Error al guardar el lead. Por favor, revisa la consola para más detalles.");
    } finally {
      setLoading(false);
    }
  };

  if (successLead) {
    return (
      <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 border-2 border-dashed border-green-300 dark:border-green-700 rounded-xl animate-fade-in">
        <PartyPopper className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">¡Registro Exitoso!</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Se ha registrado a <strong>{successLead.name}</strong> de <strong>{successLead.company || 'N/A'}</strong>.
        </p>
        {welcomeMessage && (
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/50 rounded-lg text-sm text-green-800 dark:text-green-200">
                <p><strong>Mensaje para la pantalla:</strong> "{welcomeMessage}"</p>
            </div>
        )}
        <button
          onClick={() => {
            onReset();
            setFormData({
                name: '',
                company: '',
                role: 'Guia',
                whatsapp: '',
                email: '',
                interest: 'Ambos',
            });
            setWelcomeMessage('');
          }}
          className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
        >
          <UserPlus size={18} />
          Registrar Otro Asistente
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Detalles del Asistente</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="label">Nombre Completo *</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="input" required />
        </div>
        <div>
          <label htmlFor="company" className="label">Empresa</label>
          <input type="text" id="company" name="company" value={formData.company} onChange={handleChange} className="input" />
        </div>
      </div>
      <div>
        <label htmlFor="role" className="label">Rol</label>
        <select id="role" name="role" value={formData.role} onChange={handleChange} className="input">
          <option>Guia</option>
          <option>Agencia</option>
          <option>Hotel</option>
          <option>Mayorista</option>
          <option>Transportista</option>
          <option>Otro</option>
        </select>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="whatsapp" className="label">WhatsApp</label>
          <input type="tel" id="whatsapp" name="whatsapp" value={formData.whatsapp} onChange={handleChange} className="input" placeholder="+50612345678" />
        </div>
        <div>
          <label htmlFor="email" className="label">Correo Electrónico</label>
          <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="input" placeholder="nombre@empresa.com" />
        </div>
      </div>
       <div>
        <label htmlFor="interest" className="label">Interés Principal</label>
        <select id="interest" name="interest" value={formData.interest} onChange={handleChange} className="input">
          <option>Ambos</option>
          <option>Tour</option>
          <option>Traslado</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-all flex items-center justify-center"
      >
        {loading ? (
          <>
            <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
            Guardando...
          </>
        ) : (
            'Registrar Asistente'
        )}
      </button>
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      <style>{`.label { @apply block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1; }`}</style>
    </form>
  );
};
