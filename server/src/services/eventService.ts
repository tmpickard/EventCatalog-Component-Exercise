import { initialEvents } from '../data/events.js';
import type { Event, EventChanges, EventFormat, NewEvent } from '../types/event.js';

export type UpdateEventResult =
  | { status: 'updated'; event: Event }
  | { status: 'not-found' }
  | { status: 'forbidden' }
  | { status: 'capacity-conflict' };

export type EventAccessResult = 'allowed' | 'not-found' | 'forbidden';

export interface EventService {
  getEvents(format?: EventFormat, organizerId?: string): readonly Event[];
  getEventById(id: number): Event | undefined;
  createEvent(input: NewEvent, organizerId: string): Event;
  checkEventOwnership(id: number, organizerId: string): EventAccessResult;
  updateEvent(id: number, organizerId: string, changes: EventChanges): UpdateEventResult;
  deleteEvent(id: number, organizerId: string): EventAccessResult;
}

export function createEventService(seed: readonly Event[] = initialEvents): EventService {
  const events = seed.map((event) => ({ ...event }));
  let nextId = events.reduce((maxId, event) => Math.max(maxId, event.id), 0) + 1;

  return {
    getEvents(format, organizerId) {
      return events
        .filter(
          (event) =>
            (format === undefined || event.format === format) &&
            (organizerId === undefined || event.organizerId === organizerId),
        )
        .map((event) => ({ ...event }));
    },

    getEventById(id) {
      const event = events.find((candidate) => candidate.id === id);
      return event === undefined ? undefined : { ...event };
    },

    createEvent(input, organizerId) {
      if (!Number.isSafeInteger(nextId) || nextId <= 0) {
        throw new RangeError('No valid event identifiers remain.');
      }

      const event: Event = { ...input, id: nextId, registered: 0, organizerId };
      nextId += 1;
      events.push(event);
      return { ...event };
    },

    checkEventOwnership(id, organizerId) {
      const event = events.find((candidate) => candidate.id === id);
      if (event === undefined) {
        return 'not-found';
      }
      return event.organizerId === organizerId ? 'allowed' : 'forbidden';
    },

    updateEvent(id, organizerId, changes) {
      const event = events.find((candidate) => candidate.id === id);
      if (event === undefined) {
        return { status: 'not-found' };
      }
      if (event.organizerId !== organizerId) {
        return { status: 'forbidden' };
      }
      if (changes.capacity !== undefined && changes.capacity < event.registered) {
        return { status: 'capacity-conflict' };
      }

      if (changes.name !== undefined) event.name = changes.name;
      if (changes.city !== undefined) event.city = changes.city;
      if (changes.state !== undefined) event.state = changes.state;
      if (changes.date !== undefined) event.date = changes.date;
      if (changes.capacity !== undefined) event.capacity = changes.capacity;
      if (changes.format !== undefined) event.format = changes.format;
      return { status: 'updated', event: { ...event } };
    },

    deleteEvent(id, organizerId) {
      const index = events.findIndex((event) => event.id === id);
      if (index === -1) {
        return 'not-found';
      }
      if (events[index]?.organizerId !== organizerId) {
        return 'forbidden';
      }

      events.splice(index, 1);
      return 'allowed';
    },
  };
}

const defaultEventService = createEventService();

export const getEvents = defaultEventService.getEvents;
export const getEventById = defaultEventService.getEventById;
export const createEvent = defaultEventService.createEvent;
export const updateEvent = defaultEventService.updateEvent;
export const deleteEvent = defaultEventService.deleteEvent;
