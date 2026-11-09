import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../app.js';
import { createEventService } from '../services/eventService.js';
import { eventFormats, type Event } from '../types/event.js';

let app = createApp(createEventService());

beforeEach(() => {
  app = createApp(createEventService());
});

interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

function assertErrorResponse(body: ApiError, code: string, message: string): void {
  assert.deepEqual(body, { error: { code, message } });
}

function isEvent(value: unknown): value is Event {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.name === 'string' &&
    typeof candidate.city === 'string' &&
    typeof candidate.state === 'string' &&
    typeof candidate.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(candidate.date) &&
    typeof candidate.capacity === 'number' &&
    typeof candidate.registered === 'number' &&
    typeof candidate.format === 'string' &&
    eventFormats.some((format) => format === candidate.format)
  );
}

describe('GET /health', () => {
  it('returns a successful JSON health response', async () => {
    const response = await request(app).get('/health');

    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'] ?? '', /application\/json/);
    assert.deepEqual(response.body, { status: 'ok' });
  });
});

describe('GET /api/events', () => {
  it('returns the complete event collection', async () => {
    const response = await request(app).get('/api/events');

    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'] ?? '', /application\/json/);
    assert.equal(response.body.data.length, 5);
  });

  it('returns events in an array', async () => {
    const response = await request(app).get('/api/events');

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body.data));
  });

  it('returns events satisfying the event model', async () => {
    const response = await request(app).get('/api/events');

    assert.equal(response.status, 200);
    assert.ok(response.body.data.every(isEvent));
  });

  it('returns every seeded event regardless of array position', async () => {
    const response = await request(app).get('/api/events');

    assert.deepEqual(
      response.body.data.map((event: Event) => event.id),
      [17, 18, 19, 20, 21],
    );
  });

  it('filters events by each supported format', async () => {
    for (const format of eventFormats) {
      const response = await request(app).get(`/api/events?format=${format}`);

      assert.equal(response.status, 200);
      assert.ok(response.body.data.length > 0);
      assert.ok(response.body.data.every((event: Event) => event.format === format));
    }
  });

  it('rejects unsupported formats with the standard error contract', async () => {
    const response = await request(app).get('/api/events?format=Other');

    assert.equal(response.status, 400);
    assert.match(response.headers['content-type'] ?? '', /application\/json/);
    assertErrorResponse(
      response.body as ApiError,
      'INVALID_EVENT_FORMAT',
      'The format must be League, Tournament, or Casual.',
    );
  });

  it('rejects repeated format parameters', async () => {
    const response = await request(app).get('/api/events?format=League&format=Casual');

    assert.equal(response.status, 400);
    assert.equal((response.body as ApiError).error.code, 'INVALID_EVENT_FORMAT');
  });
});

describe('GET /api/events/:eventId', () => {
  it('returns the requested event by its numeric ID', async () => {
    const response = await request(app).get('/api/events/17');

    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'] ?? '', /application\/json/);
    assert.deepEqual(response.body.data, {
      id: 17,
      name: 'Seattle Trainer League',
      city: 'Seattle',
      state: 'WA',
      date: '2026-11-14',
      capacity: 32,
      registered: 20,
      format: 'League',
    });
  });
});

const validNewEvent = {
  name: 'Seattle Autumn Trainer League',
  city: 'Seattle',
  state: 'WA',
  date: '2026-11-14',
  capacity: 32,
  format: 'League',
};

