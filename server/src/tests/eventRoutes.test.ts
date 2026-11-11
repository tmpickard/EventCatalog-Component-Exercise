import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../app.js';
import { createEventService } from '../services/eventService.js';
import { createSessionService, SESSION_LIFETIME_MS } from '../services/sessionService.js';
import type { SessionService } from '../services/sessionService.js';
import { eventFormats, type Event } from '../types/event.js';

const trustedOrigin = 'http://localhost:5173';
const validNewEvent = {
  name: 'Seattle Autumn Trainer League',
  city: 'Seattle',
  state: 'WA',
  date: '2026-11-14',
  capacity: 32,
  format: 'League',
};

let now: number;
let sessionService: SessionService;
let aliceCookie: string;
let bobCookie: string;
let expiredCookie: string;
let app: ReturnType<typeof createApp>;

function resetApp(): void {
  now = Date.parse('2026-11-03T16:00:00.000Z');
  sessionService = createSessionService(() => now);
  aliceCookie = `trainer_session=${sessionService.createSession('user_alice').id}`;
  bobCookie = `trainer_session=${sessionService.createSession('user_bob').id}`;
  expiredCookie = `trainer_session=${sessionService.createSession('user_alice').id}`;
  app = createApp(createEventService(), { sessionService, trustedOrigin });
}

function authenticatedPost(cookie = aliceCookie) {
  return request(app).post('/api/events').set('Cookie', cookie).set('Origin', trustedOrigin);
}

function authenticatedPatch(id: string, cookie = aliceCookie) {
  return request(app)
    .patch(`/api/events/${id}`)
    .set('Cookie', cookie)
    .set('Origin', trustedOrigin);
}

function assertEvent(value: unknown): asserts value is Event {
  assert.equal(typeof value, 'object');
  assert.notEqual(value, null);
  const event = value as Record<string, unknown>;
  assert.ok(typeof event.organizerId === 'string');
  assert.match(event.organizerId, /^user_[A-Za-z0-9_-]+$/);
}

beforeEach(resetApp);

describe('public event reads', () => {
  it('allows anonymous users to retrieve the event collection', async () => {
    const response = await request(app).get('/api/events');
    assert.equal(response.status, 200);
    assert.equal(response.body.data.length, 5);
  });

  it('allows anonymous users to retrieve event details', async () => {
    const response = await request(app).get('/api/events/17');
    assert.equal(response.status, 200);
    assert.equal(response.body.data.organizerId, 'user_alice');
  });

  it('keeps the health endpoint public', async () => {
    assert.deepEqual((await request(app).get('/health')).body, { status: 'ok' });
  });

  it('filters by organizer and preserves format filtering', async () => {
    const response = await request(app).get('/api/events?organizerId=user_alice&format=League');
    assert.equal(response.status, 200);
    assert.ok(response.body.data.length > 0);
    assert.ok(
      response.body.data.every(
        (event: Event) => event.organizerId === 'user_alice' && event.format === 'League',
      ),
    );
  });

  it('rejects malformed or repeated organizer filters', async () => {
    for (const url of [
      '/api/events?organizerId=alice',
      '/api/events?organizerId=',
      '/api/events?organizerId=user_alice&organizerId=user_bob',
    ]) {
      assert.equal((await request(app).get(url)).status, 400);
    }
  });
});

describe('event creation authentication', () => {
  it('rejects anonymous event creation without changing the collection', async () => {
    const before = (await request(app).get('/api/events')).body;
    const response = await request(app).post('/api/events').send(validNewEvent);
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication is required.' },
    });
    assert.deepEqual((await request(app).get('/api/events')).body, before);
  });

  it('creates an event for the authenticated organizer and returns its Location', async () => {
    const response = await authenticatedPost().send(validNewEvent);
    assert.equal(response.status, 201);
    assert.equal(response.body.data.organizerId, 'user_alice');
    assert.equal(response.body.data.id, 22);
    assert.equal(response.body.data.registered, 0);
    assert.equal(response.headers.location, '/api/events/22');
  });

  it('does not consume an ID for rejected creation requests', async () => {
    const rejected = await authenticatedPost().send({ ...validNewEvent, organizerId: 'user_bob' });
    assert.equal(rejected.status, 400);
    const created = await authenticatedPost().send(validNewEvent);
    assert.equal(created.body.data.id, 22);
  });

  it('rejects creation from an untrusted or missing origin', async () => {
    const untrusted = await request(app)
      .post('/api/events')
      .set('Cookie', aliceCookie)
      .set('Origin', 'https://attacker.example')
      .send(validNewEvent);
    const missing = await request(app).post('/api/events').set('Cookie', aliceCookie).send(validNewEvent);
    assert.equal(untrusted.status, 403);
    assert.equal(missing.status, 403);
  });

  it('preserves event creation validation rules', async () => {
    for (const body of [
      { ...validNewEvent, name: ' ' },
      { ...validNewEvent, capacity: 0 },
      { ...validNewEvent, date: '2026-02-30' },
      { ...validNewEvent, id: 12 },
      { ...validNewEvent, format: 'Other' },
    ]) {
      assert.equal((await authenticatedPost().send(body)).status, 400);
    }
    assert.equal((await authenticatedPost().send(validNewEvent)).body.data.id, 22);
  });
});

