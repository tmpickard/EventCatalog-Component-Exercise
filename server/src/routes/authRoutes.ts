import { Router } from 'express';
import type { UserService } from '../services/userService.js';
import { DuplicateEmailError } from '../services/userService.js';
import type { SessionService } from '../services/sessionService.js';
import { SESSION_LIFETIME_MS } from '../services/sessionService.js';
import {
  createAuthenticationMiddleware,
  readSessionCookie,
  SESSION_COOKIE_NAME,
} from '../middleware/authentication.js';
import { toPublicUser } from '../types/user.js';
import {
  invalidAuthDataError,
  validateLogin,
  validateRegistration,
} from '../validation/authValidation.js';

const invalidCredentialsError = {
  error: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password.',
  },
};

const sessionRequiredError = {
  error: {
    code: 'AUTHENTICATION_REQUIRED',
    message: 'Authentication is required.',
  },
};

const originNotAllowedError = {
  error: {
    code: 'ORIGIN_NOT_ALLOWED',
    message: 'The request origin is not allowed.',
  },
};

interface AuthRouteOptions {
  secureCookies: boolean;
  trustedOrigin: string;
}

export function createAuthRoutes(
  userService: UserService,
  sessionService: SessionService,
  options: AuthRouteOptions,
): Router {
  const authRoutes = Router();
  const requireAuthentication = createAuthenticationMiddleware(sessionService);

  authRoutes.post('/register', async (request, response) => {
    const input = validateRegistration(request.body);
    if (input === undefined) {
      response.status(400).json(invalidAuthDataError);
      return;
    }

    try {
      const user = await userService.createUser(input);
      response.status(201).json({ data: toPublicUser(user) });
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        response.status(409).json({
          error: {
            code: 'EMAIL_ALREADY_REGISTERED',
            message: 'An account with this email address already exists.',
          },
        });
        return;
      }
      throw error;
    }
  });

  authRoutes.post('/login', async (request, response) => {
    const credentials = validateLogin(request.body);
    if (credentials === undefined) {
      response.status(400).json(invalidAuthDataError);
      return;
    }

    const user = await userService.authenticate(credentials.email, credentials.password);
    if (user === undefined) {
      response.status(401).json(invalidCredentialsError);
      return;
    }

    const session = sessionService.createSession(user.id);
    response.cookie(SESSION_COOKIE_NAME, session.id, {
      httpOnly: true,
      secure: options.secureCookies,
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_LIFETIME_MS,
    });
    response.json({ data: toPublicUser(user) });
  });

  authRoutes.get('/me', requireAuthentication, (request, response) => {
    const userId = request.authenticatedUserId;
    const user = userId === undefined ? undefined : userService.getById(userId);
    if (user === undefined) {
      response.status(401).json(sessionRequiredError);
      return;
    }

    response.json({ data: toPublicUser(user) });
  });

  authRoutes.post('/logout', (request, response) => {
    const sessionId = readSessionCookie(request.headers.cookie);
    const session = sessionId === undefined ? undefined : sessionService.getValidSession(sessionId);
    if (session !== undefined) {
      if (request.get('origin') !== options.trustedOrigin) {
        response.status(403).json(originNotAllowedError);
        return;
      }
      sessionService.revokeSession(session.id);
    }

    response.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: options.secureCookies,
      sameSite: 'strict',
      path: '/',
    });
    response.status(204).end();
  });

  return authRoutes;
}
