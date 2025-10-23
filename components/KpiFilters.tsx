import React from 'react';

type Props = {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  channel: string;
  channels: string[];
  onChange: (next: {from: string; to: string; channel: string}) => void;
  onRefresh: () => void;
  lastUpdated?: Date | null;
};

export default function KpiFilters({ from, to, channel, channels, onChange, onRefresh, lastUpdated }: Props) {
  return (
    <div className="w-full flex flex-wrap items-end gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div className="flex flex-col">
        <label className="text-xs font-medium opacity-70 mb-1">From</label>
        <input type="date" value={from} onChange={e=>onChange({from: e.target.value, to, channel})}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-medium opacity-70 mb-1">To</label>
        <input type="date" value={to} onChange={e=>onChange({from, to: e.target.value, channel})}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-medium opacity-70 mb-1">Channel</label>
        <select value={channel} onChange={e=>onChange({from, to, channel: e.target.value})}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 min-w-[160px]">
          <option value="">All</option>
          {channels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
        </select>
      </div>
      <button onClick={onRefresh}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
        Refresh
      </button>
      <div className="text-xs opacity-70 ml-auto self-center">
        {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : '—'}
      </div>
    </div>
  );
}