describe('event update authorization', () => {
  it('rejects anonymous updates', async () => {
    const response = await request(app).patch('/api/events/17').send({ name: 'Changed' });
    assert.equal(response.status, 401);
  });

  it('allows the owner to update the name and returns the complete event', async () => {
    const response = await authenticatedPatch('17').send({ name: 'Updated League' });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, {
      id: 17,
      name: 'Updated League',
      city: 'Seattle',
      state: 'WA',
      date: '2026-11-14',
      capacity: 32,
      registered: 20,
      format: 'League',
      organizerId: 'user_alice',
    });
  });

  it('allows the owner to update capacity without changing other fields', async () => {
    const response = await authenticatedPatch('17').send({ capacity: 48 });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.capacity, 48);
    assert.equal(response.body.data.organizerId, 'user_alice');
    assert.equal(response.body.data.registered, 20);
  });

  it('rejects a non-owner before validating mutation details', async () => {
    const response = await authenticatedPatch('17', bobCookie).send({ unknown: true });
    assert.equal(response.status, 403);
    assert.deepEqual(response.body, {
      error: {
        code: 'EVENT_ACCESS_DENIED',
        message: 'You do not have permission to modify this event.',
      },
    });
  });

  it('rejects ownership changes by both owners and non-owners', async () => {
    const owner = await authenticatedPatch('17').send({ organizerId: 'user_bob' });
    const nonOwner = await authenticatedPatch('17', bobCookie).send({ organizerId: 'user_bob' });
    assert.equal(owner.status, 400);
    assert.equal(nonOwner.status, 403);
    assert.equal((await request(app).get('/api/events/17')).body.data.organizerId, 'user_alice');
  });

  it('returns 404 for a missing event and 400 for a malformed ID', async () => {
    assert.equal((await authenticatedPatch('9999').send({ name: 'No event' })).status, 404);
    assert.equal((await authenticatedPatch('bad').send({ name: 'Bad ID' })).status, 400);
  });

  it('returns 401 for an expired session', async () => {
    now += SESSION_LIFETIME_MS;
    assert.equal((await authenticatedPatch('17', expiredCookie).send({ name: 'Changed' })).status, 401);
  });

  it('does not authenticate a forged X-User-ID header', async () => {
    const response = await request(app)
      .patch('/api/events/17')
      .set('X-User-ID', 'user_alice')
      .set('Origin', trustedOrigin)
      .send({ name: 'Changed' });
    assert.equal(response.status, 401);
  });

  it('rejects authenticated updates from an untrusted origin', async () => {
    const response = await request(app)
      .patch('/api/events/17')
      .set('Cookie', aliceCookie)
      .set('Origin', 'https://attacker.example')
      .send({ name: 'Changed' });
    assert.equal(response.status, 403);
    assert.equal((await request(app).get('/api/events/17')).body.data.name, 'Seattle Trainer League');
  });

  it('leaves the event unchanged after an unauthorized update', async () => {
    const before = (await request(app).get('/api/events/17')).body;
    await authenticatedPatch('17', bobCookie).send({ name: 'Unauthorized Change' });
    assert.deepEqual((await request(app).get('/api/events/17')).body, before);
  });

  it('enforces capacity and request validation for owners', async () => {
    assert.equal((await authenticatedPatch('17').send({ capacity: 19 })).status, 409);
    assert.equal((await authenticatedPatch('17').send({ registered: 0 })).status, 400);
    assert.equal((await request(app).get('/api/events/17')).body.data.capacity, 32);
  });

  it('does not change ownership when valid event fields are updated', async () => {
    const response = await authenticatedPatch('17').send({ name: 'New Name', capacity: 24 });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.organizerId, 'user_alice');
  });
});

describe('event deletion', () => {
  it('requires an authenticated owner to delete an event', async () => {
    assert.equal((await request(app).delete('/api/events/17')).status, 401);
    const denied = await request(app)
      .delete('/api/events/17')
      .set('Cookie', bobCookie)
      .set('Origin', trustedOrigin);
    assert.equal(denied.status, 403);
    const deleted = await request(app)
      .delete('/api/events/17')
      .set('Cookie', aliceCookie)
      .set('Origin', trustedOrigin);
    assert.equal(deleted.status, 204);
  });

  it('keeps event IDs stable after an owner deletes an event', async () => {
    await request(app)
      .delete('/api/events/18')
      .set('Cookie', bobCookie)
      .set('Origin', trustedOrigin);
    const created = await authenticatedPost().send(validNewEvent);
    assert.equal(created.body.data.id, 22);
  });
});

describe('event format reads', () => {
  it('returns events matching every supported format', async () => {
    for (const format of eventFormats) {
      const response = await request(app).get(`/api/events?format=${format}`);
      assert.equal(response.status, 200);
      assert.ok(response.body.data.every((event: Event) => event.format === format));
    }
  });

  it('rejects unsupported and repeated format filters', async () => {
    assert.equal((await request(app).get('/api/events?format=Other')).status, 400);
    assert.equal((await request(app).get('/api/events?format=League&format=Casual')).status, 400);
  });

  it('includes organizer identifiers on every public event', async () => {
    const response = await request(app).get('/api/events');
    response.body.data.forEach(assertEvent);
  });
});
