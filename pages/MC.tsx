
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import { mentions, Mention } from '../lib/content';
import type { MentionLog } from '../types';
import Card from '../components/Card';

// Helper to get current day based on event dates
const getCurrentEventDay = () => {
  const today = new Date().getUTCDate();
  const eventDays = Object.keys(mentions).map(Number);
  // Return the first event day that matches today, or the first day of the event as a default
  return eventDays.find(d => d === today) || eventDays[0];
};

// CueCard Component
interface CueCardProps {
  mention: Mention;
  isTold: boolean;
  onMarkAsTold: () => Promise<void>;
}

const CueCard: React.FC<CueCardProps> = ({ mention, isTold, onMarkAsTold }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await onMarkAsTold();
    setLoading(false);
  };

  return (
    <Card className={`transition-all duration-300 ${isTold ? 'bg-slate-800/50 opacity-60' : 'bg-slate-800'}`}>
      <p className="text-slate-300 mb-4 min-h-[60px]">{mention.text}</p>
      <button
        onClick={handleClick}
        disabled={isTold || loading}
        className="w-full rounded-lg bg-primary-600 py-2 font-semibold text-white hover:bg-primary-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all"
      >
        {isTold ? 'Contada ✔' : (loading ? 'Guardando...' : 'Marcar como Contada')}
      </button>
    </Card>
  );
};

// Main MC Page Component
const MC: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<number>(getCurrentEventDay());
  const [toldMentions, setToldMentions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToldMentions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('mentions_log')
        .select('mention_id')
        .eq('event_code', EVENT_CODE)
        .eq('org_id', ORG_UUID)
        .eq('day', selectedDay);

      if (error) throw error;
      
      const toldIds = new Set(data.map((log: any) => log.mention_id));
      setToldMentions(toldIds);
    } catch (err: any) {
        console.error('Error fetching mention logs:', err);
        setError('Failed to load mention history. Please ensure the `mentions_log` table exists.');
    } finally {
        setLoading(false);
    }
  }, [selectedDay]);

  useEffect(() => {
    fetchToldMentions();
  }, [fetchToldMentions]);

  const handleMarkAsTold = async (mention: Mention, slot: 'AM' | 'PM') => {
    if (toldMentions.has(mention.id)) return;

    const payload: Omit<MentionLog, 'id' | 'created_at'> = {
      org_id: ORG_UUID,
      event_code: EVENT_CODE,
      day: selectedDay,
      slot,
      mention_id: mention.id,
      type: mention.type,
    };

    const { error } = await supabase.from('mentions_log').insert([payload]);

    if (error) {
      console.error('Error saving mention log:', error);
      alert('Could not save mention. Please check the console.');
    } else {
      setToldMentions(prev => new Set(prev).add(mention.id));
    }
  };

  const dayMentions = useMemo(() => mentions[selectedDay], [selectedDay]);
  const allMentionsForDay = useMemo(() => {
      if (!dayMentions) return [];
      return [...dayMentions.AM, ...dayMentions.PM, ...dayMentions.MICRO];
  }, [dayMentions]);
  
  const toldCount = toldMentions.size;
  const totalCount = allMentionsForDay.length;

  const renderSection = (title: string, sectionMentions: Mention[], slot: 'AM' | 'PM') => (
    <div>
      <h2 className="text-2xl font-bold text-primary-400 mb-4 border-b-2 border-primary-500/50 pb-2">{title}</h2>
      {sectionMentions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sectionMentions.map(m => (
            <CueCard
              key={m.id}
              mention={m}
              isTold={toldMentions.has(m.id)}
              onMarkAsTold={() => handleMarkAsTold(m, slot)}
            />
          ))}
        </div>
      ) : <p className="text-slate-400">No mentions for this period.</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-white">MC Cue Cards</h1>
          <p className="text-slate-400 mt-2">Guión y registro de menciones en vivo.</p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(Number(e.target.value))}
            className="input bg-slate-800"
          >
            {Object.keys(mentions).map(day => (
              <option key={day} value={day}>Día {day}</option>
            ))}
          </select>
          <div className="bg-slate-800 rounded-lg px-4 py-2 text-center">
              <p className="text-2xl font-bold text-white">{toldCount} / {totalCount}</p>
              <p className="text-xs text-slate-400 uppercase">Menciones Contadas</p>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center p-8">Loading mentions...</div>
      ) : error ? (
        <div className="text-center p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">{error}</div>
      ) : (
        <div className="space-y-12">
          {renderSection('Menciones AM', dayMentions.AM, 'AM')}
          {renderSection('Menciones PM', dayMentions.PM, 'PM')}
          {/* For logging purposes, micro-mentions can be associated with either slot. 'AM' is used as a default. */}
          {renderSection('Micro-Menciones (cualquier momento)', dayMentions.MICRO, 'AM')} 
        </div>
      )}
    </div>
  );
};

export default MC;
