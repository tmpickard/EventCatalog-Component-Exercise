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
    organizerId: 'user_alice',
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

    assert.equal(service.createEvent(input, 'user_bob').id, 18);
    assert.equal(service.createEvent(input, 'user_bob').id, 19);
    assert.equal(service.getEventById(18)?.organizerId, 'user_bob');
    assert.equal(service.getEventById(17)?.name, 'Seattle Trainer League');
  });

  it('reports state-dependent capacity conflicts without mutating the event', () => {
    const service = createEventService(seed);

    assert.deepEqual(service.updateEvent(17, 'user_alice', { capacity: 19 }), {
      status: 'capacity-conflict',
    });
    assert.equal(service.getEventById(17)?.capacity, 32);
    assert.equal(service.updateEvent(17, 'user_alice', { capacity: 20 }).status, 'updated');
  });

  it('enforces ownership directly in the service and leaves rejected events unchanged', () => {
    const service = createEventService(seed);

    assert.deepEqual(service.updateEvent(17, 'user_bob', { name: 'Unauthorized' }), {
      status: 'forbidden',
    });
    assert.equal(service.getEventById(17)?.name, 'Seattle Trainer League');
  });

  it('never applies organizerId from a direct service update', () => {
    const service = createEventService(seed);
    const changes = Object.assign({ name: 'Updated by owner' }, { organizerId: 'user_bob' });

    const result = service.updateEvent(17, 'user_alice', changes);
    assert.equal(result.status, 'updated');
    assert.equal(service.getEventById(17)?.name, 'Updated by owner');
    assert.equal(service.getEventById(17)?.organizerId, 'user_alice');
  });

  it('filters events by organizer', () => {
    const service = createEventService([
      seed[0]!,
      { ...seed[0]!, id: 18, organizerId: 'user_bob' },
    ]);

    assert.deepEqual(service.getEvents(undefined, 'user_alice').map((event) => event.id), [17]);
  });

  it('deletes an event without changing the IDs of remaining events', () => {
    const service = createEventService([
      ...seed,
      { ...seed[0]!, id: 18, name: 'Second Event', organizerId: 'user_bob' },
    ]);

    assert.equal(service.deleteEvent(17, 'user_alice'), 'allowed');
    assert.equal(service.getEventById(17), undefined);
    assert.equal(service.getEventById(18)?.id, 18);
    assert.equal(service.deleteEvent(18, 'user_alice'), 'forbidden');
    assert.equal(service.getEventById(18)?.id, 18);
  });
});
