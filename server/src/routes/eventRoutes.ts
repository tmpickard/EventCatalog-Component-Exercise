import { Router, type Response } from 'express';
import type { EventService } from '../services/eventService.js';
import { isEventFormat } from '../types/event.js';
import {
  invalidEventDataError,
  validateEventChanges,
  validateNewEvent,
} from '../validation/eventValidation.js';

function parseEventId(value: string): number | undefined {
  if (!/^[0-9]+$/.test(value)) {
    return undefined;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

function sendInvalidEventId(response: Response): void {
  response.status(400).json({
    error: {
      code: 'INVALID_EVENT_ID',
      message: 'The event ID must be a positive integer.',
    },
  });
}

export function createEventRoutes(eventService: EventService): Router {
  const eventRoutes = Router();

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

    response.json({ data: eventService.getEvents(format) });
  });

  eventRoutes.post('/', (request, response) => {
    const input = validateNewEvent(request.body);
    if (input === undefined) {
      response.status(400).json(invalidEventDataError);
      return;
    }

    const event = eventService.createEvent(input);
    response.location(`/api/events/${event.id}`).status(201).json({ data: event });
  });

  eventRoutes.patch('/:eventId', (request, response) => {
    const id = parseEventId(request.params.eventId);
    if (id === undefined) {
      sendInvalidEventId(response);
      return;
    }

    const changes = validateEventChanges(request.body);
    if (changes === undefined) {
      response.status(400).json(invalidEventDataError);
      return;
    }

    const result = eventService.updateEvent(id, changes);
    if (result.status === 'not-found') {
      response.status(404).json({
        error: {
          code: 'EVENT_NOT_FOUND',
          message: 'The requested event could not be found.',
        },
      });
      return;
    }

    if (result.status === 'capacity-conflict') {
      response.status(409).json({
        error: {
          code: 'CAPACITY_CONFLICT',
          message: 'Event capacity cannot be lower than the current registration count.',
        },
      });
      return;
    }

    response.json({ data: result.event });
  });

  eventRoutes.delete('/:eventId', (request, response) => {
    const id = parseEventId(request.params.eventId);
    if (id === undefined) {
      sendInvalidEventId(response);
      return;
    }

    if (!eventService.deleteEvent(id)) {
      response.status(404).json({
        error: {
          code: 'EVENT_NOT_FOUND',
          message: 'The requested event could not be found.',
        },
      });
      return;
    }

    response.status(204).end();
  });

  eventRoutes.get('/:eventId', (request, response) => {
    const id = parseEventId(request.params.eventId);
    if (id === undefined) {
      sendInvalidEventId(response);
      return;
    }

    const event = eventService.getEventById(id);
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

  return eventRoutes;
}
