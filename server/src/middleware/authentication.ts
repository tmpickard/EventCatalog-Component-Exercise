import type { RequestHandler } from 'express';
import type { SessionService } from '../services/sessionService.js';

export const SESSION_COOKIE_NAME = 'trainer_session';

export function readSessionCookie(cookieHeader: string | undefined): string | undefined {
  if (cookieHeader === undefined) {
    return undefined;
  }

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1 || part.slice(0, separator).trim() !== SESSION_COOKIE_NAME) {
      continue;
    }

    const value = part.slice(separator + 1).trim();
    return value.length > 0 ? value : undefined;
  }

  return undefined;
}

export function createAuthenticationMiddleware(
  sessionService: SessionService,
): RequestHandler {
  return (request, response, next) => {
    const sessionId = readSessionCookie(request.headers.cookie);
    const session = sessionId === undefined ? undefined : sessionService.getValidSession(sessionId);
    if (session === undefined) {
      response.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.',
        },
      });
      return;
    }

    request.authenticatedUserId = session.userId;
    next();
  };
}
