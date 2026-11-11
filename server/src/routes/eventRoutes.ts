import { Router, type Response } from 'express';
import type { EventService } from '../services/eventService.js';
import type { SessionService } from '../services/sessionService.js';
import { isEventFormat } from '../types/event.js';
import { createAuthenticationMiddleware } from '../middleware/authentication.js';
import { createTrustedOriginMiddleware } from '../middleware/trustedOrigin.js';
import {
  invalidEventDataError,
  isValidOrganizerId,
  validateEventChanges,
  validateNewEvent,
} from '../validation/eventValidation.js';

function parseEventId(value: unknown): number | undefined {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) {
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

function sendEventAccessDenied(response: Response): void {
  response.status(403).json({
    error: {
      code: 'EVENT_ACCESS_DENIED',
      message: 'You do not have permission to modify this event.',
    },
  });
}

export function createEventRoutes(
  eventService: EventService,
  sessionService: SessionService,
  trustedOrigin: string,
): Router {
  const eventRoutes = Router();
  const requireAuthentication = createAuthenticationMiddleware(sessionService);
  const requireTrustedOrigin = createTrustedOriginMiddleware(trustedOrigin);

  eventRoutes.get('/', (request, response) => {
    const { format, organizerId } = request.query;

    if (format !== undefined && !isEventFormat(format)) {
      response.status(400).json({
        error: {
          code: 'INVALID_EVENT_FORMAT',
          message: 'The format must be League, Tournament, or Casual.',
        },
      });
      return;
    }

    if (organizerId !== undefined && !isValidOrganizerId(organizerId)) {
      response.status(400).json({
        error: {
          code: 'INVALID_ORGANIZER_ID',
          message: 'The organizer ID is invalid.',
        },
      });
      return;
    }

    response.json({ data: eventService.getEvents(format, organizerId) });
  });

  eventRoutes.post('/', requireAuthentication, requireTrustedOrigin, (request, response) => {
    const organizerId = request.authenticatedUserId;
    if (organizerId === undefined) {
      response.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required.',
        },
      });
      return;
    }

    const input = validateNewEvent(request.body);
    if (input === undefined) {
      response.status(400).json(invalidEventDataError);
      return;
    }

    const event = eventService.createEvent(input, organizerId);
    response.location(`/api/events/${event.id}`).status(201).json({ data: event });
  });

  eventRoutes.patch(
    '/:eventId',
    requireAuthentication,
    requireTrustedOrigin,
    (request, response) => {
      const organizerId = request.authenticatedUserId;
      if (organizerId === undefined) {
        response.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication is required.',
          },
        });
        return;
      }

      const id = parseEventId(request.params.eventId);
      if (id === undefined) {
        sendInvalidEventId(response);
        return;
      }

      const access = eventService.checkEventOwnership(id, organizerId);
      if (access === 'not-found') {
        response.status(404).json({
          error: {
            code: 'EVENT_NOT_FOUND',
            message: 'The requested event could not be found.',
          },
        });
        return;
      }
      if (access === 'forbidden') {
        sendEventAccessDenied(response);
        return;
      }

      const changes = validateEventChanges(request.body);
      if (changes === undefined) {
        response.status(400).json(invalidEventDataError);
        return;
      }

      const result = eventService.updateEvent(id, organizerId, changes);
      if (result.status === 'not-found') {
        response.status(404).json({
          error: {
            code: 'EVENT_NOT_FOUND',
            message: 'The requested event could not be found.',
          },
        });
        return;
      }

      if (result.status === 'forbidden') {
        sendEventAccessDenied(response);
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
    },
  );

  eventRoutes.delete(
    '/:eventId',
    requireAuthentication,
    requireTrustedOrigin,
    (request, response) => {
      const organizerId = request.authenticatedUserId;
      if (organizerId === undefined) {
        response.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication is required.',
          },
        });
        return;
      }

      const id = parseEventId(request.params.eventId);
      if (id === undefined) {
        sendInvalidEventId(response);
        return;
      }

      const result = eventService.deleteEvent(id, organizerId);
      if (result === 'not-found') {
        response.status(404).json({
          error: {
            code: 'EVENT_NOT_FOUND',
            message: 'The requested event could not be found.',
          },
        });
        return;
      }
      if (result === 'forbidden') {
        sendEventAccessDenied(response);
        return;
      }

      response.status(204).end();
    },
  );

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
