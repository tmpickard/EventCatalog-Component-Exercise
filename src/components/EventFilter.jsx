
export const statusFilterOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'spots-available', label: 'Spots Available' },
  { value: 'almost-full', label: 'Almost Full' },
  { value: 'full', label: 'Full' },
];

export const typeFilterOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'league', label: 'League' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'casual', label: 'Casual' },
];

export function getEventStatus(event) {
  const percentRegistered = (event.registered / event.capacity) * 100;

  if (percentRegistered >= 100) {
    return 'Full';
  }

  if (percentRegistered >= 90) {
    return 'Almost Full';
  }

  return 'Spots Available';
}

export function filterEventStatus(events, status) {
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

export function filterEventType(events, type) {
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

export function filterEvents(events, filters = {}) {
  if (!Array.isArray(events)) {
    return [];
  }

  const {
    status = 'all',
    type = 'all',
    search = '',
  } = filters;

  const normalizedSearch = search.trim();
  const filteredBySearch =
    normalizedSearch === ''
      ? events
      : events.filter((event) => {
          const searchableText = [event.name, event.city, event.state]
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          return searchableText.includes(normalizedSearch);
        });

  return filterEventType(
    filterEventStatus(filteredBySearch, status),
    type,
  );
}

export default function EventFilter({ id, label, value, onChange, count, options }) {
  return (
    <div className="event-filter">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
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