import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import { mentions, Mention } from '../lib/content';
import type { MentionLog } from '../types';
import Card from '../components/Card';

const getCurrentEventDay = () => {
  const today = new Date().getUTCDate();
  const eventDays = Object.keys(mentions).map(Number);
  return eventDays.find(d => d === today) || eventDays[0];
};

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
    <Card className={`transition-all duration-300 ${isTold ? 'bg-gray-100 dark:bg-gray-800/50 opacity-60' : 'bg-white dark:bg-gray-900'}`}>
      <p className="text-gray-600 dark:text-gray-300 mb-4 min-h-[60px]">{mention.text}</p>
      <button
        onClick={handleClick}
        disabled={isTold || loading}
        className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
      >
        {isTold ? 'Contada ✔' : (loading ? 'Guardando...' : 'Marcar como Contada')}
      </button>
    </Card>
  );
};

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
      
      // Fix: Correctly typed the 'log' object from Supabase data.
      // This ensures that `data.map` returns a `string[]`, allowing `new Set` to infer the
      // correct `Set<string>` type, which matches the state's type definition.
      const toldIds = new Set(data.map((log: { mention_id: string }) => log.mention_id));
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
      <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4 border-b-2 border-blue-500/50 pb-2">{title}</h2>
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
      ) : <p className="text-gray-500 dark:text-gray-400">No mentions for this period.</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">MC Cue Cards</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Guión y registro de menciones en vivo.</p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(Number(e.target.value))}
            className="input bg-white dark:bg-gray-800"
          >
            {Object.keys(mentions).map(day => (
              <option key={day} value={day}>Día {day}</option>
            ))}
          </select>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{toldCount} / {totalCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Menciones Contadas</p>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center p-8">Loading mentions...</div>
      ) : error ? (
        <div className="text-center p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">{error}</div>
      ) : (
        <div className="space-y-12">
          {renderSection('Menciones AM', dayMentions.AM, 'AM')}
          {renderSection('Menciones PM', dayMentions.PM, 'PM')}
          {renderSection('Micro-Menciones (cualquier momento)', dayMentions.MICRO, 'AM')} 
        </div>
      )}
    </div>
  );
};

export default MC;
