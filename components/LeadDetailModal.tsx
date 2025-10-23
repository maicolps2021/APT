import React, { useState, useEffect, FormEvent } from 'react';
import type { Lead } from '../types';
import { db } from '../lib/supabaseClient';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { EVENT_CODE, WHATSAPP } from '../lib/config';
import { sendWhatsApp, isReady, providerName } from '../services/messaging';
import { X, Save, MessageSquare, Mail, LoaderCircle } from 'lucide-react';

// Acepta Firestore Timestamp, string ISO/fecha, number (ms), o null/undefined.
function asDate(x: any): Date | null {
  // Firestore Timestamp tiene .toDate()
  // @ts-ignore
  if (x && typeof x === 'object' && typeof x.toDate === 'function') {
    try { const d = x.toDate(); return isFinite(d.getTime()) ? d : null; } catch { return null; }
  }
  if (typeof x === 'number') {
    const d = new Date(x);
    return isFinite(d.getTime()) ? d : null;
  }
  if (typeof x === 'string') {
    const s = x.trim();
    if (!s) return null;
    // Admite "YYYY-MM-DD" y ISO; Date(...) lo tolera, pero validamos
    const d = new Date(s);
    return isFinite(d.getTime()) ? d : null;
  }
  if (x instanceof Date) {
    return isFinite(x.getTime()) ? x : null;
  }
  return null;
}

function isValidDate(d: Date | null): d is Date {
  return !!(d && isFinite(d.getTime()));
}

// Para <input type="datetime-local"> se necesita "YYYY-MM-DDTHH:mm"
function toLocalInputValue(d: Date | null): string {
  if (!isValidDate(d)) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

// Helpers to safely resolve phone number from various possible fields
type AnyLead = Lead & Record<string, any>;

function resolveLeadPhone(lead: AnyLead): string | undefined {
  const keys = ['phone', 'phone_number', 'telefono', 'whatsapp', 'mobile', 'cell'];
  for (const k of keys) {
    const v = lead?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function normPhone(p?: string) {
  if (!p) return '';
  return p.replace(/[()\-\s]/g, '').trim();
}


interface LeadDetailModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

function buildWaText(lead: Lead) {
  const first = (lead.name || '').split(' ')[0] || 'there';
  const org  = lead.company || 'our team';
  return `Hi ${first}, thanks for visiting our stand today! This is ${org}. Let us know if you'd like a quick call or a tailored proposal.`;
}

function mailtoLink(lead: Lead) {
  const subject = encodeURIComponent(`[${EVENT_CODE}] Follow-up`);
  const body = encodeURIComponent(`Hi ${lead.name || ''},\n\nThanks for visiting our stand. Let us know if you'd like a quick call or a tailored proposal.\n\nBest regards,`);
  return `mailto:${lead.email || ''}?subject=${subject}&body=${body}`;
}

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    scoring: lead.scoring || 'C',
    next_step: lead.next_step || 'Condiciones',
    meeting_at_local: toLocalInputValue(asDate(lead.meeting_at)),
    notes: lead.notes || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      setFormData({
        scoring: lead.scoring || 'C',
        next_step: lead.next_step || 'Condiciones',
        meeting_at_local: toLocalInputValue(asDate(lead.meeting_at)),
        notes: lead.notes || '',
      });
    }
  }, [lead]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const leadRef = doc(db, 'leads', lead.id);
      const payload: any = {
        scoring: formData.scoring ?? null,
        next_step: formData.next_step ?? null,
        notes: (formData.notes || '').trim(),
        updated_at: Timestamp.now(),
      };
      
      if (formData.meeting_at_local && formData.meeting_at_local.trim()) {
        const d = new Date(formData.meeting_at_local);
        if (isValidDate(d)) {
            payload.meeting_at = Timestamp.fromDate(d);
        } else {
            payload.meeting_at = null;
        }
      } else {
        payload.meeting_at = null;
      }

      await updateDoc(leadRef, payload);
      onClose();
    } catch (err: any) {
      console.error("Error updating lead:", err);
      setError("Could not update lead. Please check the console.");
      alert('Could not save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl w-[92vw] md:w-[800px] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{lead.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{lead.company || 'No company specified'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Scoring</label>
              <select name="scoring" value={formData.scoring} onChange={handleChange} className="w-full rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-400">
                <option value="A">A (Hot)</option>
                <option value="B">B (Warm)</option>
                <option value="C">C (Cold)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Next Step</label>
              <select name="next_step" value={formData.next_step} onChange={handleChange} className="w-full rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-400">
                <option value="">None</option>
                <option value="Condiciones">Enviar Condiciones</option>
                <option value="Reunion">Agendar Reunión</option>
                <option value="Llamada15">Llamada 15min</option>
                <option value="FamTrip">FamTrip</option>
                <option value="WhatsApp">WhatsApp Follow-up</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Schedule Meeting</label>
              <input type="datetime-local" name="meeting_at_local" value={formData.meeting_at_local} onChange={handleChange} className="w-full rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={5} className="w-full rounded-xl border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
               <button
                  type="button"
                  title={isReady() ? 'Send WhatsApp' : 'Open WhatsApp link'}
                  aria-label="WhatsApp"
                  className="h-11 inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-60"
                  onClick={async () => {
                    try {
                      const toRaw = resolveLeadPhone(lead as AnyLead) || WHATSAPP;
                      if (!toRaw) {
                          alert('No phone number available for this lead.');
                          return;
                      }
                      const to = normPhone(toRaw);
                      const text = buildWaText(lead);
                      const res = await sendWhatsApp({ to, text, leadId: lead.id });
                      alert(res === 'sent' ? 'WhatsApp sent ✅' : 'Opening WhatsApp…');
                    } catch (e) {
                      console.error(e);
                      alert('Could not send WhatsApp. Check provider or phone.');
                    }
                  }}
                  disabled={!isReady() && providerName()==='none'}
                >
                  <MessageSquare className="w-5 h-5" />
                  WhatsApp
                </button>
                <a
                  href={mailtoLink(lead)}
                  target="_blank" rel="noreferrer"
                  title="Send Email" aria-label="Email"
                  className="h-11 inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <Mail className="w-5 h-5" />
                  Email
                </a>
            </div>
            <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">Activity log coming soon…</p>
            </div>
          </div>
        </div>
        
        <footer className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-800">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
          <button type="button" disabled={isSaving} onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
            {isSaving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </footer>
      </div>
      <style>{`
        @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default LeadDetailModal;