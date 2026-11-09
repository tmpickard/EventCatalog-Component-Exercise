import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createEventService } from '../services/eventService.js';
import type { Event } from '../types/event.js';

const seed: Event[] = [
  {
    id: 17,
    name: 'Seattle Trainer League',
    city: 'Seattle',
    state: 'WA',
    date: '2026-11-14',
    capacity: 32,
    registered: 20,
    format: 'League',
  },
];

describe('event service', () => {
  it('can be tested independently and allocates stable unique identifiers', () => {
    const service = createEventService(seed);
    const input = {
      name: 'New Event',
      city: 'Seattle',
      state: 'WA',
      date: '2026-11-14',
      capacity: 32,
      format: 'League' as const,
    };

    assert.equal(service.createEvent(input).id, 18);
    assert.equal(service.createEvent(input).id, 19);
    assert.equal(service.getEventById(17)?.name, 'Seattle Trainer League');
  });

  it('reports state-dependent capacity conflicts without mutating the event', () => {
    const service = createEventService(seed);

    assert.deepEqual(service.updateEvent(17, { capacity: 19 }), { status: 'capacity-conflict' });
    assert.equal(service.getEventById(17)?.capacity, 32);
    assert.equal(service.updateEvent(17, { capacity: 20 }).status, 'updated');
  });

  it('deletes an event without changing the IDs of remaining events', () => {
    const service = createEventService([
      ...seed,
      { ...seed[0]!, id: 18, name: 'Second Event' },
    ]);

    assert.equal(service.deleteEvent(17), true);
    assert.equal(service.getEventById(17), undefined);
    assert.equal(service.getEventById(18)?.id, 18);
  });
});