describe('POST /api/events', () => {
  it('creates an event with a server-generated ID, zero registrations, and a Location header', async () => {
    const response = await request(app).post('/api/events').send(validNewEvent);

    assert.equal(response.status, 201);
    assert.deepEqual(response.body.data, {
      ...validNewEvent,
      id: 22,
      registered: 0,
    });
    assert.equal(response.headers.location, '/api/events/22');
  });

  it('makes a created event immediately visible through both GET endpoints', async () => {
    const created = await request(app).post('/api/events').send(validNewEvent);

    const collection = await request(app).get('/api/events');
    const single = await request(app).get(`/api/events/${created.body.data.id}`);

    assert.equal(collection.body.data.length, 6);
    assert.deepEqual(collection.body.data.at(-1), created.body.data);
    assert.deepEqual(single.body.data, created.body.data);
  });

  it('creates another event with a distinct ID for a repeated request', async () => {
    const first = await request(app).post('/api/events').send(validNewEvent);
    const second = await request(app).post('/api/events').send(validNewEvent);

    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.notEqual(first.body.data.id, second.body.data.id);
  });

  const invalidCases: Array<[string, Record<string, unknown>]> = [
    ['empty name', { ...validNewEvent, name: '   ' }],
    ['zero capacity', { ...validNewEvent, capacity: 0 }],
    ['unsupported format', { ...validNewEvent, format: 'Other' }],
    ['client-supplied ID', { ...validNewEvent, id: 99 }],
    ['invalid calendar date', { ...validNewEvent, date: '2026-02-30' }],
    ['unsupported state', { ...validNewEvent, state: 'XX' }],
    ['missing required field', { ...validNewEvent, city: undefined }],
  ];

  for (const [description, body] of invalidCases) {
    it(`rejects ${description} without changing stored data`, async () => {
      const before = await request(app).get('/api/events');
      const response = await request(app).post('/api/events').send(body);
      const after = await request(app).get('/api/events');

      assert.equal(response.status, 400);
      assertErrorResponse(
        response.body as ApiError,
        'INVALID_EVENT_DATA',
        'The supplied event information is invalid.',
      );
      assert.deepEqual(after.body, before.body);
    });
  }

  it('rejects malformed JSON using the standard invalid-data response', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Content-Type', 'application/json')
      .send('{');

    assert.equal(response.status, 400);
    assertErrorResponse(
      response.body as ApiError,
      'INVALID_EVENT_DATA',
      'The supplied event information is invalid.',
    );
  });
});

describe('PATCH /api/events/:eventId', () => {
  it('updates the event name and retains its identity and registration count', async () => {
    const response = await request(app).patch('/api/events/17').send({ name: 'Updated League' });

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
    });
  });

  it('updates capacity and preserves unspecified fields', async () => {
    const response = await request(app).patch('/api/events/17').send({ capacity: 48 });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.capacity, 48);
    assert.equal(response.body.data.name, 'Seattle Trainer League');
    assert.equal(response.body.data.registered, 20);
  });

  it('updates multiple fields in place and makes the complete event visible through GET', async () => {
    const response = await request(app)
      .patch('/api/events/17')
      .send({ name: 'Seattle Championship Trainer League', capacity: 48 });

    const collection = await request(app).get('/api/events');
    const single = await request(app).get('/api/events/17');

    assert.equal(response.status, 200);
    assert.equal(collection.body.data.length, 5);
    assert.deepEqual(single.body.data, response.body.data);
    assert.equal(single.body.data.city, 'Seattle');
    assert.equal(single.body.data.registered, 20);
  });

  it('returns 404 for a nonexistent event', async () => {
    const response = await request(app).patch('/api/events/9999').send({ name: 'Updated' });
    assert.equal(response.status, 404);
    assert.equal((response.body as ApiError).error.code, 'EVENT_NOT_FOUND');
  });

  it('rejects capacity below current registrations with a conflict', async () => {
    const response = await request(app).patch('/api/events/17').send({ capacity: 19 });

    assert.equal(response.status, 409);
    assertErrorResponse(
      response.body as ApiError,
      'CAPACITY_CONFLICT',
      'Event capacity cannot be lower than the current registration count.',
    );
    assert.equal((await request(app).get('/api/events/17')).body.data.capacity, 32);
  });

  it('allows capacity equal to current registrations', async () => {
    const response = await request(app).patch('/api/events/17').send({ capacity: 20 });
    assert.equal(response.status, 200);
    assert.equal(response.body.data.capacity, 20);
  });

  it('rejects direct registration-count changes and unknown fields', async () => {
    for (const body of [{ registered: 0 }, { id: 18 }, { unknown: true }]) {
      const response = await request(app).patch('/api/events/17').send(body);
      assert.equal(response.status, 400);
      assert.equal((response.body as ApiError).error.code, 'INVALID_EVENT_DATA');
    }

    assert.equal((await request(app).get('/api/events/17')).body.data.registered, 20);
  });

  it('rejects an empty patch', async () => {
    const response = await request(app).patch('/api/events/17').send({});
    assert.equal(response.status, 400);
    assert.equal((response.body as ApiError).error.code, 'INVALID_EVENT_DATA');
  });

  it('validates every supplied field', async () => {
    const response = await request(app)
      .patch('/api/events/17')
      .send({ name: 'Valid Name', date: '2026-02-30' });

    assert.equal(response.status, 400);
    assert.equal((await request(app).get('/api/events/17')).body.data.name, 'Seattle Trainer League');
  });

  it('returns 400 for an invalid identifier', async () => {
    const response = await request(app).patch('/api/events/not-an-id').send({ name: 'Updated' });
    assert.equal(response.status, 400);
    assert.equal((response.body as ApiError).error.code, 'INVALID_EVENT_ID');
  });
});

