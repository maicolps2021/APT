import React, { useState } from 'react';
import { db } from '../lib/supabaseClient'; // Path kept for simplicity, points to Firebase now
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import { mentions } from '../lib/content';
import { exportLeadsCsv } from '../lib/export';
import type { Lead } from '../types';
import Card from '../components/Card';

const LogoSVG = ({ className }: { className?: string }) => (
    <svg
      width="40"
      height="40"
      viewBox="0 0 50 39"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M16.4992 2H37.5808L22.0816 24.9729H1L16.4992 2Z" fill="#2563EB" />
      <path d="M17.4224 27.102L11.4192 36H33.5008L49 13.0271H32.7024L23.2064 27.102H17.4224Z" fill="#3B82F6" />
    </svg>
);


const Materials: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadCsv = async () => {
    setIsDownloading(true);
    setError(null);
    try {
        const leadsRef = collection(db, 'leads');
        const q = query(leadsRef, 
          where('event_code', '==', EVENT_CODE), 
          where('org_id', '==', ORG_UUID),
          orderBy('created_at', 'asc')
        );
        const querySnapshot = await getDocs(q);
        const leadsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Duck-typing to check for Firestore Timestamp object to avoid TS build error
          const createdAt = data.created_at && typeof data.created_at.toDate === 'function' 
            ? data.created_at.toDate().toISOString() 
            : new Date().toISOString();
          return { id: doc.id, ...data, created_at: createdAt } as Lead
        });
      
      exportLeadsCsv(leadsData);
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
        window.location.reload(); 
    }
  };

  return (
    <>
      <div className="mx-auto max-w-5xl" id="materials-page">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Event Materials</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Download lead data and print essential documents.</p>
        </div>
        
        <Card>
            <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">Downloads & Printables</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button 
                    onClick={handleDownloadCsv}
                    disabled={isDownloading}
                    className="w-full rounded-lg bg-blue-600 p-4 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                >
                    {isDownloading ? 'Exporting...' : 'Download Leads CSV'}
                </button>
                 <button onClick={() => handlePrint('print-ballot')} className="w-full rounded-lg bg-gray-200 dark:bg-gray-700 p-4 font-semibold text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
                    Imprimir Papeleta A5
                </button>
                <button onClick={() => handlePrint('print-legal')} className="w-full rounded-lg bg-gray-200 dark:bg-gray-700 p-4 font-semibold text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
                    Imprimir Legal A5
                </button>
                 <button onClick={() => handlePrint('print-cue-cards')} className="w-full rounded-lg bg-gray-200 dark:bg-gray-700 p-4 font-semibold text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
                    Imprimir Cue Cards MC
                </button>
            </div>
             {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}
        </Card>
      </div>

      {/* Hidden printable content */}
      <div className="printable-area">
        <div id="print-ballot" className="print-section a5-page">
            <div className="page-header">
                <LogoSVG />
                <div className="header-text">
                    <h1>Arenal Private Tours</h1>
                    <p>by Small Groups</p>
                </div>
            </div>
            <h2>Papeleta de Sorteo</h2>
            <p style={{textAlign: 'center', marginTop: '-1rem', marginBottom: '2rem'}}>¡Participa en nuestros sorteos diarios!</p>
            <div className="form-box">
                <div className="field"><label>Nombre:</label><span></span></div>
                <div className="field"><label>Empresa:</label><span></span></div>
                <div className="field"><label>WhatsApp:</label><span></span></div>
            </div>
            <p className="footer-text">Deposita esta papeleta en el buzón de nuestro stand. ¡Mucha suerte!</p>
        </div>
        
        <div id="print-legal" className="print-section a5-page">
            <div className="page-header">
                <LogoSVG />
                <div className="header-text">
                    <h1>Arenal Private Tours</h1>
                    <p>by Small Groups</p>
                </div>
            </div>
            <h2>Términos y Condiciones</h2>
            <h3>Sorteos y Premios:</h3>
            <ol>
                <li>Los sorteos se realizarán en las fechas y horas anunciadas en el stand.</li>
                <li>Para participar, el lead debe estar completamente registrado.</li>
                <li>El ganador deberá estar presente al momento del sorteo o reclamar su premio dentro de un plazo de 1 hora.</li>
                <li>El premio no es transferible ni canjeable por efectivo.</li>
            </ol>
            <h3>Uso de Datos:</h3>
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
                                <div className="cue-card-footer">
                                    <span>{mention.id}</span> | <span>{mention.type}</span>
                                </div>
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
            /* General print styles */
            @page {
                size: A4;
                margin: 1cm;
            }
            body, #root, #materials-page {
                visibility: hidden;
                margin: 0;
                padding: 0;
                box-shadow: none;
            }
            .printable-area, .print-section {
                visibility: visible;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                color: #000;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            }
            
            /* A5 Page Styles (Ballot & Legal) */
            .a5-page {
                width: 148mm;
                height: 210mm;
                margin: 20mm auto; /* Center on A4 page */
                padding: 10mm;
                border: 1px solid #ddd;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
            }
            .page-header {
                display: flex;
                align-items: center;
                gap: 12px;
                border-bottom: 2px solid #2563EB;
                padding-bottom: 10px;
                margin-bottom: 20px;
            }
            .page-header .header-text h1 {
                font-size: 16pt;
                font-weight: bold;
                color: #1E3A8A;
                margin: 0;
            }
            .page-header .header-text p {
                font-size: 10pt;
                color: #666;
                margin: 0;
            }

            .a5-page h2 { 
                font-size: 24pt; 
                font-weight: bold; 
                margin-bottom: 24px; 
                color: #111;
                text-align: center;
            }
            .a5-page p, .a5-page li { 
                font-size: 11pt; 
                line-height: 1.6;
            }

            /* Ballot Specifics */
            #print-ballot .form-box { 
                margin-top: 2rem; 
                border: 1px solid #ccc; 
                padding: 1.5rem; 
                border-radius: 8px;
                background-color: #f9f9f9;
            }
            #print-ballot .field { 
                padding: 1rem 0; 
                display: flex;
                font-size: 12pt;
                border-bottom: 1px solid #ccc;
            }
            #print-ballot .field:last-child {
                border-bottom: none;
            }
            #print-ballot .field label { 
                font-weight: 600; 
                margin-right: 0.5rem; 
                color: #333;
            }
            #print-ballot .footer-text { 
                margin-top: auto; /* Push to bottom */
                padding-top: 1rem;
                text-align: center; 
                font-style: italic; 
                font-size: 9pt;
                color: #555;
            }

            /* Legal Specifics */
            #print-legal h3 {
                font-size: 14pt;
                font-weight: bold;
                margin-top: 1.5rem;
                margin-bottom: 0.5rem;
                color: #1E40AF;
            }
            #print-legal ol {
                padding-left: 20px;
                list-style-type: decimal;
            }
             #print-legal ol li {
                margin-bottom: 10px;
            }

            /* Cue Card Styles */
            #print-cue-cards {
                width: 100%;
                margin: 0 auto;
            }
            .cue-card-header { 
                font-size: 22pt; 
                text-align: center; 
                margin-bottom: 1.5rem; 
                font-weight: bold;
                page-break-after: avoid;
            }
            .cue-card-day-section { 
                page-break-before: always; 
            }
            .cue-card-day-section:first-of-type {
                page-break-before: auto;
            }
            .day-title { 
                font-size: 18pt; 
                font-weight: bold; 
                border-bottom: 2px solid #000; 
                padding-bottom: 0.5rem; 
                margin-bottom: 1rem; 
                page-break-after: avoid;
            }
            .card-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 1cm; 
            }
            .cue-card { 
                border: 1px solid #aaa; 
                padding: 0.75cm; 
                border-radius: 8px;
                height: 8cm;
                background-color: #fdfdfd;
                display: flex; 
                flex-direction: column; 
                justify-content: space-between; 
                page-break-inside: avoid;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .cue-card-text { 
                font-size: 14pt; 
                line-height: 1.5;
                flex-grow: 1;
            }
            .cue-card-footer {
                font-size: 8pt; 
                color: #777; 
                text-align: right;
                border-top: 1px dashed #ccc;
                padding-top: 0.25cm;
                margin-top: 0.5cm;
                text-transform: uppercase;
            }
        }
      `}</style>
    </>
  );
};

export default Materials;