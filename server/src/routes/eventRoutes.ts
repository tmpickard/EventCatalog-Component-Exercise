import { Router } from 'express';
import { getEventById, getEvents } from '../services/eventService.js';
import { isEventFormat } from '../types/event.js';

export const eventRoutes = Router();

eventRoutes.get('/', (request, response) => {
  const { format } = request.query;

  if (format !== undefined && !isEventFormat(format)) {
    response.status(400).json({
      error: {
        code: 'INVALID_EVENT_FORMAT',
        message: 'The format must be League, Tournament, or Casual.',
      },
    });
    return;
  }

  response.json({ data: getEvents(format) });
});

eventRoutes.get('/:eventId', (request, response) => {
  const { eventId } = request.params;

  if (!/^[0-9]+$/.test(eventId)) {
    response.status(400).json({
      error: {
        code: 'INVALID_EVENT_ID',
        message: 'The event ID must be a positive integer.',
      },
    });
    return;
  }

  const id = Number(eventId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    response.status(400).json({
      error: {
        code: 'INVALID_EVENT_ID',
        message: 'The event ID must be a positive integer.',
      },
    });
    return;
  }

  const event = getEventById(id);
  if (event === undefined) {
    response.status(404).json({
      error: {
        code: 'EVENT_NOT_FOUND',
        message: 'The requested event could not be found.',
      },
    });
    return;
  }

  response.json({ data: event });
});
