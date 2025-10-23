
import React from 'react';

export interface KpiFilterState {
  day: 'all' | number;
  source: 'all' | 'QR' | 'MANUAL';
}

interface KpiFiltersProps {
  filters: KpiFilterState;
  onFilterChange: <K extends keyof KpiFilterState>(key: K, value: KpiFilterState[K]) => void;
  eventDays: number[];
}

const KpiFilters: React.FC<KpiFiltersProps> = ({ filters, onFilterChange, eventDays }) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div>
        <label htmlFor="day-filter" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
          Day
        </label>
        <select
          id="day-filter"
          value={filters.day}
          onChange={(e) => onFilterChange('day', e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="input"
        >
          <option value="all">All Days</option>
          {eventDays.map(day => (
            <option key={day} value={day}>Day {day}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="source-filter" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
          Source
        </label>
        <select
          id="source-filter"
          value={filters.source}
          onChange={(e) => onFilterChange('source', e.target.value as KpiFilterState['source'])}
          className="input"
        >
          <option value="all">All Sources</option>
          <option value="QR">QR</option>
          <option value="MANUAL">Manual</option>
        </select>
      </div>
    </div>
  );
};

export default KpiFilters;
