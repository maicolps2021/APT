import React, { useState, useEffect, FormEvent } from 'react';
import type { Lead } from '../types';
import { db } from '../lib/supabaseClient';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { ORG_UUID, WHATSAPP } from '../lib/config';
import { sendWhatsAppVia } from '../services/messaging';
import { getResolvedWhatsAppText } from '../lib/templates';
import { loadMaterials, Material, logShare } from '../lib/materials';
import { X, Save, MessageSquare, Mail, LoaderCircle, Bot } from 'lucide-react';
import ActivityLog from './ActivityLog';

// Acepta Firestore Timestamp, string ISO/fecha, number (ms), o null/undefined.
function asDate(x: any): Date | null {
  // @ts-ignore
  if (x && typeof x.toDate === 'function') {
    try { const d = x.toDate(); return isFinite(d.getTime()) ? d : null; } catch { return null; }
  }
  if (typeof x === 'number') {
    const d = new Date(x);
    return isFinite(d.getTime()) ? d : null;
  }
  if (typeof x === 'string') {
    const s = x.trim();
    if (!s) return null;
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

type AnyLead = Lead & Record<string, any>;

function resolveLeadPhone(lead: AnyLead): string | undefined {
  const keys = ['phone', 'phone_number', 'telefono', 'whatsapp', 'mobile', 'cell'];
  for (const k of keys) {
    const v = lead?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

interface LeadDetailModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    scoring: lead.scoring || 'C',
    next_step: lead.next_step || 'Condiciones',
    meeting_at_local: toLocalInputValue(asDate(lead.meeting_at)),
    notes: lead.notes || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [sendingAction, setSendingAction] = useState<string | null>(null);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialId, setMaterialId] = useState<string>('');
  const orgId = lead.org_id || ORG_UUID;
  
  const hasPhone = !!resolveLeadPhone(lead as AnyLead);
  const hasEmail = !!lead.email;

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
  
  useEffect(()=> {
    if (isOpen && orgId) {
      loadMaterials(orgId)
        .then(rows => {
            setMaterials(rows);
            if (rows.length && !materialId) {
                setMaterialId(rows[0].id);
            }
        })
        .catch(err => console.error("Failed to load materials", err));
    }
  }, [isOpen, orgId, materialId]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const leadRef = doc(db, 'leads', lead.id);
      const payload: any = {
        scoring: formData.scoring ?? null,
        next_step: formData.next_step ?? null,
        notes: (formData.notes || '').trim(),
        updated_at: Timestamp.now(),
      };
      
      payload.meeting_at = formData.meeting_at_local ? Timestamp.fromDate(new Date(formData.meeting_at_local)) : null;

      await updateDoc(leadRef, payload);
      onClose();
    } catch (err: any) {
      console.error("Error updating lead:", err);
      alert('Could not save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendWhatsApp = async (provider: 'wa' | 'builderbot') => {
    setSendingAction(provider);
    try {
        const toRaw = resolveLeadPhone(lead as AnyLead);
        if (!toRaw) throw new Error('No phone number available.');
        
        const text = await getResolvedWhatsAppText(lead);
        if (!text) throw new Error('WhatsApp template is empty. Please configure it in Settings.');

        await sendWhatsAppVia(provider, { to: toRaw, text, leadId: lead.id });
        if (provider === 'builderbot') alert('WhatsApp sent via BuilderBot ✅');
    } catch (e: any) {
        console.error(e);
        alert(`Error: ${e.message}`);
    } finally {
        setSendingAction(null);
    }
  };

  const selectedMaterial = materials.find(m => m.id === materialId);

  async function shareViaWA() {
    if (!selectedMaterial) { alert('Please select a material to share.'); return; }
    const toRaw = resolveLeadPhone(lead as AnyLead);
    if (!toRaw) { alert('No WhatsApp number available for this lead.'); return; }
    
    setSendingAction('share-wa');
    try {
        const firstName = (lead.name || '').split(' ')[0] || 'there';
        const text = `Hi ${firstName}, here is the material we discussed: ${selectedMaterial.name}\n${selectedMaterial.url}`;
        await sendWhatsAppVia('wa', { to: toRaw, text, leadId: lead.id });
        await logShare(orgId, lead.id, selectedMaterial.id, 'wa');
    } catch(e) {
        console.error("Share via WA failed:", e);
        alert("Could not share via WhatsApp.");
    } finally {
        setSendingAction(null);
    }
  }

  function shareViaEmail() {
    if (!selectedMaterial) { alert('Please select a material to share.'); return; }
    if (!lead.email) { alert('No email address available for this lead.'); return; }

    const subject = encodeURIComponent(`Requested Material: ${selectedMaterial.name}`);
    const body = encodeURIComponent(
`Hi ${lead.name || ''},

As requested, here is the material we discussed:
- ${selectedMaterial.name}
- ${selectedMaterial.url}

Best regards,`);
    const url = `mailto:${lead.email}?subject=${subject}&body=${body}`;
    window.open(url, '_blank');

    logShare(orgId, lead.id, selectedMaterial.id, 'email').catch(e => console.error("Failed to log share event", e));
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-50 dark:bg-gray-950 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{lead.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{lead.company || 'No company specified'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
        </header>

        <form id="lead-detail-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Scoring</label>
                <select name="scoring" value={formData.scoring} onChange={handleChange} className="w-full mt-1 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-400">
                  <option value="A">A (Hot)</option><option value="B">B (Warm)</option><option value="C">C (Cold)</option>
                </select>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Next Step</label>
                <select name="next_step" value={formData.next_step} onChange={handleChange} className="w-full mt-1 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-400">
                  <option value="">None</option><option value="Condiciones">Enviar Condiciones</option><option value="Reunion">Agendar Reunión</option><option value="Llamada15">Llamada 15min</option><option value="FamTrip">FamTrip</option><option value="WhatsApp">WhatsApp Follow-up</option>
                </select>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Schedule Meeting</label>
                <input type="datetime-local" name="meeting_at_local" value={formData.meeting_at_local} onChange={handleChange} className="w-full mt-1 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleSendWhatsApp('builderbot')} disabled={!hasPhone || !!sendingAction} title={!hasPhone ? "No phone on record" : "Send via BuilderBot"} className="h-11 flex-1 inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"><LoaderCircle className={`w-5 h-5 animate-spin ${sendingAction === 'builderbot' ? '':'hidden'}`} /><Bot className={`w-5 h-5 ${sendingAction === 'builderbot' ? 'hidden':''}`} /> BuilderBot</button>
                    <button type="button" onClick={() => handleSendWhatsApp('wa')} disabled={!hasPhone || !!sendingAction} title={!hasPhone ? "No phone on record" : "Open WhatsApp"} className="h-11 flex-1 inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"><LoaderCircle className={`w-5 h-5 animate-spin ${sendingAction === 'wa' ? '':'hidden'}`} /><MessageSquare className={`w-5 h-5 ${sendingAction === 'wa' ? 'hidden':''}`} /> WhatsApp</button>
                    <a href={`mailto:${lead.email || ''}`} target="_blank" rel="noreferrer" title={!hasEmail ? "No email on record" : "Send Email"} className={`h-11 flex-1 inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 ${!hasEmail ? 'opacity-60 cursor-not-allowed' : ''}`}><Mail className="w-5 h-5" /> Email</a>
                </div>
              </div>
               <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Share Material</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                <select value={materialId} onChange={e=>setMaterialId(e.target.value)} className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" disabled={materials.length === 0}>
                    {materials.length === 0 ? <option>No materials uploaded</option> : materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div className="flex gap-2 flex-shrink-0">
                    <button type="button" onClick={shareViaWA} disabled={!selectedMaterial || !hasPhone || !!sendingAction} title={!hasPhone ? "No phone on record" : "Share via WhatsApp"} className="h-11 w-11 inline-flex items-center justify-center gap-2 px-3 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"><LoaderCircle className={`w-5 h-5 animate-spin ${sendingAction === 'share-wa' ? '':'hidden'}`} /><MessageSquare className={`w-5 h-5 ${sendingAction === 'share-wa' ? 'hidden':''}`} /></button>
                    <button type="button" onClick={shareViaEmail} disabled={!selectedMaterial || !hasEmail || !!sendingAction} title={!hasEmail ? "No email on record" : "Share via Email"} className="h-11 w-11 inline-flex items-center justify-center gap-2 px-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"><Mail className="w-5 h-5" /></button>
                </div>
                </div>
                {materials.length === 0 && (
                    <div className="mt-2 text-xs rounded-lg bg-amber-50 text-amber-800 border border-amber-200 p-2 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
                    No materials available. <a className="underline font-medium" href="#/materials">Upload one here</a>.
                    </div>
                )}
              </div>
              <ActivityLog orgId={orgId} leadId={lead.id} />
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={4} className="w-full mt-1 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-400" />
          </div>
        </form>
        
        <footer className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
          <button type="submit" form="lead-detail-form" disabled={isSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
            {isSaving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
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
