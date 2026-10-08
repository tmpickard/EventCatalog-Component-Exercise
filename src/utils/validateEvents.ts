import type { Event, EventFormat } from '../types/event';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEventFormat(value: unknown): value is EventFormat {
  return value === 'League' || value === 'Tournament' || value === 'Casual';
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === value;
}

function validateEvent(value: unknown, index: number): Event {
  if (!isRecord(value)) {
    throw new Error(`Event at index ${index} is not an object.`);
  }

  const { id, name, city, state, date, capacity, registered, format } = value;
  if (
    typeof id !== 'number' ||
    !Number.isSafeInteger(id) ||
    id < 1 ||
    typeof name !== 'string' ||
    name.trim() === '' ||
    typeof city !== 'string' ||
    city.trim() === '' ||
    typeof state !== 'string' ||
    state.trim() === '' ||
    typeof date !== 'string' ||
    !isValidDate(date) ||
    typeof capacity !== 'number' ||
    !Number.isSafeInteger(capacity) ||
    capacity < 1 ||
    typeof registered !== 'number' ||
    !Number.isSafeInteger(registered) ||
    registered < 0 ||
    registered > capacity ||
    !isEventFormat(format)
  ) {
    throw new Error(`Event at index ${index} contains invalid data.`);
  }

  return { id, name, city, state, date, capacity, registered, format };
}

export default function validateEvents(value: unknown): Event[] {
  if (!Array.isArray(value)) {
    throw new Error('The event response must be an array.');
  }

  const events = value.map(validateEvent);
  const eventIds = new Set<number>();

  for (const event of events) {
    if (eventIds.has(event.id)) {
      throw new Error(`Event ID ${event.id} appears more than once.`);
    }

    eventIds.add(event.id);
  }

  return events;
}
