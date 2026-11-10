import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../app.js';
import { createSessionService } from '../services/sessionService.js';
import type { SessionService } from '../services/sessionService.js';
import { createUserService } from '../services/userService.js';
import type { UserService } from '../services/userService.js';

const trustedOrigin = 'http://localhost:5173';
const validRegistration = {
  email: 'organizer@example.com',
  displayName: 'Seattle Organizer',
  password: 'Example-Only-Password-2026!',
};
const expectedPublicUser = {
  id: 'user_placeholder',
  email: 'organizer@example.com',
  displayName: 'Seattle Organizer',
  createdAt: '2026-11-03T16:00:00.000Z',
};

let now: number;
let userService: UserService;
let sessionService: SessionService;
let app: ReturnType<typeof createApp>;

function resetApp(secureCookies = false): void {
  now = Date.parse('2026-11-03T16:00:00.000Z');
  userService = createUserService(() => new Date(now));
  sessionService = createSessionService(() => now);
  app = createApp(undefined, {
    userService,
    sessionService,
    trustedOrigin,
    secureCookies,
  });
}

function sessionCookie(response: request.Response): string {
  return getSetCookie(response).split(';', 1)[0]!;
}

function getSetCookie(response: request.Response): string {
  const header = response.headers['set-cookie'];
  assert.ok(header, 'response should set a cookie');
  const cookie = Array.isArray(header) ? header[0] : header;
  assert.ok(cookie);
  return cookie;
}

async function registerUser(
  body: Record<string, unknown> = validRegistration,
): Promise<request.Response> {
  return request(app).post('/api/auth/register').send(body);
}

async function loginUser(
  credentials = { email: validRegistration.email, password: validRegistration.password },
): Promise<request.Response> {
  return request(app).post('/api/auth/login').send(credentials);
}

beforeEach(() => resetApp());

