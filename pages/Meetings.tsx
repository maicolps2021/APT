
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE, ORG_UUID, EVENT_DATES } from '../lib/config';
import type { Lead } from '../types';
import Card from '../components/Card';
import { getDayRange } from '../lib/utils';
import { RefreshCw, Calendar, Clock, LoaderCircle, UserPlus } from 'lucide-react';

interface ScheduleMeetingFormProps {
    leads: Lead[];
    selectedDate: Date;
    onMeetingScheduled: () => void;
}

const ScheduleMeetingForm: React.FC<ScheduleMeetingFormProps> = ({ leads, selectedDate, onMeetingScheduled }) => {
    const [selectedLeadId, setSelectedLeadId] = useState('');
    const [meetingTime, setMeetingTime] = useState('09:00');
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLeadId || !meetingTime) {
            setFormError('Please select a lead and a time.');
            return;
        }

        setIsSaving(true);
        setFormError(null);

        try {
            const [hours, minutes] = meetingTime.split(':').map(Number);
            const meetingDate = new Date(selectedDate);
            meetingDate.setUTCHours(hours, minutes, 0, 0);
            
            const { error } = await supabase
                .from('leads')
                .update({ 
                    meeting_at: meetingDate.toISOString(),
                    next_step: 'Reunion'
                })
                .eq('id', selectedLeadId);

            if (error) throw error;
            
            // Reset form and refresh parent data
            setSelectedLeadId('');
            setMeetingTime('09:00');
            onMeetingScheduled();

        } catch (err: any) {
            console.error("Error scheduling meeting:", err);
            setFormError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">Schedule a Meeting</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="lead" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                        Lead
                    </label>
                    <select
                        id="lead"
                        value={selectedLeadId}
                        onChange={(e) => setSelectedLeadId(e.target.value)}
                        className="input"
                        required
                    >
                        <option value="" disabled>Select a lead...</option>
                        {leads.length > 0 ? (
                            leads.map(lead => (
                                <option key={lead.id} value={lead.id}>
                                    {lead.name} ({lead.company || 'N/A'})
                                </option>
                            ))
                        ) : (
                            <option disabled>No leads available to schedule</option>
                        )}
                    </select>
                </div>
                <div>
                    <label htmlFor="time" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                        Time
                    </label>
                    <input
                        id="time"
                        type="time"
                        value={meetingTime}
                        onChange={(e) => setMeetingTime(e.target.value)}
                        className="input"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isSaving || !selectedLeadId}
                    className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                >
                    {isSaving ? (
                        <>
                            <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                            Scheduling...
                        </>
                    ) : (
                        <>
                            <UserPlus className="mr-2 h-5 w-5" />
                            Schedule Meeting
                        </>
                    )}
                </button>
                {formError && <p className="text-red-500 text-sm text-center">{formError}</p>}
            </form>
        </Card>
    );
};


const Meetings: React.FC = () => {
    const [scheduledLeads, setScheduledLeads] = useState<Lead[]>([]);
    const [unscheduledLeads, setUnscheduledLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const eventDates = useMemo(() => {
        return EVENT_DATES.split(',').map(d => new Date(d.trim() + 'T00:00:00.000Z'));
    }, []);

    const [selectedDate, setSelectedDate] = useState<Date>(eventDates[0]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('event_code', EVENT_CODE)
                .eq('org_id', ORG_UUID)
                .order('name', { ascending: true });

            if (error) throw error;
            
            const allLeads = data as Lead[];
            setScheduledLeads(allLeads.filter(lead => !!lead.meeting_at));
            setUnscheduledLeads(allLeads.filter(lead => !lead.meeting_at));

        } catch (err: any) {
            console.error("Error fetching meetings data:", err);
            setError("Failed to load meeting data. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const meetingsForSelectedDay = useMemo(() => {
        if (!selectedDate) return [];
        const { startISO, endISO } = getDayRange(selectedDate);
        return scheduledLeads
            .filter(lead => lead.meeting_at && lead.meeting_at >= startISO && lead.meeting_at < endISO)
            .sort((a, b) => new Date(a.meeting_at!).getTime() - new Date(b.meeting_at!).getTime());
    }, [selectedDate, scheduledLeads]);

    return (
        <div className="mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Meetings</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Schedule and view meetings with leads.</p>
                </div>
                <button 
                    onClick={fetchData} 
                    disabled={loading}
                    className="mt-4 md:mt-0 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:bg-gray-200 dark:disabled:bg-gray-900 disabled:cursor-not-allowed transition-all"
                >
                  <RefreshCw className={`mr-2 h-5 w-5 ${loading ? 'animate-spin': ''}`} />
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>
            
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
                {eventDates.map(date => (
                    <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                            selectedDate.getTime() === date.getTime()
                                ? 'bg-blue-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                        {date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', timeZone: 'UTC' })}
                    </button>
                ))}
            </div>

            {loading && <div className="text-center p-8 text-gray-500 dark:text-gray-400">Loading meeting data...</div>}
            {error && <div className="text-center p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">{error}</div>}
            
            {!loading && !error && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ScheduleMeetingForm leads={unscheduledLeads} selectedDate={selectedDate} onMeetingScheduled={fetchData} />
                    
                    <Card>
                        <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                            <Calendar size={20} />
                            <span>Meetings for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}</span>
                        </h2>
                        {meetingsForSelectedDay.length > 0 ? (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                {meetingsForSelectedDay.map(lead => (
                                    <div key={lead.id} className="bg-gray-100 dark:bg-gray-800/50 p-3 rounded-lg flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                                            <Clock size={16} />
                                            <span>{new Date(lead.meeting_at!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })}</span>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">{lead.name}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">{lead.company}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center h-full py-16">
                                <p className="text-gray-500 dark:text-gray-400">No meetings scheduled for this day.</p>
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Meetings;
