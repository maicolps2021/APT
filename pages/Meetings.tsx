
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import type { Lead } from '../types';
import { RefreshCw, Clock, Save, UserCheck } from 'lucide-react';

const LeadMeetingCard: React.FC<{lead: Lead, onUpdate: () => void}> = ({ lead, onUpdate }) => {
    const [meetingTime, setMeetingTime] = useState(lead.meeting_at ? lead.meeting_at.slice(0, 16) : '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        
        const updatePayload: Partial<Lead> = {
            meeting_at: meetingTime ? new Date(meetingTime).toISOString() : undefined,
        };

        if (meetingTime) {
            updatePayload.next_step = 'Reunion';
        }

        const { error } = await supabase
            .from('leads')
            .update(updatePayload)
            .eq('id', lead.id);

        if (error) {
            console.error('Error updating meeting:', error);
            setError('Failed to save. Please try again.');
        } else {
            onUpdate(); // Trigger a refresh of the list
        }
        setIsSaving(false);
    };

    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-lg text-gray-900 dark:text-white">{lead.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{lead.company}</p>
                </div>
                {lead.meeting_at && (
                    <div className="flex items-center gap-2 text-xs font-semibold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                        <UserCheck size={14} />
                        <span>Agendada</span>
                    </div>
                )}
            </div>
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
                <div className="relative w-full">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="datetime-local"
                        value={meetingTime}
                        onChange={(e) => setMeetingTime(e.target.value)}
                        className="input pl-10 w-full"
                    />
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 transition-all"
                >
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
    );
};


const Meetings: React.FC = () => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('event_code', EVENT_CODE)
                .eq('org_id', ORG_UUID)
                .order('meeting_at', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeads(data as Lead[]);
        } catch (err: any) {
            console.error("Error fetching leads for meetings:", err);
            setError("Failed to load leads. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const scheduledLeads = leads.filter(l => l.meeting_at);
    const unscheduledLeads = leads.filter(l => !l.meeting_at);

    return (
        <div className="mx-auto max-w-4xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Meeting Scheduler</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Schedule and manage meetings with leads.</p>
                </div>
                <button
                    onClick={fetchLeads}
                    disabled={loading}
                    className="mt-4 md:mt-0 flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:bg-gray-200 dark:disabled:bg-gray-900 disabled:cursor-not-allowed transition-all"
                >
                    <RefreshCw className={`mr-2 h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {loading && <div className="text-center p-8 text-gray-500 dark:text-gray-400">Loading leads...</div>}
            {error && <div className="text-center p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">{error}</div>}
            
            {!loading && !error && (
                <div className="space-y-8">
                    <div>
                        <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4 border-b-2 border-blue-500/50 pb-2">Scheduled Meetings ({scheduledLeads.length})</h2>
                        {scheduledLeads.length > 0 ? (
                            <div className="space-y-4">
                                {scheduledLeads.map(lead => <LeadMeetingCard key={lead.id} lead={lead} onUpdate={fetchLeads} />)}
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400">No meetings have been scheduled yet.</p>
                        )}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-600 dark:text-gray-400 mb-4 border-b-2 border-gray-500/50 pb-2">Unscheduled Leads ({unscheduledLeads.length})</h2>
                        {unscheduledLeads.length > 0 ? (
                            <div className="space-y-4">
                                {unscheduledLeads.map(lead => <LeadMeetingCard key={lead.id} lead={lead} onUpdate={fetchLeads} />)}
                            </div>
                        ) : (
                             <p className="text-gray-500 dark:text-gray-400">All leads have a scheduled meeting or there are no leads.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Meetings;
