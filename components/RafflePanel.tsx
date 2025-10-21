import React, { useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE, ORG_UUID, EVENT_DATES } from '../lib/config';
import type { Lead } from '../types';
import Card from './Card';

interface RafflePanelProps {
  onRaffleDrawn: () => void;
}

const RafflePanel: React.FC<RafflePanelProps> = ({ onRaffleDrawn }) => {
  const [prize, setPrize] = useState('');
  // Get unique days from the config
  const eventDays = useMemo(() => {
    const dates = EVENT_DATES.split(',').map(d => new Date(d.trim()).getUTCDate());
    return [...new Set(dates)].sort((a,b)=> a-b);
  }, []);
  const [selectedDay, setSelectedDay] = useState<number>(eventDays[0] || 0);

  const [winner, setWinner] = useState<Lead | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'drawn'>('idle');
  const [copied, setCopied] = useState(false);

  const handleDrawWinner = async () => {
    if (!prize.trim() || !selectedDay) {
      setError('Please provide a prize name and select a day.');
      return;
    }

    setIsDrawing(true);
    setError(null);

    try {
      // 1. Fetch eligible leads for the selected day
      const { data: leads, error: fetchError } = await supabase
        .from('leads')
        .select('id, name, company, whatsapp')
        .eq('event_code', EVENT_CODE)
        .eq('org_id', ORG_UUID)
        .eq('day', selectedDay);
      
      if (fetchError) throw fetchError;

      if (!leads || leads.length === 0) {
        throw new Error(`No leads found for day ${selectedDay}.`);
      }

      // 2. Select a random winner
      const randomWinner = leads[Math.floor(Math.random() * leads.length)];
      setWinner(randomWinner as Lead);

      // 3. Save the raffle result to the database
      const { error: insertError } = await supabase.from('raffles').insert({
        org_id: ORG_UUID,
        event_code: EVENT_CODE,
        day: selectedDay,
        prize: prize.trim(),
        winner_lead_id: randomWinner.id,
        drawn_at: new Date().toISOString(),
        status: 'Drawn',
      });

      if (insertError) throw insertError;
      
      // 4. Update UI and notify parent
      setStatus('drawn');
      onRaffleDrawn();

    } catch (err: any) {
      console.error("Error drawing winner:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsDrawing(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!winner) return;
    const message = `¡Felicidades ${winner.name}! 🥳 Has ganado "${prize}" en el sorteo de Arenal Conagui. ¡Por favor acércate a nuestro stand para reclamarlo! Gracias por participar.`;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const resetPanel = () => {
      setStatus('idle');
      setWinner(null);
      setPrize('');
      setError(null);
  }

  if (status === 'drawn' && winner) {
    return (
        <Card className="animate-fade-in">
             <h2 className="text-2xl font-bold text-center text-primary-400 mb-4">We have a winner!</h2>
             <div className="text-center bg-slate-700/50 p-6 rounded-lg">
                <p className="text-slate-300">Congratulations to</p>
                <p className="text-3xl font-bold text-white my-2">{winner.name}</p>
                <p className="text-lg text-slate-400">{winner.company}</p>
                <p className="mt-4 text-slate-300">They've won:</p>
                <p className="text-2xl font-semibold text-primary-400">{prize}</p>
             </div>

            <div className="mt-6">
                <h3 className="text-md font-semibold text-slate-200">Notify Winner via WhatsApp</h3>
                <p className="text-xs text-slate-400 mb-2">Legal text: The prize must be claimed in person within 1 hour of notification.</p>
                <textarea 
                    readOnly 
                    className="w-full bg-slate-900 rounded-md p-2 text-sm text-slate-300 h-24 border border-slate-600"
                    value={`¡Felicidades ${winner.name}! 🥳 Has ganado "${prize}" en el sorteo de Arenal Conagui. ¡Por favor acércate a nuestro stand para reclamarlo! Gracias por participar.`}
                />
                 <button onClick={handleCopyToClipboard} className="w-full mt-2 rounded-lg bg-slate-600 py-2 text-sm font-semibold text-white hover:bg-slate-500 transition-all">
                    {copied ? 'Copied!' : 'Copy WhatsApp Message'}
                </button>
            </div>
             <button onClick={resetPanel} className="w-full mt-4 rounded-lg bg-primary-600 py-2 font-semibold text-white hover:bg-primary-700 transition-all">
                Start New Raffle
            </button>
        </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-xl font-bold text-primary-400 mb-4">Conduct a New Raffle</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="prize" className="block text-sm font-medium text-slate-300 mb-1">
            Prize Name
          </label>
          <input
            id="prize"
            type="text"
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            placeholder="e.g., Dinner for Two"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="day" className="block text-sm font-medium text-slate-300 mb-1">
            Draw from Leads of Day
          </label>
          <select 
            id="day"
            value={selectedDay}
            onChange={(e) => setSelectedDay(Number(e.target.value))}
            className="input"
          >
            {eventDays.map(day => (
                <option key={day} value={day}>Day {day}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleDrawWinner}
          disabled={isDrawing || !prize}
          className="w-full rounded-lg bg-primary-600 py-3 font-semibold text-white hover:bg-primary-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all flex items-center justify-center"
        >
          {isDrawing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Drawing Winner...
            </>
          ) : (
            '🎉 Draw Winner!'
          )}
        </button>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
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
