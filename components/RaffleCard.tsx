import React from 'react';
import { Trash2, Sparkles, User2, Ticket, Crown } from 'lucide-react';
import type { Raffle, Lead } from '../types';

export type RaffleWithWinner = Raffle & {
  winner: Pick<Lead, 'name' | 'company'> | null;
  // Estos contadores son opcionales ya que no están en el modelo de datos actual
  tickets_count?: number;
  participants_count?: number;
};

interface RaffleCardProps {
  raffle: RaffleWithWinner;
  onDraw: (raffle: RaffleWithWinner) => void;
  onDelete: (raffleId: string) => void;
}

// FIX: Refactored to a const arrow function with React.FC to improve type inference and resolve a props issue.
export const RaffleCard: React.FC<RaffleCardProps> = ({ raffle, onDraw, onDelete }) => {
  const hasWinner = !!raffle.winner_lead_id && !!raffle.winner;
  const status = raffle.status || (hasWinner ? 'Drawn' : 'Open');
  
  const statusColors: Record<string, string> = {
    'Drawn': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'Open': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'Planned': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  };

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
        <div className="flex items-center gap-2" title="Tickets (not implemented)">
            <Ticket className="w-4 h-4 text-gray-400"/>
            <span>{raffle.tickets_count ?? 'N/A'} tickets</span>
        </div>
        <div className="flex items-center gap-2" title="Participants (not implemented)">
            <User2 className="w-4 h-4 text-gray-400"/>
            <span>{raffle.participants_count ?? 'N/A'} participants</span>
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