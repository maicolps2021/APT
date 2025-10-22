
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE, ORG_UUID, EVENT_DATES } from '../lib/config';
import type { Lead } from '../types';
import Card from '../components/Card';
import { getDayRange } from '../lib/utils';
import { Calendar, Clock, User, Building } from 'lucide-react';

const Meetings: React.FC = () => {
  const eventDates = useMemo(() => EVENT_DATES.split(',').map(d => new Date(d.trim())), []);
  const [selectedDate, setSelectedDate] = useState<Date>(eventDates[0] || new Date());
  const [meetings, setMeetings] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const { startISO, endISO } = getDayRange(date);

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('event_code', EVENT_CODE)
        .eq('org_id', ORG_UUID)
        .gte('meeting_at', startISO)
        .lt('meeting_at', endISO)
        .order('meeting_at', { ascending: true });

      if (error) throw error;
      setMeetings(data as Lead[]);
    } catch (err: any) {
      console.error("Error fetching meetings:", err);
      setError("Failed to load meetings. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings(selectedDate);
  }, [selectedDate, fetchMeetings]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Scheduled Meetings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">View all appointments for the event.</p>
        </div>
        <div className="flex items-center gap-2 mt-4 md:mt-0 p-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
          {eventDates.map(date => {
            const day = date.getUTCDate();
            return (
              <button
                key={day}
                onClick={() => setSelectedDate(date)}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                  selectedDate.getUTCDate() === day
                    ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Day {day}
              </button>
            )
          })}
        </div>
      </div>

      <Card>
        {loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400 p-8">Loading meetings...</p>
        ) : error ? (
          <p className="text-center text-red-500 p-8">{error}</p>
        ) : meetings.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No meetings scheduled</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              There are no meetings scheduled for this day.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {meetings.map(lead => (
              <li key={lead.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <p className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <User size={18} /> {lead.name}
                    </p>
                    {lead.company && (
                        <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2 mt-1">
                            <Building size={16} /> {lead.company}
                        </p>
                    )}
                  </div>
                  {lead.meeting_at && (
                    <div className="mt-2 sm:mt-0 flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-full text-sm font-semibold">
                      <Clock size={16} />
                      <span>
                        {new Date(lead.meeting_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </div>
                {lead.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">{lead.notes}</p>
                    </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default Meetings;
