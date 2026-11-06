import express, { type ErrorRequestHandler } from 'express';
import { eventRoutes } from './routes/eventRoutes.js';

export const app = express();

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/events', eventRoutes);

app.use((_request, response) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource could not be found.',
    },
  });
});

const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  console.error('Unhandled HTTP request error:', error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred.',
    },
  });
};

app.use(errorHandler);
