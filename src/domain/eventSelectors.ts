import type {
  Event,
  EventFormatFilter,
  EventStatusFilter,
  SortOption,
} from '../types/event';

interface EventFilters {
  status?: EventStatusFilter;
  type?: EventFormatFilter;
  search?: string;
}

export function getEventStatus(
  event: Event,
): 'Full' | 'Almost Full' | 'Spots Available' {
  const percentRegistered = (event.registered / event.capacity) * 100;

  if (percentRegistered >= 100) {
    return 'Full';
  }

  if (percentRegistered >= 90) {
    return 'Almost Full';
  }

  return 'Spots Available';
}

export function filterEventStatus(
  events: Event[],
  status: EventStatusFilter,
): Event[] {
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

export function filterEventType(
  events: Event[],
  type: EventFormatFilter,
): Event[] {
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

export function filterEvents(
  events: Event[],
  filters: EventFilters = {},
): Event[] {
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

export function sortEvents(
  events: Event[],
  sortBy: SortOption | 'default' = 'date-asc',
): Event[] {
  if (!Array.isArray(events)) {
    return [];
  }

  const normalizedSortOption = sortBy === 'default' ? 'date-asc' : sortBy;
  const sortedEvents = [...events];

  switch (normalizedSortOption) {
    case 'name-asc':
      return sortedEvents.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return sortedEvents.sort((a, b) => b.name.localeCompare(a.name));
    case 'date-desc':
      return sortedEvents.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    case 'date-asc':
    default:
      return sortedEvents.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
  }
}
