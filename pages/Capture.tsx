
import React, { useState } from 'react';
import { LeadForm } from "../components/LeadForm";
import { QRDisplay } from "../components/QRDisplay";
import { WHATSAPP } from "../lib/config";
import type { Lead } from '../types';
import { ArrowLeft, Megaphone } from 'lucide-react';

export default function Capture() {
  const [successLead, setSuccessLead] = useState<Lead | null>(null);

  const formUrl = `${window.location.origin}/#/capture`;
  const wa = (WHATSAPP || '').replace(/\D/g, "");
  const msg = encodeURIComponent("Hola, me interesan Tours/Traslados. ¿Me envían condiciones colaborador?");
  const waLink = `https://wa.me/${wa}?text=${msg}`;

  const handleReset = () => {
    setSuccessLead(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 selection:bg-blue-200 dark:selection:bg-blue-800 relative">
        <a href="#/" className="absolute top-6 left-6 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <ArrowLeft size={18} />
            <span>Back to Dashboard</span>
        </a>
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <Megaphone className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-2 text-gray-900 dark:text-gray-100 tracking-tight">¿Eres guía de turismo? ¡Únete a nosotros!</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Registra tus datos para conocer beneficios exclusivos y participar por fantásticos premios.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-gray-300/30 dark:shadow-black/30 w-full p-8 md:p-10 grid md:grid-cols-5 gap-10">
          <div className="md:col-span-3">
             <LeadForm onSuccess={setSuccessLead} onReset={handleReset} successLead={successLead} />
          </div>
          <div className="md:col-span-2 flex flex-col items-center justify-center text-center gap-4 border-t md:border-t-0 md:border-l border-dashed border-gray-200 dark:border-gray-700 pt-8 md:pt-0 md:pl-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Attendee Self-Scan</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Share this QR to open the form</p>
            </div>
            <QRDisplay url={formUrl} />
            <a className="mt-2 inline-flex items-center justify-center rounded-lg px-5 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold transition-colors w-full"
               target="_blank" rel="noreferrer" href={waLink}>
              Contact via WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}