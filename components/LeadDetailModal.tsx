import React, { useState, useEffect, FormEvent } from 'react';
import type { Lead } from '../types';
import { db } from '../lib/supabaseClient';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getPersonalizedWhatsAppMessage, generateEmailLink } from '../lib/templates';
import { X, Save, MessageSquare, Mail, LoaderCircle } from 'lucide-react';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ isOpen, onClose, lead }) => {
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [waMessage, setWaMessage] = useState('');

  useEffect(() => {
    if (lead) {
      setFormData({
        scoring: lead.scoring || 'C',
        next_step: lead.next_step || undefined,
        meeting_at: lead.meeting_at ? lead.meeting_at.slice(0, 16) : '',
        notes: lead.notes || '',
      });
      getPersonalizedWhatsAppMessage(lead).then(setWaMessage);
    }
  }, [lead]);
  
  if (!isOpen || !lead) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value || null }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const leadRef = doc(db, 'leads', lead.id);
      await updateDoc(leadRef, {
        ...formData,
        meeting_at: formData.meeting_at ? new Date(formData.meeting_at).toISOString() : null,
        updated_at: serverTimestamp(),
      });
      onClose();
    } catch (error) {
      console.error("Error updating lead:", error);
      alert("Failed to save changes. Please check the console.");
    } finally {
      setIsSaving(false);
    }
  };
  
  const waLink = `https://wa.me/${lead.whatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(waMessage)}`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-fast" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSave} className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{lead.name}</h2>
                    <p className="text-gray-500 dark:text-gray-400">{lead.company || 'No company specified'}</p>
                </div>
                <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                    <X className="h-6 w-6 text-gray-500" />
                </button>
            </div>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Contact Info</h3>
                  <div className="text-sm space-y-1">
                      <p><span className="font-medium">Role:</span> {lead.role}</p>
                      <p><span className="font-medium">Interest:</span> {lead.interest}</p>
                      <p><span className="font-medium">Day:</span> {lead.day}</p>
                      <p><span className="font-medium">Slot:</span> {lead.slot}</p>
                  </div>
                </div>
                 <div>
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Quick Actions</h3>
                  <div className="flex flex-wrap gap-2">
                      {lead.whatsapp && <a href={waLink} target="_blank" rel="noreferrer" className="action-button bg-green-500 hover:bg-green-600"><MessageSquare size={16}/>WhatsApp</a>}
                      {lead.email && <a href={generateEmailLink(lead)} className="action-button bg-blue-500 hover:bg-blue-600"><Mail size={16}/>Email</a>}
                  </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="scoring" className="label">Scoring</label>
                    <select id="scoring" name="scoring" value={formData.scoring || 'C'} onChange={handleChange} className="input">
                        <option value="A">A (Hot)</option>
                        <option value="B">B (Warm)</option>
                        <option value="C">C (Cold)</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="next_step" className="label">Next Step</label>
                    <select id="next_step" name="next_step" value={formData.next_step || ''} onChange={handleChange} className="input">
                        <option value="">None</option>
                        <option value="Reunion">Reunión</option>
                        <option value="Llamada15">Llamada 15min</option>
                        <option value="Condiciones">Enviar Condiciones</option>
                        <option value="FamTrip">Invitar a Fam Trip</option>
                    </select>
                </div>
                 <div>
                    <label htmlFor="meeting_at" className="label">Schedule Meeting</label>
                    <input id="meeting_at" name="meeting_at" type="datetime-local" value={formData.meeting_at || ''} onChange={handleChange} className="input" />
                </div>
            </div>

            <div>
                <label htmlFor="notes" className="label">Notes</label>
                <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes || ''}
                    onChange={handleChange}
                    rows={4}
                    className="input"
                    placeholder="Add any relevant notes here..."
                />
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 mt-auto flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:bg-gray-500 flex items-center gap-2">
              {isSaving ? <LoaderCircle className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
        <style>{`
            .label { @apply block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1; }
            @keyframes fade-in-fast { 0% { opacity: 0; } 100% { opacity: 1; } }
            .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
            .action-button { @apply inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white rounded-md transition-colors; }
        `}</style>
      </div>
    </div>
  );
};

export default LeadDetailModal;