describe('POST /api/auth/register', () => {
  it('creates a valid user and returns only the public representation', async () => {
    const response = await registerUser();

    assert.equal(response.status, 201);
    assert.deepEqual(response.body.data, {
      ...expectedPublicUser,
      id: response.body.data.id,
    });
    assert.match(response.body.data.id, /^user_[0-9a-f-]{36}$/);
    assert.equal('passwordHash' in response.body.data, false);
    assert.equal(response.headers['set-cookie'], undefined);
  });

  it('normalizes email and display name before storage', async () => {
    const response = await registerUser({
      ...validRegistration,
      email: '  ORGANIZER@Example.COM ',
      displayName: '  Seattle Organizer  ',
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.email, 'organizer@example.com');
    assert.equal(response.body.data.displayName, 'Seattle Organizer');
  });

  it('rejects duplicate email addresses after normalization', async () => {
    assert.equal((await registerUser()).status, 201);
    const duplicate = await registerUser({ ...validRegistration, email: ' ORGANIZER@EXAMPLE.COM ' });

    assert.equal(duplicate.status, 409);
    assert.deepEqual(duplicate.body, {
      error: {
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'An account with this email address already exists.',
      },
    });
  });

  it('rejects malformed email addresses', async () => {
    const response = await registerUser({ ...validRegistration, email: 'not-an-email' });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'INVALID_AUTH_DATA');
  });

  it('rejects passwords shorter than 12 characters', async () => {
    const response = await registerUser({ ...validRegistration, password: 'short' });
    assert.equal(response.status, 400);
  });

  it('rejects passwords longer than 128 characters', async () => {
    const response = await registerUser({ ...validRegistration, password: 'a'.repeat(129) });
    assert.equal(response.status, 400);
  });

  it('rejects display names outside the trimmed length boundaries', async () => {
    for (const displayName of [' A ', ` ${'a'.repeat(61)} `]) {
      const response = await registerUser({ ...validRegistration, displayName });
      assert.equal(response.status, 400);
    }
  });

  it('rejects client-supplied internal fields', async () => {
    const response = await registerUser({
      ...validRegistration,
      id: 'user_client',
      passwordHash: 'plaintext',
      createdAt: '2020-01-01T00:00:00.000Z',
    });

    assert.equal(response.status, 400);
    assert.equal(userService.getByEmail(validRegistration.email), undefined);
  });

  it('stores a one-way Argon2id password hash, not the plaintext password', async () => {
    assert.equal((await registerUser()).status, 201);
    const user = userService.getByEmail(validRegistration.email);

    assert.ok(user);
    assert.match(user.passwordHash, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    assert.notEqual(user.passwordHash, validRegistration.password);
    assert.equal(user.passwordHash.includes(validRegistration.password), false);
  });

  it('generates independent salts for the same password', async () => {
    await registerUser();
    await registerUser({ ...validRegistration, email: 'second@example.com' });

    const first = userService.getByEmail(validRegistration.email);
    const second = userService.getByEmail('second@example.com');
    assert.ok(first && second);
    assert.notEqual(first.passwordHash, second.passwordHash);
  });

  it('creates exactly one account per successful registration', async () => {
    await registerUser();
    await registerUser({ ...validRegistration, email: 'second@example.com' });

    assert.ok(userService.getByEmail(validRegistration.email));
    assert.ok(userService.getByEmail('second@example.com'));
    assert.equal(userService.getById('user_client'), undefined);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registerUser();
  });

  it('authenticates valid credentials without exposing a hash or session ID', async () => {
    const response = await loginUser();
    const cookie = sessionCookie(response);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data, {
      ...expectedPublicUser,
      id: response.body.data.id,
    });
    assert.equal('passwordHash' in response.body.data, false);
    assert.equal(JSON.stringify(response.body).includes(cookie.split('=')[1]!), false);
  });

  it('sets the required cookie attributes in local HTTP development', async () => {
    const response = await loginUser();
    const cookie = getSetCookie(response);

    assert.match(cookie, /^trainer_session=/);
    assert.match(cookie, /;\s*HttpOnly/i);
    assert.match(cookie, /;\s*SameSite=Strict/i);
    assert.match(cookie, /;\s*Path=\//i);
    assert.match(cookie, /;\s*Max-Age=86400/i);
    assert.doesNotMatch(cookie, /;\s*Secure/i);
  });

  it('marks the session cookie Secure when secure cookies are configured', async () => {
    resetApp(true);
    await registerUser();
    const response = await loginUser();

    assert.match(getSetCookie(response), /;\s*Secure/i);
  });

  it('returns the same generic error for an incorrect password', async () => {
    const response = await loginUser({ email: validRegistration.email, password: 'Wrong-Password-123!' });

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
    });
    assert.equal(response.headers['set-cookie'], undefined);
  });

  it('returns the same generic error for an unknown email', async () => {
    const response = await loginUser({ email: 'unknown@example.com', password: validRegistration.password });

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
    });
    assert.equal(response.headers['set-cookie'], undefined);
  });

  it('rejects malformed login bodies', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: validRegistration.email, password: validRegistration.password, id: 'user_spoofed' });

    assert.equal(response.status, 400);
    assert.equal(response.headers['set-cookie'], undefined);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the public identity associated with a valid session', async () => {
    const registered = await registerUser();
    const login = await loginUser();
    const response = await request(app).get('/api/auth/me').set('Cookie', sessionCookie(login));

    assert.equal(response.status, 200);
    assert.equal(response.body.data.id, registered.body.data.id);
    assert.equal(response.body.data.email, validRegistration.email);
    assert.equal('passwordHash' in response.body.data, false);
  });

  it('rejects a missing session', async () => {
    const response = await request(app).get('/api/auth/me');
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, {
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication is required.' },
    });
  });

  it('rejects an unknown session identifier', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'trainer_session=unknown-session');
    assert.equal(response.status, 401);
  });

  it('rejects a session after server-side expiration', async () => {
    await registerUser();
    const login = await loginUser();
    now += 24 * 60 * 60 * 1000;

    const response = await request(app).get('/api/auth/me').set('Cookie', sessionCookie(login));
    assert.equal(response.status, 401);
  });

  it('does not trust a client-supplied user ID', async () => {
    const response = await request(app)
      .get('/api/auth/me?userId=user_spoofed')
      .send({ userId: 'user_spoofed' });
    assert.equal(response.status, 401);
  });

  it('keeps sessions for different users isolated', async () => {
    const firstRegistration = await registerUser();
    const firstLogin = await loginUser();
    await registerUser({ ...validRegistration, email: 'second@example.com', displayName: 'Second Organizer' });
    const secondLogin = await loginUser({
      email: 'second@example.com',
      password: validRegistration.password,
    });

    const firstMe = await request(app).get('/api/auth/me').set('Cookie', sessionCookie(firstLogin));
    const secondMe = await request(app).get('/api/auth/me').set('Cookie', sessionCookie(secondLogin));

    assert.equal(firstMe.body.data.id, firstRegistration.body.data.id);
    assert.equal(firstMe.body.data.email, validRegistration.email);
    assert.equal(secondMe.body.data.email, 'second@example.com');
    assert.notEqual(firstMe.body.data.id, secondMe.body.data.id);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the server session and clears the browser cookie', async () => {
    await registerUser();
    const login = await loginUser();
    const cookie = sessionCookie(login);
    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', trustedOrigin);

    assert.equal(logout.status, 204);
    assert.equal(logout.text, '');
    assert.match(getSetCookie(logout), /trainer_session=/);
    assert.match(getSetCookie(logout), /;\s*Path=\//i);
    assert.match(getSetCookie(logout), /;\s*SameSite=Strict/i);
    assert.equal((await request(app).get('/api/auth/me').set('Cookie', cookie)).status, 401);
  });

  it('returns 204 when no valid session exists', async () => {
    const response = await request(app).post('/api/auth/logout');
    assert.equal(response.status, 204);
    assert.equal(response.text, '');
  });

  it('rejects authenticated logout from an untrusted origin without revoking the session', async () => {
    await registerUser();
    const login = await loginUser();
    const cookie = sessionCookie(login);
    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', 'https://attacker.example');

    assert.equal(logout.status, 403);
    assert.equal((await request(app).get('/api/auth/me').set('Cookie', cookie)).status, 200);
  });

  it('rejects an absent origin for an authenticated state-changing request', async () => {
    await registerUser();
    const login = await loginUser();
    const cookie = sessionCookie(login);
    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie);

    assert.equal(logout.status, 403);
    assert.equal((await request(app).get('/api/auth/me').set('Cookie', cookie)).status, 200);
  });

  it('revokes only the logged-out session when one user has multiple sessions', async () => {
    await registerUser();
    const firstLogin = await loginUser();
    const secondLogin = await loginUser();
    const firstCookie = sessionCookie(firstLogin);
    const secondCookie = sessionCookie(secondLogin);
    assert.notEqual(firstCookie, secondCookie);

    await request(app).post('/api/auth/logout').set('Cookie', firstCookie).set('Origin', trustedOrigin);

    assert.equal((await request(app).get('/api/auth/me').set('Cookie', firstCookie)).status, 401);
    assert.equal((await request(app).get('/api/auth/me').set('Cookie', secondCookie)).status, 200);
  });
});

describe('authentication production configuration', () => {
  it('requires an HTTPS trusted origin and Secure cookies in production', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalTrustedOrigin = process.env.TRUSTED_ORIGIN;

    try {
      process.env.NODE_ENV = 'production';
      process.env.TRUSTED_ORIGIN = 'http://example.com';
      assert.throws(() => createApp(), /HTTPS trusted origin and secure cookies/);

      process.env.TRUSTED_ORIGIN = 'https://example.com';
      assert.throws(
        () => createApp(undefined, { secureCookies: false }),
        /HTTPS trusted origin and secure cookies/,
      );
      assert.doesNotThrow(() => createApp(undefined, { secureCookies: true }));
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }

      if (originalTrustedOrigin === undefined) {
        delete process.env.TRUSTED_ORIGIN;
      } else {
        process.env.TRUSTED_ORIGIN = originalTrustedOrigin;
      }
    }
  });
});
