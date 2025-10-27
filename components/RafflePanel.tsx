import React, { useState, useMemo } from 'react';
import { db } from '../lib/supabaseClient'; // Path kept for simplicity, points to Firebase now
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { EVENT_CODE, ORG_UUID, EVENT_DATES } from '../lib/config';
import type { Lead } from '../types';
import Card from './Card';
import { LoaderCircle } from 'lucide-react';
import { hasBuilderBot, sendBuilderBotMessage } from '../services/builderbotService';
import { fetchEligibleLeadsForRaffle } from '../lib/raffles';

interface RafflePanelProps {
  onRaffleDrawn: () => void;
}

const RafflePanel: React.FC<RafflePanelProps> = ({ onRaffleDrawn }) => {
  const [prize, setPrize] = useState('');
  const eventDays = useMemo<number[]>(() => {
    // FIX: Explicitly cast EVENT_DATES to string and ensure map returns numbers to satisfy TS.
    const dates = (EVENT_DATES as string).split(',').map(d => {
        const date = new Date(String(d).trim());
        return date.getUTCDate();
    });
    return [...new Set(dates)].sort((a,b)=> a - b);
  }, []);
  const [selectedDay, setSelectedDay] = useState<number>(eventDays[0] || 0);

  const [winner, setWinner] = useState<Lead | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'drawn'>('idle');
  const [copied, setCopied] = useState(false);
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleDrawWinner = async () => {
    if (!prize.trim() || !selectedDay) {
      setError('Please provide a prize name and select a day.');
      return;
    }

    setIsDrawing(true);
    setError(null);

    try {
      const dateStr = EVENT_DATES.split(',').find(d => d.trim().endsWith(String(selectedDay).padStart(2, '0')));
      if (!dateStr) {
          throw new Error(`Could not find a date for day ${selectedDay} in event configuration.`);
      }
      const raffleDate = new Date(`${dateStr.trim()}T12:00:00Z`);

      const leads = await fetchEligibleLeadsForRaffle({
          orgId: ORG_UUID,
          eventCode: EVENT_CODE,
          date: raffleDate,
      });

      if (leads.length === 0) {
        throw new Error(`No leads found for day ${selectedDay}.`);
      }

      const randomWinner = leads[Math.floor(Math.random() * leads.length)];
      setWinner(randomWinner);

      await addDoc(collection(db, 'raffles'), {
        org_id: ORG_UUID,
        event_code: EVENT_CODE,
        day: selectedDay,
        prize: prize.trim(),
        winner_lead_id: randomWinner.id,
        drawn_at: serverTimestamp(),
        status: 'Drawn',
        tickets_count: leads.length,
        participants_count: leads.length,
      });
      
      setStatus('drawn');
      onRaffleDrawn();

    } catch (err: any) {
      console.error("Error drawing winner:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsDrawing(false);
    }
  };
  
  const getWinnerMessage = () => {
      if(!winner) return "";
      return `¡Felicidades ${winner.name}! 🥳 Has ganado "${prize}" en el sorteo de Arenal Private Tours by Small Groups. ¡Por favor acércate a nuestro stand para reclamarlo! Gracias por participar.`;
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(getWinnerMessage());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleSendWithBuilderBot = async () => {
    if (!winner?.whatsapp) return;
    setSendState('sending');
    try {
        await sendBuilderBotMessage(winner.whatsapp, getWinnerMessage());
        setSendState('sent');
    } catch (error) {
        console.error("BuilderBot error:", error);
        setSendState('error');
    }
  };
  
  const resetPanel = () => {
      setStatus('idle');
      setWinner(null);
      setPrize('');
      setError(null);
      setSendState('idle');
  }

  if (status === 'drawn' && winner) {
    const builderBotButtonText = {
        idle: 'Enviar por BuilderBot',
        sending: 'Enviando...',
        sent: '¡Enviado!',
        error: 'Error, reintentar'
    };
    return (
        <Card className="animate-fade-in">
             <h2 className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400 mb-4">¡Tenemos un ganador!</h2>
             <div className="text-center bg-gray-100 dark:bg-gray-800/50 p-6 rounded-lg">
                <p className="text-gray-600 dark:text-gray-300">Felicitaciones a</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white my-2">{winner.name}</p>
                <p className="text-lg text-gray-500 dark:text-gray-400">{winner.company}</p>
                <p className="mt-4 text-gray-600 dark:text-gray-300">Ganó:</p>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{prize}</p>
             </div>

            <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Notificar al Ganador</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Texto legal: El premio debe ser reclamado en persona en el stand, dentro de 1 hora de la notificación.</p>
                <textarea 
                    readOnly 
                    className="w-full bg-gray-200 dark:bg-gray-900 rounded-md p-2 text-sm text-gray-700 dark:text-gray-300 h-24 border border-gray-300 dark:border-gray-600"
                    value={getWinnerMessage()}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <button onClick={handleCopyToClipboard} className="w-full rounded-lg bg-gray-600 py-2 text-sm font-semibold text-white hover:bg-gray-500 transition-all">
                        {copied ? 'Copiado' : 'Copiar Mensaje WA'}
                    </button>
                    {hasBuilderBot() && winner.whatsapp && (
                         <button 
                            onClick={handleSendWithBuilderBot} 
                            disabled={sendState === 'sending' || sendState === 'sent'}
                            className={`w-full rounded-lg py-2 text-sm font-semibold text-white transition-all ${
                                sendState === 'sent' ? 'bg-green-600' :
                                sendState === 'error' ? 'bg-red-600' :
                                'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500'
                            }`}
                         >
                            {builderBotButtonText[sendState]}
                        </button>
                    )}
                </div>
            </div>
             <button onClick={resetPanel} className="w-full mt-4 rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 transition-all">
                Iniciar Nuevo Sorteo
            </button>
        </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">Realizar Nuevo Sorteo</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="prize" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
            Nombre del Premio
          </label>
          <input
            id="prize"
            type="text"
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            placeholder="Ej: Cena para Dos"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="day" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
            Sortear entre Leads del Día
          </label>
          <select 
            id="day"
            value={selectedDay}
            onChange={(e) => setSelectedDay(Number(e.target.value))}
            className="input"
          >
            {eventDays.map(day => (
                <option key={day} value={day}>Día {day}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleDrawWinner}
          disabled={isDrawing || !prize}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center"
        >
          {isDrawing ? (
            <>
              <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Sorteando Ganador...
            </>
          ) : (
            '🎉 Sortear Ganador'
          )}
        </button>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </div>
       <style>{`
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </Card>
  );
};

export default RafflePanel;