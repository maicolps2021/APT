import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import { getDayRange } from '../lib/utils';
import type { Lead } from '../types';
import Card from '../components/Card';
import { Mail, MessageSquare } from 'lucide-react';

type AutocompleteLead = Pick<Lead, 'id' | 'name' | 'company'>;

type MeetingLead = Pick<Lead, 'id' | 'name' | 'company' | 'whatsapp' | 'email' | 'meeting_at' | 'owner'>;

const generateTimeSlots = () => {
  const slots = [];
  const start = 8 * 60 + 30;
  const end = 17 * 60;
  for (let minutes = start; minutes < end; minutes += 15) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return slots;
};

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
        ).slice(0, 5)
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
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder="Buscar lead por nombre..."
        className="w-full bg-gray-100 dark:bg-gray-700 text-sm px-2 py-1 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
      {isOpen && (
        <ul className="absolute z-10 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
          {filteredLeads.length > 0 ? (
            filteredLeads.map(lead => (
              <li
                key={lead.id}
                onMouseDown={() => handleSelect(lead)}
                className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <p className="font-semibold">{lead.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{lead.company}</p>
              </li>
            ))
          ) : (
             <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 italic">
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
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('id, name, company')
        .eq('event_code', EVENT_CODE)
        .eq('org_id', ORG_UUID)
        .order('created_at', { ascending: false })
        .limit(200);

      if (leadError) throw leadError;
      setLeads(leadData || []);

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
      
      const meetingsMap = new Map<string, MeetingLead>();
      if (meetingData) {
        for (const lead of (meetingData as MeetingLead[])) {
          if (lead.meeting_at) {
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

    const existingMeeting = Array.from(meetings.values()).find((m: MeetingLead) => m.id === lead.id);
    if (existingMeeting && existingMeeting.meeting_at) {
      alert(`${lead.name} already has a meeting at ${new Date(existingMeeting.meeting_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
      return;
    }

    const meetingDate = new Date();
    const [hours, minutes] = time.split(':');
    meetingDate.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
    const slotISO = meetingDate.toISOString();

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
      const newMeetingData: MeetingLead = {
        id: lead.id,
        name: lead.name,
        company: lead.company,
        meeting_at: slotISO,
        owner: owner,
        whatsapp: undefined,
        email: undefined,
      };
      setMeetings(prev => new Map(prev).set(time, newMeetingData));
    }
  };
  
  const handlePrint = () => {
      window.print();
  };
  
  const meetingsArray: MeetingLead[] = Array.from(meetings.values());
  // Fix: Explicitly typing the sort callback parameters `a` and `b` as `MeetingLead` to resolve an error where they were being inferred as `unknown`.
  const sortedMeetings = meetingsArray.sort((a: MeetingLead, b: MeetingLead) => {
      if (!a.meeting_at || !b.meeting_at) return 0;
      return new Date(a.meeting_at).getTime() - new Date(b.meeting_at).getTime();
  });
  
  const now = new Date();
  const nextMeetingIndex = sortedMeetings.findIndex(lead => lead.meeting_at && new Date(lead.meeting_at) > now);

  if (loading) return <div className="text-center p-8">Loading schedule...</div>;
  if (error) return <div className="text-center p-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg">{error}</div>;

  if (!loading && leads.length === 0) {
    return (
      <div className="text-center p-8 max-w-2xl mx-auto">
        <div className="text-center md:text-left mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Meeting Scheduler</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Book 15-minute slots for {new Date().toLocaleDateString()}.</p>
        </div>
        <Card>
          <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">No Leads Captured Yet</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">You need to capture at least one lead before you can start scheduling meetings.</p>
          <a href="#/capture" className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-all">
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
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Meeting Scheduler</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Book 15-minute slots for {new Date().toLocaleDateString()}.</p>
        </div>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <input 
            type="text"
            value={owner}
            onChange={e => setOwner(e.target.value)}
            placeholder="Owner Name"
            className="input"
          />
          <button onClick={handlePrint} className="flex-shrink-0 rounded-lg bg-gray-200 dark:bg-gray-700 px-4 py-3 font-semibold text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
            Print Agenda
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Slots Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
          <div>
            <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4 border-b-2 border-blue-500/50 pb-2">AM</h2>
            <div className="space-y-2">
              {amSlots.map(time => (
                <div key={time} className="grid grid-cols-[auto,1fr] items-center gap-3 p-2 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span className="font-mono text-gray-500 dark:text-gray-400 text-sm">{time}</span>
                  {meetings.has(time) ? (
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md text-sm">
                      <p className="font-semibold text-gray-900 dark:text-white">{meetings.get(time)!.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-300">{meetings.get(time)!.company}</p>
                    </div>
                  ) : (
                    <LeadAutocomplete leads={leads} onSelect={(lead) => assignMeeting(time, lead)} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4 border-b-2 border-blue-500/50 pb-2">PM</h2>
             <div className="space-y-2">
              {pmSlots.map(time => (
                <div key={time} className="grid grid-cols-[auto,1fr] items-center gap-3 p-2 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span className="font-mono text-gray-500 dark:text-gray-400 text-sm">{time}</span>
                  {meetings.has(time) ? (
                     <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md text-sm">
                      <p className="font-semibold text-gray-900 dark:text-white">{meetings.get(time)!.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-300">{meetings.get(time)!.company}</p>
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
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Today's Agenda</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                    {sortedMeetings.length > 0 ? sortedMeetings.map((lead: MeetingLead, index) => {
                      const isNext = index === nextMeetingIndex;
                      const waLink = lead.whatsapp ? `https://wa.me/${lead.whatsapp.replace(/\D/g, "")}` : '';
                      
                      return (
                        <div key={lead.id} className="relative pl-8 pb-4">
                          {index < sortedMeetings.length - 1 && 
                            <div className="absolute left-2.5 top-5 h-full w-0.5 bg-gray-300 dark:bg-gray-600"></div>
                          }
                          <div className={`absolute left-0 top-2 h-5 w-5 rounded-full border-4 border-white dark:border-gray-900 ${isNext ? 'bg-blue-500 ring-4 ring-blue-500/30' : 'bg-gray-500'}`}></div>
                          
                          <div className="relative bg-gray-100 dark:bg-gray-800/50 p-3 rounded-lg ml-1">
                            <div className="absolute top-2 right-2 flex items-center space-x-2">
                              {lead.whatsapp && (
                                <a href={waLink} target="_blank" rel="noopener noreferrer" title={`WhatsApp ${lead.name}`} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                                  <MessageSquare className="h-4 w-4" />
                                </a>
                              )}
                              {lead.email && (
                                <a href={`mailto:${lead.email}`} title={`Email ${lead.name}`} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                                   <Mail className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                            <p className={`font-mono text-sm ${isNext ? 'text-blue-600 dark:text-blue-300 font-bold' : 'text-blue-500 dark:text-blue-400'}`}>{lead.meeting_at ? new Date(lead.meeting_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No Time'}</p>
                            <p className="font-semibold text-gray-900 dark:text-white mt-1 pr-8">{lead.name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{lead.company}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Owner: {lead.owner}</p>
                        </div>
                      </div>
                    )}) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">No meetings scheduled yet.</p>
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
          #print-agenda-container .bg-white, 
          #print-agenda-container .dark\\:bg-gray-900 {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          #print-agenda h2, #print-agenda p, #print-agenda span {
              color: black !important;
          }
          #print-agenda .dark\\:bg-gray-800\\/50 {
              background-color: #f3f4f6 !important;
              border: 1px solid #d1d5db;
          }
        }
    `}</style>
    </>
  );
};

export default Meetings;