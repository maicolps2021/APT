import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import { getDayRange } from '../lib/utils';
import type { Lead } from '../types';
import Card from '../components/Card';

// Type for the leads used in autocomplete, to avoid fetching all data
type AutocompleteLead = Pick<Lead, 'id' | 'name' | 'company'>;

// FIX: Define a specific type for meeting data to match the partial data fetched from Supabase.
// This resolves type errors throughout the component by ensuring `meetings` state is strongly typed.
type MeetingLead = Pick<Lead, 'id' | 'name' | 'company' | 'whatsapp' | 'email' | 'meeting_at' | 'owner'>;

// Generates time slots from 08:30 to 17:00 in 15-min increments
const generateTimeSlots = () => {
  const slots = [];
  const start = 8 * 60 + 30; // 8:30 in minutes
  const end = 17 * 60; // 17:00 in minutes
  for (let minutes = start; minutes < end; minutes += 15) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return slots;
};

// Autocomplete component for finding leads
const LeadAutocomplete: React.FC<{
  leads: AutocompleteLead[];
  onSelect: (lead: AutocompleteLead) => void;
}> = ({ leads, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLeads, setFilteredLeads] = useState<AutocompleteLead[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (searchTerm.length > 1) {
      setFilteredLeads(
        leads.filter(lead =>
          lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.company?.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5) // Limit to 5 suggestions
      );
      setIsOpen(true);
    } else {
      setFilteredLeads([]);
      setIsOpen(false);
    }
  }, [searchTerm, leads]);
  
  const handleSelect = (lead: AutocompleteLead) => {
    onSelect(lead);
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        onFocus={() => { if (searchTerm.length > 1) setIsOpen(true); }}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)} // delay to allow click
        placeholder="Buscar lead por nombre..."
        className="w-full bg-slate-700 text-sm px-2 py-1 rounded-md focus:ring-2 focus:ring-primary-500 focus:outline-none"
      />
      {isOpen && (
        <ul className="absolute z-10 w-full bg-slate-900 border border-slate-600 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
          {filteredLeads.length > 0 ? (
            filteredLeads.map(lead => (
              <li
                key={lead.id}
                onMouseDown={() => handleSelect(lead)}
                className="px-3 py-2 text-sm hover:bg-slate-700 cursor-pointer"
              >
                <p className="font-semibold">{lead.name}</p>
                <p className="text-xs text-slate-400">{lead.company}</p>
              </li>
            ))
          ) : (
             <li className="px-3 py-2 text-sm text-slate-400 italic">
              {leads.length === 0 ? "No leads capturados." : "No se encontraron leads."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
};


const Meetings: React.FC = () => {
  const [owner, setOwner] = useState('Admin');
  const [leads, setLeads] = useState<AutocompleteLead[]>([]);
  // FIX: Use the strongly-typed MeetingLead for the state.
  const [meetings, setMeetings] = useState<Map<string, MeetingLead>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timeSlots = useMemo(() => generateTimeSlots(), []);
  const amSlots = timeSlots.filter(t => parseInt(t.split(':')[0]) < 12);
  const pmSlots = timeSlots.filter(t => parseInt(t.split(':')[0]) >= 12);

  const fetchLeadsAndMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch leads for autocomplete
      // FIX: Corrected syntax for destructuring assignment from '=>' to '='. This was causing a cascade of "Cannot find name" errors.
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('id, name, company')
        .eq('event_code', EVENT_CODE)
        .eq('org_id', ORG_UUID)
        .order('created_at', { ascending: false })
        .limit(200);

      if (leadError) throw leadError;
      setLeads(leadData || []);

      // Fetch today's meetings using UTC date range
      const { startISO, endISO } = getDayRange(new Date());

      const { data: meetingData, error: meetingError } = await supabase
        .from('leads')
        .select('id,name,company,whatsapp,email,meeting_at,owner')
        .eq('event_code', EVENT_CODE)
        .eq('org_id', ORG_UUID)
        .gte('meeting_at', startISO)
        .lt('meeting_at', endISO)
        .order('meeting_at', { ascending: true });

      if (meetingError) throw meetingError;
      
      // FIX: Use the strongly-typed MeetingLead for the map.
      const meetingsMap = new Map<string, MeetingLead>();
      if (meetingData) {
        // FIX: Directly cast the fetched data to MeetingLead[] for type safety.
        for (const lead of (meetingData as MeetingLead[])) {
          if (lead.meeting_at) {
            // Display time is converted from UTC to local for the user
            const time = new Date(lead.meeting_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            meetingsMap.set(time, lead);
          }
        }
      }
      setMeetings(meetingsMap);

    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError("Failed to load meeting data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeadsAndMeetings();
  }, [fetchLeadsAndMeetings]);

  const assignMeeting = async (time: string, lead: AutocompleteLead) => {
    if (!owner.trim()) {
      alert('Please enter an owner name.');
      return;
    }

    if (meetings.has(time)) {
      alert('This slot is already booked.');
      return;
    }

    // Fix: Add explicit type for 'm' to resolve type inference issue.
    const existingMeeting = Array.from(meetings.values()).find((m: MeetingLead) => m.id === lead.id);
    if (existingMeeting && existingMeeting.meeting_at) {
      alert(`${lead.name} already has a meeting at ${new Date(existingMeeting.meeting_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
      return;
    }

    // Create a UTC timestamp for the meeting slot on the current date
    const meetingDate = new Date();
    const [hours, minutes] = time.split(':');
    meetingDate.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
    const slotISO = meetingDate.toISOString();

    // Perform the update without .select() to avoid RLS issues on read-after-write
    const { error } = await supabase
      .from('leads')
      .update({
        owner: owner,
        next_step: 'Reunion',
        meeting_at: slotISO,
      })
      .eq('id', lead.id)
      .eq('event_code', EVENT_CODE)
      .eq('org_id', ORG_UUID);

    if (error) {
      console.error('Error assigning meeting:', error);
      alert(`Failed to schedule meeting: ${error.message}`);
    } else {
      // Optimistically update the local state.
      // This is safe because if the update failed, the `error` object would be populated.
      // An empty response without an error usually means RLS prevented the SELECT part of the query.
      const newMeetingData: MeetingLead = {
        id: lead.id,
        name: lead.name,
        company: lead.company,
        meeting_at: slotISO,
        owner: owner,
        whatsapp: undefined, // Not available in AutocompleteLead
        email: undefined,    // Not available in AutocompleteLead
      };
      setMeetings(prev => new Map(prev).set(time, newMeetingData));
    }
  };
  
  const handlePrint = () => {
      window.print();
  };
  
  // FIX: Explicitly type sort callback parameters to fix 'unknown' type error.
  const meetingsArray: MeetingLead[] = Array.from(meetings.values());
  const sortedMeetings = meetingsArray.sort((a: MeetingLead, b: MeetingLead) => {
      if (!a.meeting_at || !b.meeting_at) return 0;
      return new Date(a.meeting_at).getTime() - new Date(b.meeting_at).getTime();
  });
  
  const now = new Date();
  const nextMeetingIndex = sortedMeetings.findIndex(lead => lead.meeting_at && new Date(lead.meeting_at) > now);

  if (loading) return <div className="text-center p-8">Loading schedule...</div>;
  if (error) return <div className="text-center p-4 bg-red-900/50 text-red-300 rounded-lg">{error}</div>;

  if (!loading && leads.length === 0) {
    return (
      <div className="text-center p-8 max-w-2xl mx-auto">
        <div className="text-center md:text-left mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Meeting Scheduler</h1>
          <p className="text-slate-400 mt-2">Book 15-minute slots for {new Date().toLocaleDateString()}.</p>
        </div>
        <Card>
          <h2 className="text-xl font-bold text-primary-400 mb-4">No Leads Captured Yet</h2>
          <p className="text-slate-300 mb-6">You need to capture at least one lead before you can start scheduling meetings.</p>
          <a href="#/capture" className="inline-block rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700 transition-all">
            Go to Lead Capture
          </a>
        </Card>
      </div>
    );
  }

  return (
    <>
    <div className="mx-auto max-w-7xl" id="meetings-page">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Meeting Scheduler</h1>
          <p className="text-slate-400 mt-2">Book 15-minute slots for {new Date().toLocaleDateString()}.</p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <input 
            type="text"
            value={owner}
            onChange={e => setOwner(e.target.value)}
            placeholder="Owner Name"
            className="input"
          />
          <button onClick={handlePrint} className="flex-shrink-0 rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600 transition-all">
            Print Agenda
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Slots Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
          <div>
            <h2 className="text-2xl font-bold text-primary-400 mb-4 border-b-2 border-primary-500/50 pb-2">AM</h2>
            <div className="space-y-2">
              {amSlots.map(time => (
                <div key={time} className="grid grid-cols-[auto,1fr] items-center gap-3 p-2 rounded-md transition-colors hover:bg-slate-800">
                  <span className="font-mono text-slate-400 text-sm">{time}</span>
                  {meetings.has(time) ? (
                    <div className="bg-primary-900/50 p-2 rounded-md text-sm">
                      <p className="font-semibold text-white">{meetings.get(time)!.name}</p>
                      <p className="text-xs text-slate-300">{meetings.get(time)!.company}</p>
                    </div>
                  ) : (
                    <LeadAutocomplete leads={leads} onSelect={(lead) => assignMeeting(time, lead)} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary-400 mb-4 border-b-2 border-primary-500/50 pb-2">PM</h2>
             <div className="space-y-2">
              {pmSlots.map(time => (
                <div key={time} className="grid grid-cols-[auto,1fr] items-center gap-3 p-2 rounded-md transition-colors hover:bg-slate-800">
                  <span className="font-mono text-slate-400 text-sm">{time}</span>
                  {meetings.has(time) ? (
                    <div className="bg-primary-900/50 p-2 rounded-md text-sm">
                      <p className="font-semibold text-white">{meetings.get(time)!.name}</p>
                      <p className="text-xs text-slate-300">{meetings.get(time)!.company}</p>
                    </div>
                  ) : (
                    <LeadAutocomplete leads={leads} onSelect={(lead) => assignMeeting(time, lead)} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agenda Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24" id="print-agenda-container">
            <Card>
                <div id="print-agenda">
                <h2 className="text-2xl font-bold text-white mb-1">Today's Agenda</h2>
                <p className="text-sm text-slate-400 mb-6">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                    {sortedMeetings.length > 0 ? sortedMeetings.map((lead: MeetingLead, index) => {
                      const isNext = index === nextMeetingIndex;
                      const waLink = lead.whatsapp ? `https://wa.me/${lead.whatsapp.replace(/\D/g, "")}` : '';
                      
                      return (
                        <div key={lead.id} className="relative pl-8 pb-4">
                          {/* Timeline line - don't draw for the last item */}
                          {index < sortedMeetings.length - 1 && 
                            <div className="absolute left-2.5 top-5 h-full w-0.5 bg-slate-600"></div>
                          }
                          {/* Timeline marker */}
                          <div className={`absolute left-0 top-2 h-5 w-5 rounded-full border-4 border-slate-800 ${isNext ? 'bg-primary-500 ring-4 ring-primary-500/30' : 'bg-slate-500'}`}></div>
                          
                          {/* Meeting card */}
                          <div className="relative bg-slate-700/50 p-3 rounded-lg ml-1">
                            <div className="absolute top-2 right-2 flex items-center space-x-2">
                              {lead.whatsapp && (
                                <a href={waLink} target="_blank" rel="noopener noreferrer" title={`WhatsApp ${lead.name}`} className="text-slate-400 hover:text-primary-400 transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.433-9.89-9.889-9.89-5.452 0-9.887 4.428-9.888 9.891.001 2.23.651 4.385 1.886 6.205l.232.392-1.082 3.939 4.032-1.056.377.224z" /></svg>
                                </a>
                              )}
                              {lead.email && (
                                <a href={`mailto:${lead.email}`} title={`Email ${lead.name}`} className="text-slate-400 hover:text-primary-400 transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                                </a>
                              )}
                            </div>
                            <p className={`font-mono text-sm ${isNext ? 'text-primary-300 font-bold' : 'text-primary-400'}`}>{lead.meeting_at ? new Date(lead.meeting_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No Time'}</p>
                            <p className="font-semibold text-white mt-1 pr-8">{lead.name}</p>
                            <p className="text-xs text-slate-300">{lead.company}</p>
                            <p className="text-xs text-slate-400 mt-2">Owner: {lead.owner}</p>
                        </div>
                      </div>
                    )}) : (
                      <p className="text-slate-400 text-center py-8">No meetings scheduled yet.</p>
                    )}
                </div>
                </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
    <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-agenda-container, #print-agenda-container * {
            visibility: visible;
          }
          #print-agenda-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
          }
          #print-agenda-container .bg-slate-800 {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          #print-agenda h2, #print-agenda p, #print-agenda span {
              color: black !important;
          }
          #print-agenda .bg-slate-700\\/50 {
              background-color: #f3f4f6 !important;
              border: 1px solid #d1d5db;
          }
        }
    `}</style>
    </>
  );
};

export default Meetings;