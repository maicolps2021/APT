import React, { useState, useEffect } from 'react';
import type { Lead } from '../types';
import { db } from '../lib/supabaseClient'; // Path kept for simplicity, points to Firebase now
import { doc, updateDoc } from 'firebase/firestore';
import { X, Save, LoaderCircle } from 'lucide-react';

interface LeadDetailModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLead: Lead) => void;
}

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Lead>>(lead);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset form data when lead changes
    setFormData(lead);
  }, [lead]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value || null }));
  };

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Convert local datetime string to ISO 8601 string for consistency
    const date = value ? new Date(value).toISOString() : null;
    setFormData(prev => ({ ...prev, [name]: date }));
  };

  const formatDateTimeForInput = (isoString?: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    // Adjust for timezone offset to display correctly in local time
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Sanitize data for Firestore: ensure no 'undefined' values are sent.
      // Firestore supports 'null' for clearing a field, but not 'undefined'.
      const updateData = {
          next_step: formData.next_step || null,
          scoring: formData.scoring || null,
          meeting_at: formData.meeting_at || null,
          owner: formData.owner || null,
          notes: formData.notes || null,
      };

      const leadRef = doc(db, 'leads', lead.id);
      await updateDoc(leadRef, updateData);

      onSave({ ...lead, ...updateData });
      onClose();
    } catch (err: any) {
      console.error("Error updating lead:", err);
      setError("Failed to save changes. Please check Firestore security rules for UPDATE permission.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{lead.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{lead.company}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Next Step</label>
              <select name="next_step" value={formData.next_step || ''} onChange={handleChange} className="input">
                <option value="Condiciones">Enviar Condiciones</option>
                <option value="Reunion">Agendar Reunión</option>
                <option value="Llamada15">Llamada 15min</option>
                <option value="FamTrip">Invitar a FamTrip</option>
              </select>
            </div>
            <div>
              <label className="label">Scoring</label>
              <select name="scoring" value={formData.scoring || ''} onChange={handleChange} className="input">
                <option value="A">A (High Priority)</option>
                <option value="B">B (Medium Priority)</option>
                <option value="C">C (Low Priority)</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="label">Meeting Date & Time</label>
            <input
              type="datetime-local"
              name="meeting_at"
              value={formatDateTimeForInput(formData.meeting_at)}
              onChange={handleDateTimeChange}
              className="input"
            />
          </div>
          
          <div>
            <label className="label">Owner</label>
            <input
              type="text"
              name="owner"
              placeholder="e.g., John Doe"
              value={formData.owner || ''}
              onChange={handleChange}
              className="input"
            />
          </div>
          
          <div>
            <label className="label">Notes</label>
            <textarea
              name="notes"
              rows={4}
              placeholder="Add any relevant notes here..."
              value={formData.notes || ''}
              onChange={handleChange}
              className="input"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-500 flex items-center"
          >
            {isSaving ? <LoaderCircle className="animate-spin mr-2 h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
      <style>{`
        .label {
            @apply block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1;
        }
        @keyframes fade-in {
            0% { opacity: 0; }
            100% { opacity: 1; }
        }
        .animate-fade-in {
            animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default LeadDetailModal;