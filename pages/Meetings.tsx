import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE, ORG_UUID, EVENT_DATES } from '../lib/config';
import type { Lead } from '../types';
import { getDayRange } from '../lib/utils';
import { X, Calendar as CalendarIcon, Clock, User, Check, Search, RefreshCw, Plus } from 'lucide-react';

type MeetingLead = Pick<Lead, 'id' | 'name' | 'company' | 'owner' | 'meeting_at'>;

const generateTimeSlots = () => {
  const slots: string[] = [];
  // From 8:30 AM to 4:00 PM
  for (let hour = 8; hour <= 16; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === 8 && minute < 30) continue;
      if (hour === 16 && minute > 0) continue;
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      slots.push(time);
    }
  }
  return slots;
};

const TimeSlotCard: React.FC<{
  time: string;
  meeting: MeetingLead | undefined;
  unscheduledLeads: Lead[];
  onSchedule: (leadId: string, owner: string, time: string) => Promise<boolean>;
  onCancel: (leadId: string) => Promise<void>;
}> = ({ time, meeting, unscheduledLeads, onSchedule, onCancel }) => {
  const [isScheduling, setIsScheduling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [owner, setOwner] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return unscheduledLeads.filter(lead =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [searchTerm, unscheduledLeads]);

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setSearchTerm('');
  };

  const handleConfirmSchedule = async () => {
    if (!selectedLead || !owner) return;
    setIsSaving(true);
    const success = await onSchedule(selectedLead.id, owner, time);
    setIsSaving(false);
    if (success) {
      resetState();
    }
  };

  const handleCancelMeeting = async () => {
      if(meeting && window.confirm(`Are you sure you want to cancel the meeting with ${meeting.name}?`)) {
          await onCancel(meeting.id);
      }
  };

  const resetState = () => {
    setIsScheduling(false);
    setSearchTerm('');
    setSelectedLead(null);
    setOwner('');
  };
  
  const cardBaseClasses = "w-full text-left p-2 rounded-lg transition-all duration-200 min-h-[72px] flex flex-col justify-center";

  if (meeting) {
    return (
      <div className={`${cardBaseClasses} bg-blue-600 text-white shadow-md`}>
        <div className="flex items-start justify-between">
            <div>
                <p className="font-bold text-sm">{meeting.name}</p>
                <p className="text-xs text-blue-200">{meeting.company}</p>
                <p className="text-xs text-blue-200 mt-1 flex items-center gap-1"><User size={10}/> {meeting.owner}</p>
            </div>
            <button onClick={handleCancelMeeting} className="p-1 text-blue-200 hover:text-white rounded-full hover:bg-white/20">
              <X size={14} />
            </button>
        </div>
      </div>
    );
  }

  if (isScheduling) {
    return (
      <div className={`${cardBaseClasses} bg-white dark:bg-gray-800 shadow-lg border border-gray-300 dark:border-gray-700`}>
        {selectedLead ? (
          <div className="space-y-2 animate-fade-in-fast">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedLead.name}</p>
            <input
              type="text"
              placeholder="Meeting owner..."
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="input text-sm py-1"
            />
            <div className="flex gap-2">
              <button onClick={handleConfirmSchedule} disabled={isSaving || !owner} className="w-full text-xs rounded bg-blue-600 py-1 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500">
                {isSaving ? 'Saving...' : 'Confirm'}
              </button>
              <button onClick={resetState} className="w-full text-xs rounded bg-gray-300 dark:bg-gray-600 py-1 font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-400">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="relative animate-fade-in-fast">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search for lead..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input text-sm py-1 pl-8"
              autoFocus
            />
            {searchResults.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {searchResults.map(lead => (
                  <li key={lead.id} onClick={() => handleSelectLead(lead)} className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                    {lead.name} <span className="text-xs text-gray-500">{lead.company}</span>
                  </li>
                ))}
              </ul>
            )}
             <button onClick={() => setIsScheduling(false)} className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14}/></button>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsScheduling(true)}
      className={`${cardBaseClasses} items-center bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400`}
    >
      <Plus size={20} />
    </button>
  );
};


