import { initialEvents } from '../data/events.js';
import type { Event, EventChanges, EventFormat, NewEvent } from '../types/event.js';

export type UpdateEventResult =
  | { status: 'updated'; event: Event }
  | { status: 'not-found' }
  | { status: 'capacity-conflict' };

export interface EventService {
  getEvents(format?: EventFormat): readonly Event[];
  getEventById(id: number): Event | undefined;
  createEvent(input: NewEvent): Event;
  updateEvent(id: number, changes: EventChanges): UpdateEventResult;
  deleteEvent(id: number): boolean;
}

export function createEventService(seed: readonly Event[] = initialEvents): EventService {
  const events = seed.map((event) => ({ ...event }));
  let nextId = events.reduce((maxId, event) => Math.max(maxId, event.id), 0) + 1;

  return {
    getEvents(format) {
      return events
        .filter((event) => format === undefined || event.format === format)
        .map((event) => ({ ...event }));
    },

    getEventById(id) {
      const event = events.find((candidate) => candidate.id === id);
      return event === undefined ? undefined : { ...event };
    },

    createEvent(input) {
      if (!Number.isSafeInteger(nextId) || nextId <= 0) {
        throw new RangeError('No valid event identifiers remain.');
      }

      const event: Event = { ...input, id: nextId, registered: 0 };
      nextId += 1;
      events.push(event);
      return { ...event };
    },

    updateEvent(id, changes) {
      const event = events.find((candidate) => candidate.id === id);
      if (event === undefined) {
        return { status: 'not-found' };
      }

      if (changes.capacity !== undefined && changes.capacity < event.registered) {
        return { status: 'capacity-conflict' };
      }

      Object.assign(event, changes);
      return { status: 'updated', event: { ...event } };
    },

    deleteEvent(id) {
      const index = events.findIndex((event) => event.id === id);
      if (index === -1) {
        return false;
      }

      events.splice(index, 1);
      return true;
    },
  };
}

const defaultEventService = createEventService();

export const getEvents = defaultEventService.getEvents;
export const getEventById = defaultEventService.getEventById;
export const createEvent = defaultEventService.createEvent;
export const updateEvent = defaultEventService.updateEvent;
export const deleteEvent = defaultEventService.deleteEvent;
