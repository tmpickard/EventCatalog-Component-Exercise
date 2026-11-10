import express, { type ErrorRequestHandler } from 'express';
import { createEventRoutes } from './routes/eventRoutes.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { createEventService } from './services/eventService.js';
import type { EventService } from './services/eventService.js';
import { createSessionService } from './services/sessionService.js';
import type { SessionService } from './services/sessionService.js';
import { createUserService } from './services/userService.js';
import type { UserService } from './services/userService.js';
import { invalidEventDataError } from './validation/eventValidation.js';

export interface AppOptions {
  userService?: UserService;
  sessionService?: SessionService;
  trustedOrigin?: string;
  secureCookies?: boolean;
}

export function createApp(
  eventService: EventService = createEventService(),
  options: AppOptions = {},
) {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';
  const trustedOrigin =
    options.trustedOrigin ??
    process.env.TRUSTED_ORIGIN ??
    (isProduction ? undefined : 'http://localhost:5173');
  const secureCookies = options.secureCookies ?? isProduction;

  if (trustedOrigin === undefined) {
    throw new Error('TRUSTED_ORIGIN must be configured for production.');
  }
  const parsedTrustedOrigin = new URL(trustedOrigin);
  if (
    parsedTrustedOrigin.origin !== trustedOrigin ||
    (isProduction && (parsedTrustedOrigin.protocol !== 'https:' || !secureCookies))
  ) {
    throw new Error('Production authentication requires an HTTPS trusted origin and secure cookies.');
  }

  app.use(express.json());

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/api/events', createEventRoutes(eventService));
  app.use(
    '/api/auth',
    createAuthRoutes(
      options.userService ?? createUserService(),
      options.sessionService ?? createSessionService(),
      { secureCookies, trustedOrigin },
    ),
  );

  app.use((_request, response) => {
    response.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource could not be found.',
      },
    });
  });

  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    if (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      error.type === 'entity.parse.failed'
    ) {
      response.status(400).json(invalidEventDataError);
      return;
    }

    console.error(
      'Unhandled HTTP request error:',
      error instanceof Error ? error.name : 'Unknown error',
    );
    response.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected server error occurred.',
      },
    });
  };

  app.use(errorHandler);
  return app;
}

export const app = createApp();
