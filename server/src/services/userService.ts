import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import type { NewUser, UserRecord } from '../types/user.js';

const passwordHashOptions = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export class DuplicateEmailError extends Error {
  constructor() {
    super('Email address is already registered.');
    this.name = 'DuplicateEmailError';
  }
}

export interface UserService {
  createUser(input: NewUser): Promise<UserRecord>;
  authenticate(email: string, password: string): Promise<UserRecord | undefined>;
  getById(id: string): UserRecord | undefined;
  getByEmail(email: string): UserRecord | undefined;
}

export function createUserService(now: () => Date = () => new Date()): UserService {
  const usersById = new Map<string, UserRecord>();
  const userIdsByEmail = new Map<string, string>();

  return {
    async createUser(input) {
      const email = input.email.trim().toLowerCase();
      if (userIdsByEmail.has(email)) {
        throw new DuplicateEmailError();
      }

      const passwordHash = await argon2.hash(input.password, passwordHashOptions);
      if (userIdsByEmail.has(email)) {
        throw new DuplicateEmailError();
      }

      const user: UserRecord = {
        id: `user_${randomUUID()}`,
        email,
        displayName: input.displayName.trim(),
        passwordHash,
        createdAt: now().toISOString(),
      };
      usersById.set(user.id, user);
      userIdsByEmail.set(email, user.id);
      return { ...user };
    },

    async authenticate(email, password) {
      const normalizedEmail = email.trim().toLowerCase();
      const userId = userIdsByEmail.get(normalizedEmail);
      const user = userId === undefined ? undefined : usersById.get(userId);
      if (user === undefined) {
        await argon2.hash(password, passwordHashOptions);
        return undefined;
      }

      return (await argon2.verify(user.passwordHash, password)) ? { ...user } : undefined;
    },

    getById(id) {
      const user = usersById.get(id);
      return user === undefined ? undefined : { ...user };
    },

    getByEmail(email) {
      const userId = userIdsByEmail.get(email.trim().toLowerCase());
      const user = userId === undefined ? undefined : usersById.get(userId);
      return user === undefined ? undefined : { ...user };
    },
  };
}
