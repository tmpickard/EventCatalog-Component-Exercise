import express, { type ErrorRequestHandler } from 'express';
import { createEventRoutes } from './routes/eventRoutes.js';
import { createEventService } from './services/eventService.js';
import type { EventService } from './services/eventService.js';
import { invalidEventDataError } from './validation/eventValidation.js';

export function createApp(eventService: EventService = createEventService()) {
  const app = express();

  app.use(express.json());

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/api/events', createEventRoutes(eventService));

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

    console.error('Unhandled HTTP request error:', error);
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
