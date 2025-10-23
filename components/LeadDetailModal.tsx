import React, { useState, useEffect, FormEvent } from 'react';
import type { Lead } from '../types';
import { db } from '../lib/supabaseClient';
import { doc, updateDoc } from 'firebase/firestore';
import { getPersonalizedWhatsAppMessage, generateEmailLink } from '../lib/templates';
import { WHATSAPP } from '../lib/config';
import { X, Save, MessageSquare, Mail, LoaderCircle } from 'lucide-react';

interface LeadDetailModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    scoring: lead.scoring || 'C',
    next_step: lead.next_step || 'Condiciones',
    meeting_at: lead.meeting_at || '',
    notes: lead.notes || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waMessage, setWaMessage] = useState('');

  useEffect(() => {
    // Reset form when a new lead is selected
    if (lead) {
      setFormData({
        scoring: lead.scoring || 'C',
        next_step: lead.next_step || 'Condiciones',
        meeting_at: lead.meeting_at ? lead.meeting_at.slice(0, 16) : '', // Format for datetime-local
        notes: lead.notes || '',
      });
      getPersonalizedWhatsAppMessage(lead).then(setWaMessage);
    }
  }, [lead]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const leadRef = doc(db, 'leads', lead.id);
      await updateDoc(leadRef, {
        ...formData,
        meeting_at: formData.meeting_at ? new Date(formData.meeting_at).toISOString() : null,
      });
      onClose();
    } catch (err: any) {
      console.error("Error updating lead:", err);
      setError("Could not update lead. Please check the console.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleWhatsAppClick = () => {
    const waNumber = (lead.whatsapp || WHATSAPP || '').replace(/\D/g, "");
    const encodedMsg = encodeURIComponent(waMessage);
    window.open(`https://wa.me/${waNumber}?text=${encodedMsg}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{lead.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{lead.company || 'No company specified'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact</h3>
                  <p className="text-gray-800 dark:text-gray-200">{lead.whatsapp}</p>
                  <p className="text-gray-800 dark:text-gray-200">{lead.email}</p>
              </div>
              <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Details</h3>
                  <p className="text-gray-800 dark:text-gray-200">Role: {lead.role}</p>
                  <p className="text-gray-800 dark:text-gray-200">Interest: {lead.interest}</p>
              </div>
          </div>
           <div className="flex gap-2 mb-6">
              <button onClick={handleWhatsAppClick} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors text-sm">
                <MessageSquare size={16} /> WhatsApp
              </button>
              <a href={generateEmailLink(lead)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors text-sm">
                <Mail size={16} /> Email
              </a>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-t border-gray-200 dark:border-gray-800 pt-4">Internal Details</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="scoring" className="label">Scoring</label>
                    <select id="scoring" name="scoring" value={formData.scoring} onChange={handleChange} className="input">
                      <option value="A">A (Hot)</option>
                      <option value="B">B (Warm)</option>
                      <option value="C">C (Cold)</option>
                    </select>
                </div>
                 <div>
                    <label htmlFor="next_step" className="label">Next Step</label>
                    <select id="next_step" name="next_step" value={formData.next_step} onChange={handleChange} className="input">
                      <option>Reunion</option>
                      <option>Llamada15</option>
                      <option>Condiciones</option>
                      <option>FamTrip</option>
                    </select>
                </div>
             </div>
             <div>
                <label htmlFor="meeting_at" className="label">Schedule Meeting (optional)</label>
                <input id="meeting_at" name="meeting_at" type="datetime-local" value={formData.meeting_at} onChange={handleChange} className="input" />
             </div>
             <div>
                <label htmlFor="notes" className="label">Notes</label>
                <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange} rows={4} className="input" placeholder="Add any relevant notes here..."></textarea>
             </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
             <footer className="flex justify-end gap-2 pt-4">
                 <button type="button" onClick={onClose} className="rounded-lg px-6 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold transition-colors">
                    Cancel
                 </button>
                 <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 flex items-center justify-center gap-2">
                    {isSaving ? <LoaderCircle className="animate-spin" size={20} /> : <Save size={16} />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                 </button>
             </footer>
          </form>
        </div>
      </div>
      <style>{`
        .label { @apply block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1; }
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default LeadDetailModal;