describe('DELETE /api/events/:eventId', () => {
  it('deletes an event without renumbering remaining IDs', async () => {
    const response = await request(app).delete('/api/events/18');

    assert.equal(response.status, 204);
    assert.equal(response.text, '');
    assert.equal((await request(app).get('/api/events/18')).status, 404);
    assert.deepEqual(
      (await request(app).get('/api/events')).body.data.map((event: Event) => event.id),
      [17, 19, 20, 21],
    );
    const created = await request(app).post('/api/events').send(validNewEvent);
    assert.equal(created.body.data.id, 22);
  });

  it('returns 404 when deleting a nonexistent event', async () => {
    const response = await request(app).delete('/api/events/9999');
    assert.equal(response.status, 404);
    assert.equal((response.body as ApiError).error.code, 'EVENT_NOT_FOUND');
  });

  it('returns 400 for an invalid identifier', async () => {
    const response = await request(app).delete('/api/events/1.5');
    assert.equal(response.status, 400);
    assert.equal((response.body as ApiError).error.code, 'INVALID_EVENT_ID');
  });
});

describe('GET /api/events/:eventId errors', () => {
  it('returns 404 and the standard error contract for an unknown event', async () => {
    const response = await request(app).get('/api/events/9999');

    assert.equal(response.status, 404);
    assert.match(response.headers['content-type'] ?? '', /application\/json/);
    assertErrorResponse(
      response.body as ApiError,
      'EVENT_NOT_FOUND',
      'The requested event could not be found.',
    );
  });

  it('rejects alphabetic identifiers', async () => {
    const response = await request(app).get('/api/events/abc');

    assert.equal(response.status, 400);
    assert.equal((response.body as ApiError).error.code, 'INVALID_EVENT_ID');
  });

  it('rejects zero', async () => {
    const response = await request(app).get('/api/events/0');

    assert.equal(response.status, 400);
    assert.equal((response.body as ApiError).error.code, 'INVALID_EVENT_ID');
  });

  it('rejects negative identifiers', async () => {
    const response = await request(app).get('/api/events/-5');

    assert.equal(response.status, 400);
    assert.equal((response.body as ApiError).error.code, 'INVALID_EVENT_ID');
  });

  it('rejects identifiers with trailing characters', async () => {
    const response = await request(app).get('/api/events/17abc');

    assert.equal(response.status, 400);
    assert.equal((response.body as ApiError).error.code, 'INVALID_EVENT_ID');
  });

  it('rejects fractional identifiers', async () => {
    const response = await request(app).get('/api/events/1.5');

    assert.equal(response.status, 400);
    assert.equal((response.body as ApiError).error.code, 'INVALID_EVENT_ID');
  });

  it('rejects integers outside the safe JavaScript range', async () => {
    const response = await request(app).get('/api/events/9007199254740992');

    assert.equal(response.status, 400);
    assert.equal((response.body as ApiError).error.code, 'INVALID_EVENT_ID');
  });
});
