import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/supabaseClient'; // Path kept for simplicity, points to Firebase now
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { EVENT_CODE } from '../lib/config';
import type { Lead } from '../types';
import Card from '../components/Card';
import LeadDetailModal from '../components/LeadDetailModal';
import { useAuth } from '../contexts/AuthContext';
import { Search, UserPlus } from 'lucide-react';

const LeadList: React.FC = () => {
  const { status: authStatus } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const leadsRef = collection(db, 'leads');
    const q = query(
      leadsRef,
      where('event_code', '==', EVENT_CODE),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const leadsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.created_at instanceof Timestamp ? data.created_at.toDate().toISOString() : new Date().toISOString();
        return { id: doc.id, ...data, created_at: createdAt } as Lead;
      });
      setLeads(leadsData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching leads:", err);
      setError("Failed to load leads in real-time. Please check your connection and Firestore rules.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authStatus]);

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const lowercasedTerm = searchTerm.toLowerCase();
    return leads.filter(lead =>
      lead.name.toLowerCase().includes(lowercasedTerm) ||
      (lead.company && lead.company.toLowerCase().includes(lowercasedTerm)) ||
      (lead.email && lead.email.toLowerCase().includes(lowercasedTerm)) ||
      (lead.whatsapp && lead.whatsapp.includes(lowercasedTerm))
    );
  }, [leads, searchTerm]);

  const handleCloseModal = () => {
    setSelectedLead(null);
  };

  const renderContent = () => {
    if (loading) return <div className="text-center p-8">Loading leads...</div>;
    if (error) return <div className="text-center p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">{error}</div>;
    if (leads.length === 0) {
      return (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">No leads captured yet.</p>
          <a href="#/capture" className="mt-4 inline-flex items-center justify-center rounded-lg px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
            <UserPlus className="mr-2 h-4 w-4" />
            Capture First Lead
          </a>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Company</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Scoring</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredLeads.map(lead => (
              <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white">{lead.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{lead.role}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{lead.company || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  {lead.whatsapp && <div>WA: {lead.whatsapp}</div>}
                  {lead.email && <div>{lead.email}</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    lead.scoring === 'A' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    lead.scoring === 'B' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    lead.scoring === 'C' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {lead.scoring || 'N/A'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Lead List</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">All captured leads for {EVENT_CODE}. Click a row to see details.</p>
        </div>
        <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"/>
            <input 
                type="text" 
                placeholder="Search by name, company..." 
                className="input pl-10 w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>
      <Card>
        {renderContent()}
      </Card>
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          isOpen={!!selectedLead}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

export default LeadList;
