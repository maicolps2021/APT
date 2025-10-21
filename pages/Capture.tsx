import React from 'react';
import { LeadForm } from "../components/LeadForm";
import { QRDisplay } from "../components/QRDisplay";
import { WHATSAPP } from "../lib/config";

export default function Capture() {
  const formUrl = `${window.location.origin}/#/capture`;
  const wa = (WHATSAPP || '').replace(/\D/g, "");
  const msg = encodeURIComponent("Hola, me interesan Tours/Traslados. ¿Me envían condiciones colaborador?");
  const waLink = `https://wa.me/${wa}?text=${msg}`;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2 text-slate-100">Captura de Leads</h1>
        <p className="text-slate-300">Completa el formulario o comparte el QR para captación en piso.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-center text-white">Formulario de Registro</h2>
          <LeadForm />
        </div>
        <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-6 flex flex-col items-center justify-center text-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Escanear QR</h2>
            <p className="text-sm text-slate-400">para abrir este formulario</p>
          </div>
          <QRDisplay url={formUrl} />
          <a className="mt-2 inline-flex items-center justify-center rounded-lg px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold transition-colors"
             target="_blank" rel="noreferrer" href={waLink}>
            Contactar por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