const Meetings: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [meetings, setMeetings] = useState<MeetingLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const eventDays = useMemo(() => {
        return EVENT_DATES.split(',').map(d => new Date(d.trim()));
    }, []);
    const [selectedDate, setSelectedDate] = useState<Date>(eventDays[0]);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { startISO, endISO } = getDayRange(selectedDate);

            const { data: leadsData, error: leadsError } = await supabase
                .from('leads')
                .select('id, name, company, owner, meeting_at')
                .eq('event_code', EVENT_CODE)
                .eq('org_id', ORG_UUID);

            if (leadsError) throw leadsError;

            const meetingsForDay = (leadsData as Lead[]).filter(l => 
                l.meeting_at && l.meeting_at >= startISO && l.meeting_at < endISO
            );

            setLeads(leadsData as Lead[]);
            setMeetings(meetingsForDay as MeetingLead[]);
        } catch (err: any) {
            console.error("Error fetching data:", err);
            setError("Failed to load schedule data. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const timeSlots = useMemo(() => generateTimeSlots(), []);
    const meetingsByTime = useMemo(() => {
        return meetings.reduce((acc, meeting) => {
            if (meeting.meeting_at) {
                const time = new Date(meeting.meeting_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
                acc[time] = meeting;
            }
            return acc;
        }, {} as Record<string, MeetingLead>);
    }, [meetings]);

    const unscheduledLeads = useMemo(() => {
        const scheduledIds = new Set(meetings.map(m => m.id));
        return leads.filter(l => !scheduledIds.has(l.id));
    }, [leads, meetings]);

    const handleSchedule = async (leadId: string, owner: string, time: string): Promise<boolean> => {
        const [hour, minute] = time.split(':').map(Number);
        const meetingDate = new Date(selectedDate);
        meetingDate.setUTCHours(hour, minute, 0, 0);
        const meetingISO = meetingDate.toISOString();

        const optimisticMeeting: MeetingLead = {
            id: leadId,
            name: leads.find(l => l.id === leadId)?.name || 'Unknown',
            company: leads.find(l => l.id === leadId)?.company,
            owner: owner,
            meeting_at: meetingISO,
        };

        setMeetings(prev => [...prev.filter(m => m.id !== leadId), optimisticMeeting]);

        const { error } = await supabase
            .from('leads')
            .update({ meeting_at: meetingISO, owner: owner, next_step: 'Reunion' })
            .eq('id', leadId);
        
        if (error) {
            console.error('Failed to schedule:', error);
            alert('Error: Could not save the meeting. The change has been reverted. Please check permissions (RLS) and try again.');
            setMeetings(prev => prev.filter(m => m.id !== leadId));
            return false;
        }
        return true;
    };
    
    const handleCancel = async (leadId: string) => {
        const originalMeeting = meetings.find(m => m.id === leadId);
        if (!originalMeeting) return;

        setMeetings(prev => prev.filter(m => m.id !== leadId));

        const { error } = await supabase
            .from('leads')
            .update({ meeting_at: null, owner: null })
            .eq('id', leadId);
        
        if (error) {
            console.error('Failed to cancel:', error);
            alert('Error: Could not cancel the meeting. The change has been reverted.');
            setMeetings(prev => [...prev, originalMeeting]);
        }
    };
    
    const sortedMeetings = useMemo(() => {
        return [...meetings].sort((a,b) => new Date(a.meeting_at || 0).getTime() - new Date(b.meeting_at || 0).getTime())
    }, [meetings]);

    return (
        <div className="mx-auto max-w-7xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Meeting Scheduler</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Book 15-minute slots for the event.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-1">
                        {eventDays.map(day => (
                            <button
                                key={day.toISOString()}
                                onClick={() => setSelectedDate(day)}
                                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${selectedDate.getUTCDate() === day.getUTCDate()
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                Day {day.getUTCDate()}
                            </button>
                        ))}
                    </div>
                     <button
                        onClick={fetchAllData}
                        disabled={loading}
                        className="flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-2.5 font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

             {loading ? <div className="text-center p-8">Loading schedule...</div> : error ? <div className="text-center p-4 bg-red-100 text-red-700 rounded-lg">{error}</div> :
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Time Slots */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                        <div>
                            <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-3 text-center md:text-left">AM</h2>
                            <div className="space-y-2">
                                {timeSlots.filter(t => parseInt(t.split(':')[0]) < 12).map(time => (
                                    <div key={time} className="flex items-center gap-3">
                                        <span className="w-12 text-right text-sm text-gray-500 dark:text-gray-400">{time}</span>
                                        <TimeSlotCard time={time} meeting={meetingsByTime[time]} unscheduledLeads={unscheduledLeads} onSchedule={handleSchedule} onCancel={handleCancel} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-3 text-center md:text-left">PM</h2>
                            <div className="space-y-2">
                                {timeSlots.filter(t => parseInt(t.split(':')[0]) >= 12).map(time => (
                                    <div key={time} className="flex items-center gap-3">
                                        <span className="w-12 text-right text-sm text-gray-500 dark:text-gray-400">{time}</span>
                                        <TimeSlotCard time={time} meeting={meetingsByTime[time]} unscheduledLeads={unscheduledLeads} onSchedule={handleSchedule} onCancel={handleCancel} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Today's Agenda */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm sticky top-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-1">Agenda for Day {selectedDate.getUTCDate()}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                            {sortedMeetings.length > 0 ? (
                                <ul className="space-y-3 max-h-[60vh] overflow-y-auto">
                                    {sortedMeetings.map(m => (
                                        <li key={m.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                            <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <Clock size={12} /> {m.meeting_at ? new Date(m.meeting_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : 'N/A'}
                                            </p>
                                            <p className="font-semibold text-gray-900 dark:text-white mt-1">{m.name}</p>
                                            <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                <User size={12} /> {m.owner}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-10">
                                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No meetings scheduled</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Use the slots on the left to book appointments.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
             }
             <style>{`
                @keyframes fade-in-fast {
                  0% { opacity: 0; }
                  100% { opacity: 1; }
                }
                .animate-fade-in-fast {
                  animation: fade-in-fast 0.2s ease-out forwards;
                }
             `}</style>
        </div>
    );
};

export default Meetings;