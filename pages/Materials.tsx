import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import { mentions } from '../lib/content';
import { exportLeadsCsv } from '../lib/export';
import type { Lead } from '../types';
import Card from '../components/Card';

const Materials: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadCsv = async () => {
    setIsDownloading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('event_code', EVENT_CODE)
        .eq('org_id', ORG_UUID)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      exportLeadsCsv(data as Lead[]);
    } catch (err: any) {
      console.error("Error exporting CSV:", err);
      setError("Failed to export leads. Please check the console.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = (sectionId: string) => {
    const printContents = document.getElementById(sectionId)?.innerHTML;
    const originalContents = document.body.innerHTML;
    if (printContents) {
        document.body.innerHTML = printContents;
        window.print();
        document.body.innerHTML = originalContents;
        // The page will reload after printing to restore its state, but this is a simple approach
        // without complex state management for a utility page.
        window.location.reload(); 
    }
  };

  return (
    <>
      <div className="mx-auto max-w-5xl" id="materials-page">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Event Materials</h1>
          <p className="text-slate-400 mt-2">Download lead data and print essential documents.</p>
        </div>
        
        <Card>
            <h2 className="text-xl font-bold text-primary-400 mb-4">Downloads & Printables</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button 
                    onClick={handleDownloadCsv}
                    disabled={isDownloading}
                    className="w-full rounded-lg bg-primary-600 p-4 font-semibold text-white hover:bg-primary-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                >
                    {isDownloading ? 'Exporting...' : 'Download Leads CSV'}
                </button>
                 <button onClick={() => handlePrint('print-ballot')} className="w-full rounded-lg bg-slate-700 p-4 font-semibold text-white hover:bg-slate-600 transition-all">
                    Imprimir Papeleta A5
                </button>
                <button onClick={() => handlePrint('print-legal')} className="w-full rounded-lg bg-slate-700 p-4 font-semibold text-white hover:bg-slate-600 transition-all">
                    Imprimir Legal A5
                </button>
                 <button onClick={() => handlePrint('print-cue-cards')} className="w-full rounded-lg bg-slate-700 p-4 font-semibold text-white hover:bg-slate-600 transition-all">
                    Imprimir Cue Cards MC
                </button>
            </div>
             {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
        </Card>
      </div>

      {/* Hidden printable content */}
      <div className="printable-area">
        <div id="print-ballot" className="print-section a5-page">
            <h2>Papeleta de Sorteo</h2>
            <p>¡Participa en nuestros sorteos diarios!</p>
            <div className="form-box">
                <div className="field"><label>Nombre:</label><span></span></div>
                <div className="field"><label>Empresa:</label><span></span></div>
                <div className="field"><label>WhatsApp:</label><span></span></div>
            </div>
            <p className="footer-text">Deposita esta papeleta en el buzón de nuestro stand. ¡Mucha suerte!</p>
        </div>
        
        <div id="print-legal" className="print-section a5-page">
            <h2>Términos y Condiciones</h2>
            <p><strong>Sorteos y Premios:</strong></p>
            <ol>
                <li>Los sorteos se realizarán en las fechas y horas anunciadas en el stand.</li>
                <li>Para participar, el lead debe estar completamente registrado.</li>
                <li>El ganador deberá estar presente al momento del sorteo o reclamar su premio dentro de un plazo de 1 hora.</li>
                <li>El premio no es transferible ni canjeable por efectivo.</li>
            </ol>
            <p><strong>Uso de Datos:</strong></p>
            <p>Al registrarse, usted acepta recibir comunicaciones comerciales sobre nuestros tours, traslados y promociones. Sus datos no serán compartidos con terceros.</p>
        </div>
        
        <div id="print-cue-cards" className="print-section">
             <h2 className="cue-card-header">MC Cue Cards - {EVENT_CODE}</h2>
            {Object.entries(mentions).map(([day, dayMentions]) => (
                <div key={day} className="cue-card-day-section">
                    <h3 className="day-title">Día {day}</h3>
                    <div className="card-grid">
                        {[...dayMentions.AM, ...dayMentions.PM, ...dayMentions.MICRO].map(mention => (
                             <div key={mention.id} className="cue-card">
                                <p className="cue-card-text">{mention.text}</p>
                                <span className="cue-card-id">{mention.id} ({mention.type})</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>
      
       <style>{`
        .printable-area {
            display: none;
        }
        @media print {
            body, #root {
                visibility: hidden;
            }
            .printable-area, .print-section {
                visibility: visible;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
            }

            .a5-page {
                width: 148mm;
                height: 210mm;
                margin: 0 auto;
                padding: 10mm;
                font-family: Arial, sans-serif;
                color: #000;
                border: 1px solid #ccc;
                box-sizing: border-box;
            }
            .a5-page h2 { font-size: 20pt; font-weight: bold; margin-bottom: 1rem; }
            .a5-page p, .a5-page li { font-size: 10pt; }
            .a5-page .form-box { margin-top: 2rem; border: 1px solid #000; padding: 1rem; }
            .a5-page .field { border-bottom: 1px dotted #000; padding: 0.75rem 0; display: flex;}
            .a5-page .field label { font-weight: bold; margin-right: 0.5rem; }
            .a5-page .footer-text { margin-top: 2rem; text-align: center; font-style: italic; }

            .cue-card-header { font-size: 24pt; text-align: center; margin-bottom: 1rem; }
            .cue-card-day-section { page-break-before: always; }
            .day-title { font-size: 18pt; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 0.5rem; margin-bottom: 1rem; }
            .card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1cm; }
            .cue-card { border: 1px solid #888; padding: 0.5cm; height: 7cm; display: flex; flex-direction: column; justify-content: space-between; page-break-inside: avoid; }
            .cue-card-text { font-size: 12pt; }
            .cue-card-id { font-size: 8pt; color: #666; text-align: right; }
        }
      `}</style>
    </>
  );
};

export default Materials;
