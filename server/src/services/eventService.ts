import { events } from '../data/events.js';
import type { Event, EventFormat } from '../types/event.js';

export function getEvents(format?: EventFormat): readonly Event[] {
  if (format === undefined) {
    return events;
  }

  return events.filter((event) => event.format === format);
}

export function getEventById(id: number): Event | undefined {
  return events.find((event) => event.id === id);
}
