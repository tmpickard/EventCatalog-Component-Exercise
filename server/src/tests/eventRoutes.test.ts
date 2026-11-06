import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import { app } from '../app.js';
import { eventFormats, type Event } from '../types/event.js';

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
