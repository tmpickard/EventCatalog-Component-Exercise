import { randomBytes } from 'node:crypto';
import type { Session } from '../types/session.js';

export const SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;

export interface SessionService {
  createSession(userId: string): Session;
  getValidSession(id: string): Session | undefined;
  revokeSession(id: string): void;
}

export function createSessionService(now: () => number = Date.now): SessionService {
  const sessions = new Map<string, Session>();

  return {
    createSession(userId) {
      const createdAt = now();
      const session: Session = {
        id: randomBytes(32).toString('base64url'),
        userId,
        createdAt: new Date(createdAt).toISOString(),
        expiresAt: new Date(createdAt + SESSION_LIFETIME_MS).toISOString(),
      };
      sessions.set(session.id, session);
      return { ...session };
    },

    getValidSession(id) {
      const session = sessions.get(id);
      if (session === undefined) {
        return undefined;
      }

      if (Date.parse(session.expiresAt) <= now()) {
        sessions.delete(id);
        return undefined;
      }

      return { ...session };
    },

    revokeSession(id) {
      sessions.delete(id);
    },
  };
}
