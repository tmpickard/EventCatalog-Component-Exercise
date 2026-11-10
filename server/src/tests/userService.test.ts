import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createUserService } from '../services/userService.js';

const password = 'Example-Only-Password-2026!';

describe('user service', () => {
  it('creates stable server-generated user identity and ISO timestamps', async () => {
    const service = createUserService(() => new Date('2026-11-03T16:00:00.000Z'));
    const user = await service.createUser({
      email: ' User@Example.com ',
      displayName: ' Organizer ',
      password,
    });

    assert.equal(user.email, 'user@example.com');
    assert.equal(user.displayName, 'Organizer');
    assert.match(user.id, /^user_[0-9a-f-]{36}$/);
    assert.equal(user.createdAt, '2026-11-03T16:00:00.000Z');
    assert.equal(service.getById(user.id)?.id, user.id);
  });

  it('verifies a correct password and rejects an incorrect password', async () => {
    const service = createUserService();
    const user = await service.createUser({
      email: 'user@example.com',
      displayName: 'Organizer',
      password,
    });

    assert.equal((await service.authenticate(user.email, password))?.id, user.id);
    assert.equal(await service.authenticate(user.email, 'Incorrect-Password-123!'), undefined);
  });

  it('rejects duplicate normalized addresses even when registrations race', async () => {
    const service = createUserService();
    const input = { email: 'user@example.com', displayName: 'Organizer', password };
    const results = await Promise.allSettled([
      service.createUser(input),
      service.createUser({ ...input, email: ' USER@example.com ' }),
    ]);

    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
    assert.ok(service.getByEmail(input.email));
  });
});
