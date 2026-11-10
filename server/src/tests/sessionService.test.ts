import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSessionService, SESSION_LIFETIME_MS } from '../services/sessionService.js';

describe('session service', () => {
  it('creates a cryptographically random session with a 24-hour expiry', () => {
    const createdAt = Date.parse('2026-11-03T16:00:00.000Z');
    const service = createSessionService(() => createdAt);
    const session = service.createSession('user_1');

    assert.match(session.id, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(session.userId, 'user_1');
    assert.equal(session.createdAt, new Date(createdAt).toISOString());
    assert.equal(Date.parse(session.expiresAt) - createdAt, SESSION_LIFETIME_MS);
  });

  it('keeps concurrent sessions independently valid and revocable', () => {
    const service = createSessionService();
    const first = service.createSession('user_1');
    const second = service.createSession('user_1');

    assert.notEqual(first.id, second.id);
    assert.ok(service.getValidSession(first.id));
    assert.ok(service.getValidSession(second.id));

    service.revokeSession(first.id);

    assert.equal(service.getValidSession(first.id), undefined);
    assert.ok(service.getValidSession(second.id));
  });

  it('rejects unknown and expired session identifiers', () => {
    let currentTime = 1_800_000_000_000;
    const service = createSessionService(() => currentTime);
    const session = service.createSession('user_1');

    assert.equal(service.getValidSession('not-a-session'), undefined);
    currentTime += SESSION_LIFETIME_MS;
    assert.equal(service.getValidSession(session.id), undefined);
  });
});
