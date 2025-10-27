import React, { useEffect, useState } from 'react';
import { Trash2, Sparkles, User2, Ticket, Crown } from 'lucide-react';
import type { Raffle, Lead } from '../types';
import { getAndSaveRaffleStats } from '../lib/raffles';

export type RaffleWithWinner = Raffle & {
  winner: Pick<Lead, 'name' | 'company'> | null;
  // Make counts optional as they might not exist on old docs
  tickets_count?: number;
  participants_count?: number;
};

interface RaffleCardProps {
  raffle: RaffleWithWinner;
  onDraw: (raffle: RaffleWithWinner) => void;
  onDelete: (raffleId: string) => void;
}

export const RaffleCard: React.FC<RaffleCardProps> = ({ raffle, onDraw, onDelete }) => {
  const [stats, setStats] = useState({
    tickets: raffle.tickets_count,
    participants: raffle.participants_count,
  });

  useEffect(() => {
    let isMounted = true;
    
    // If stats are missing from the prop, fetch them on-demand.
    if (raffle.tickets_count === undefined || raffle.participants_count === undefined) {
      getAndSaveRaffleStats(raffle)
        .then(newStats => {
          if (isMounted) {
            setStats({
              tickets: newStats.tickets_count,
              participants: newStats.participants_count,
            });
          }
        })
        .catch(err => {
          console.error(`Error fetching on-demand stats for raffle ${raffle.id}:`, err);
          // On error, set to 0 to prevent re-fetching and show a sensible default.
          if (isMounted) {
            setStats({ tickets: 0, participants: 0 });
          }
        });
    } else {
      // If the prop is updated with stats, sync the state.
      setStats({
        tickets: raffle.tickets_count,
        participants: raffle.participants_count,
      });
    }

    return () => { isMounted = false; };
  }, [raffle]); // Rerun when the raffle object changes.

  const hasWinner = !!raffle.winner_lead_id && !!raffle.winner;
  const status = raffle.status || (hasWinner ? 'Drawn' : 'Open');
  
  const statusColors: Record<string, string> = {
    'Drawn': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'Open': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'Planned': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  };
  
  const ticketsCount = stats.tickets ?? 0;
  const participantsCount = stats.participants ?? 0;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-lg font-semibold truncate" title={raffle.prize}>{raffle.prize}</div>
          <div className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || statusColors['Planned']}`}>
              {status}
          </div>
        </div>
        <button 
            onClick={() => onDelete(raffle.id)} 
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 flex-shrink-0"
            title="Delete Raffle"
            aria-label="Delete Raffle"
        >
          <Trash2 className="w-4 h-4"/>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300">
        <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-gray-400"/>
            <span>{ticketsCount.toLocaleString()} tickets</span>
        </div>
        <div className="flex items-center gap-2">
            <User2 className="w-4 h-4 text-gray-400"/>
            <span>{participantsCount.toLocaleString()} participants</span>
        </div>
      </div>
      
      <div className="mt-4 border-t border-gray-200 dark:border-gray-800 pt-4">
        {!hasWinner ? (
          <button onClick={() => onDraw(raffle)} className="w-full px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 inline-flex items-center justify-center gap-2 transition-colors">
            <Sparkles className="w-4 h-4"/> Draw Winner
          </button>
        ) : (
          <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300 font-semibold">
              <Crown className="w-4 h-4"/><span>Winner: {raffle.winner?.name}</span>
            </div>
             <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{raffle.winner?.company}</div>
          </div>
        )}
      </div>
    </div>
  );
};