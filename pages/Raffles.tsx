import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import type { Raffle, Lead } from '../types';
import Card from '../components/Card';
import RafflePanel from '../components/RafflePanel';

type PastRaffle = Raffle & {
    winner: Pick<Lead, 'name' | 'company'> | null;
}

const Raffles: React.FC = () => {
    const [pastRaffles, setPastRaffles] = useState<PastRaffle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPastRaffles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch drawn raffles and join with leads table to get winner's name
            const { data, error } = await supabase
                .from('raffles')
                .select(`
                    *,
                    winner:winner_lead_id (
                        name,
                        company
                    )
                `)
                .eq('event_code', EVENT_CODE)
                .eq('org_id', ORG_UUID)
                .eq('status', 'Drawn')
                .order('drawn_at', { ascending: false });

            if (error) throw error;
            
            // The join result is nested, so we type assert it correctly
            setPastRaffles((data as any[]) || []);
        } catch (err: any) {
            console.error("Error fetching past raffles:", err);
            setError("Could not load past raffle data. Please check the console for details.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPastRaffles();
    }, [fetchPastRaffles]);

    return (
        <div className="mx-auto max-w-6xl">
            <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-white">Raffles & Giveaways</h1>
                <p className="text-slate-400 mt-2">Manage prize draws transparently.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Conduct a new raffle */}
                <div>
                    <RafflePanel onRaffleDrawn={fetchPastRaffles} />
                </div>

                {/* Right Side: List of past winners */}
                <div>
                    <Card>
                        <h2 className="text-xl font-bold text-primary-400 mb-4">Raffle History</h2>
                        {loading && <p className="text-slate-400">Loading history...</p>}
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                        {!loading && pastRaffles.length === 0 && (
                            <p className="text-slate-400 text-center py-8">No raffles have been drawn yet.</p>
                        )}
                        {!loading && pastRaffles.length > 0 && (
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                {pastRaffles.map(raffle => (
                                    <div key={raffle.id} className="bg-slate-700/50 p-4 rounded-lg">
                                        <p className="text-xs text-slate-400">{new Date(raffle.drawn_at).toLocaleString()}</p>
                                        <p className="font-semibold text-white mt-1">Prize: <span className="text-primary-400">{raffle.prize}</span></p>
                                        <div className="mt-2 text-sm">
                                            <p className="text-slate-200">Winner: <span className="font-bold">{raffle.winner?.name || 'N/A'}</span></p>
                                            <p className="text-slate-300">Company: {raffle.winner?.company || 'N/A'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Raffles;
