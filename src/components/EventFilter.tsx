import type { Event, EventFormatFilter, EventStatusFilter } from '../types/event';

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

export function getEventStatus(event: Event): 'Full' | 'Almost Full' | 'Spots Available' {
  const percentRegistered = (event.registered / event.capacity) * 100;

  if (percentRegistered >= 100) {
    return 'Full';
  }

  if (percentRegistered >= 90) {
    return 'Almost Full';
  }

  return 'Spots Available';
}

export function filterEventStatus(events: Event[], status: EventStatusFilter): Event[] {
  if (!Array.isArray(events)) {
    return [];
  }

  if (status === 'all') {
    return events;
  }

  switch (status) {
    case 'spots-available':
      return events.filter((event) => getEventStatus(event) === 'Spots Available');
    case 'almost-full':
      return events.filter((event) => getEventStatus(event) === 'Almost Full');
    case 'full':
      return events.filter((event) => getEventStatus(event) === 'Full');
    default:
      return events;
  }
}

export function filterEventType(events: Event[], type: EventFormatFilter): Event[] {
  if (!Array.isArray(events)) {
    return [];
  }

  if (type === 'all') {
    return events;
  }

  switch (type) {
    case 'league':
      return events.filter((event) => event.format === 'League');
    case 'tournament':
      return events.filter((event) => event.format === 'Tournament');
    case 'casual':
      return events.filter((event) => event.format === 'Casual');
    default:
      return events;
  }
}

interface EventFilters {
  status?: EventStatusFilter;
  type?: EventFormatFilter;
  search?: string;
}

export function filterEvents(events: Event[], filters: EventFilters = {}): Event[] {
  if (!Array.isArray(events)) {
    return [];
  }

  const {
    status = 'all',
    type = 'all',
    search = '',
  } = filters;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredBySearch =
    normalizedSearch === ''
      ? events
      : events.filter((event) => {
          const searchableText = [event.name, event.city, event.state]
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

          return searchableText.includes(normalizedSearch);
        });

  return filterEventType(
    filterEventStatus(filteredBySearch, status),
    type,
  );
}

interface EventFilterProps<T extends string> {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  count: number;
  options: FilterOption<T>[];
}

export default function EventFilter<T extends string>({
  id,
  label,
  value,
  onChange,
  count,
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

      <span>{count} event{count === 1 ? '' : 's'}</span>
    </div>
  );
}