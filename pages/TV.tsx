import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { generateWelcomeMessage } from '../lib/geminiService';
import type { Lead } from '../types';

interface WelcomeLead extends Lead {
  welcomeMessage: string;
}

const TV: React.FC = () => {
  const [latestLeads, setLatestLeads] = useState<WelcomeLead[]>([]);
  const [visibleLeadIndex, setVisibleLeadIndex] = useState(0);

  const addNewLead = useCallback(async (lead: Lead) => {
    // Ensure we don't add duplicates
    if (latestLeads.some(l => l.id === lead.id)) return;

    const welcomeMessage = await generateWelcomeMessage(lead);
    const newWelcomeLead: WelcomeLead = { ...lead, welcomeMessage };

    setLatestLeads(currentLeads => {
      const updatedLeads = [newWelcomeLead, ...currentLeads];
      // Keep only the 10 most recent leads
      return updatedLeads.slice(0, 10);
    });
  }, [latestLeads]);

  useEffect(() => {
    // Fetch initial recent leads
    const fetchInitialLeads = async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        // Reverse to process oldest first, so the newest appears last
        for (const lead of data.reverse()) {
          await addNewLead(lead);
        }
      }
    };

    fetchInitialLeads();
    // Intentionally run only once on mount, addNewLead dependency is stable but can cause re-runs if not careful
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('public:leads:tv')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        addNewLead(payload.new as Lead);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addNewLead]);

  useEffect(() => {
    if (latestLeads.length > 1) {
      const interval = setInterval(() => {
        setVisibleLeadIndex(prevIndex => (prevIndex + 1) % latestLeads.length);
      }, 7000); // Change lead every 7 seconds
      return () => clearInterval(interval);
    }
  }, [latestLeads.length]);

  const visibleLead = latestLeads[visibleLeadIndex];

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-8 overflow-hidden">
      {visibleLead ? (
        <div 
          key={visibleLead.id} 
          className="w-full max-w-4xl bg-slate-800 border-4 border-primary-500 rounded-2xl shadow-2xl p-10 text-center animate-fade-in-up"
        >
          <h2 className="text-3xl font-light text-slate-300 mb-2">A warm welcome to</h2>
          <h1 className="text-6xl md:text-8xl font-extrabold text-white mb-4">{visibleLead.name}</h1>
          <h3 className="text-4xl font-semibold text-slate-400 mb-8">{visibleLead.company}</h3>
          <p className="text-2xl md:text-3xl text-slate-200 leading-relaxed italic">
            &ldquo;{visibleLead.welcomeMessage}&rdquo;
          </p>
        </div>
      ) : (
        <div className="text-center">
          <h1 className="text-5xl font-bold text-primary-500">Arenal Conagui</h1>
          <p className="text-2xl text-slate-400 mt-4 animate-pulse">Waiting for new attendees...</p>
        </div>
      )}
      
      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(30px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default TV;
