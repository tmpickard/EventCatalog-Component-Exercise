import type { EventFormatFilter, EventStatusFilter } from '../types/event';

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

export const statusFilterOptions: FilterOption<EventStatusFilter>[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'spots-available', label: 'Spots Available' },
  { value: 'almost-full', label: 'Almost Full' },
  { value: 'full', label: 'Full' },
];

export const typeFilterOptions: FilterOption<EventFormatFilter>[] = [
  { value: 'all', label: 'All Types' },
  { value: 'league', label: 'League' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'casual', label: 'Casual' },
];

interface EventFilterProps<T extends string> {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: FilterOption<T>[];
}

export default function EventFilter<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
}: EventFilterProps<T>) {
  return (
    <div className="event-filter">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}