import React from 'react';
import { LeadForm } from "../components/LeadForm";
import { QRDisplay } from "../components/QRDisplay";
import { WHATSAPP } from "../lib/config";
import Card from '../components/Card';

export default function Capture() {
  const formUrl = `${window.location.origin}/#/capture`;
  const wa = (WHATSAPP || '').replace(/\D/g, "");
  const msg = encodeURIComponent("Hola, me interesan Tours/Traslados. ¿Me envían condiciones colaborador?");
  const waLink = `https://wa.me/${wa}?text=${msg}`;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Captura de Leads</h1>
        <p className="text-gray-600 dark:text-gray-300">Completa el formulario o comparte el QR para captación en piso.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <h2 className="text-xl font-semibold mb-4 text-center text-gray-900 dark:text-white">Formulario de Registro</h2>
          <LeadForm />
        </Card>
        <Card className="flex flex-col items-center justify-center text-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Escanear QR</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">para abrir este formulario</p>
          </div>
          <QRDisplay url={formUrl} />
          <a className="mt-2 inline-flex items-center justify-center rounded-lg px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-semibold transition-colors"
             target="_blank" rel="noreferrer" href={waLink}>
            Contactar por WhatsApp
          </a>
        </Card>
      </div>
    </div>
  );
}
