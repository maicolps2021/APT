import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/supabaseClient';
import { collection, getDocs, doc, getDoc, query, where, orderBy, getCountFromServer, addDoc, serverTimestamp } from 'firebase/firestore';
import { EVENT_CODE, ORG_UUID } from '../lib/config';
import type { Raffle, Lead } from '../types';
import Card from '../components/Card';
import RafflePanel from '../components/RafflePanel';
import { RaffleCard, RaffleWithWinner } from '../components/RaffleCard';
import { deleteRaffle, drawWinner } from '../lib/raffles';
import { LoaderCircle } from 'lucide-react';
import { postTVMessage } from '../lib/broadcastService';

const Raffles: React.FC = () => {
    const [raffles, setRaffles] = useState<RaffleWithWinner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRaffles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const rafflesRef = collection(db, 'raffles');
            const q = query(rafflesRef, 
                where('event_code', '==', EVENT_CODE),
                where('org_id', '==', ORG_UUID),
                orderBy('drawn_at', 'desc')
            );
            const querySnapshot = await getDocs(q);

            const rafflesData = querySnapshot.docs.map(doc => {
                 const data = doc.data();
                 const drawnAt = data.drawn_at && typeof data.drawn_at.toDate === 'function'
                    ? data.drawn_at.toDate().toISOString()
                    : null;
                 return { id: doc.id, ...data, drawn_at: drawnAt } as Raffle;
            });

            const rafflesWithDetails: RaffleWithWinner[] = await Promise.all(
                rafflesData.map(async (raffle) => {
                    // Fetch winner details
                    let winnerData: Pick<Lead, 'name' | 'company'> | null = null;
                    if (raffle.winner_lead_id) {
                        try {
                            const winnerRef = doc(db, 'leads', raffle.winner_lead_id);
                            const winnerSnap = await getDoc(winnerRef);
                            if (winnerSnap.exists()) {
                                winnerData = {
                                    name: winnerSnap.data().name,
                                    company: winnerSnap.data().company,
                                };
                            }
                        } catch (e) {
                            console.warn(`Could not fetch winner for raffle ${raffle.id}`, e)
                        }
                    }

                    // Fetch participant counts
                    let participantsCount = 0;
                    try {
                        const leadsRef = collection(db, 'leads');
                        const qCount = query(leadsRef,
                            where('event_code', '==', EVENT_CODE),
                            where('org_id', '==', ORG_UUID),
                            where('day', '==', raffle.day)
                        );
                        const snapCount = await getCountFromServer(qCount);
                        participantsCount = snapCount.data().count;
                    } catch (e) {
                        console.warn(`Could not fetch counts for raffle ${raffle.id}`, e);
                    }

                    return { 
                        ...raffle, 
                        winner: winnerData,
                        // Assuming 1 ticket per participant (lead)
                        tickets_count: participantsCount,
                        participants_count: participantsCount
                    };
                })
            );
            
            setRaffles(rafflesWithDetails);
        } catch (err: any) {
            console.error("Error fetching past raffles:", err);
            setError("Could not load raffle data. Please check the console for details.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRaffles();
    }, [fetchRaffles]);

    const handleDelete = async (raffleId: string) => {
      if (!window.confirm('¿Eliminar este sorteo permanentemente? Esta acción no se puede deshacer.')) return;
      
      const originalRaffles = [...raffles];
      // Optimistic update
      setRaffles(rs => rs.filter(r => r.id !== raffleId));
      
      try {
        await deleteRaffle(raffleId);
      } catch (err) {
        console.error("Failed to delete raffle:", err);
        alert("Could not delete the raffle. Restoring list.");
        setRaffles(originalRaffles);
      }
    };
    
    const announceWinner = async (raffle: Raffle, winner: Lead) => {
      const payload = {
        raffleId: raffle.id,
        raffleName: `Sorteo Día ${raffle.day}`,
        prize: raffle.prize,
        winnerName: winner.name,
        winnerCompany: winner.company,
      };

      // 1. Instant update on the same machine via BroadcastChannel
      postTVMessage({ kind: 'raffle', ...payload });

      // 2. Cross-device update via Firestore event log
      try {
        await addDoc(collection(db, 'orgs', ORG_UUID, 'events'), {
          type: 'raffle',
          created_at: serverTimestamp(),
          payload,
        });
      } catch (error) {
        console.error("Failed to post raffle event to Firestore:", error);
        // This is a non-critical error, the UI will still update locally
      }
    };

    const handleDraw = async (raffle: RaffleWithWinner) => {
        if (!window.confirm(`¿Sortear un ganador para "${raffle.prize}" ahora?`)) return;
        setLoading(true);
        try {
            const winner = await drawWinner(raffle);
            if(winner) {
                alert(`¡El ganador es ${winner.name}! La lista se actualizará.`);
                await announceWinner(raffle, winner);
            }
            await fetchRaffles(); // Refresh the whole list to show the new winner
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to draw a winner.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-6xl">
            <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Raffles & Giveaways</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Manage prize draws transparently.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <RafflePanel onRaffleDrawn={fetchRaffles} />
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">All Raffles</h2>
                        {loading && <div className="text-center p-8"><LoaderCircle className="animate-spin inline-block mr-2" />Loading raffles...</div>}
                        {error && <p className="text-red-500 text-sm text-center p-4 bg-red-100 dark:bg-red-900/50 rounded-lg">{error}</p>}
                        
                        {!loading && raffles.length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No raffles have been created yet.</p>
                        )}
                        
                        {!loading && raffles.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {raffles.map(raffle => (
                                    <RaffleCard
                                      key={raffle.id}
                                      raffle={raffle}
                                      onDelete={handleDelete}
                                      onDraw={handleDraw}
                                    />
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