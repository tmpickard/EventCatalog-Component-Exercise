import type { Event, EventUpdate } from '../types/event';

export type EventState =
  | { status: 'loading'; requestId: number }
  | { status: 'success'; events: Event[]; initialEvents: Event[] }
  | { status: 'error'; requestId: number; error: Error };

export type EventAction =
  | { type: 'loadStarted'; requestId: number }
  | { type: 'loadSucceeded'; requestId: number; events: Event[] }
  | { type: 'loadFailed'; requestId: number; error: Error }
  | { type: 'eventCreated'; event: Event }
  | { type: 'eventUpdated'; eventId: number; changes: EventUpdate }
  | { type: 'eventsReset' };

function assertNever(action: never): never {
  throw new Error(`Unsupported event action: ${JSON.stringify(action)}`);
}

export default function eventReducer(
  state: EventState,
  action: EventAction,
): EventState {
  switch (action.type) {
    case 'loadStarted':
      return { status: 'loading', requestId: action.requestId };
    case 'loadSucceeded': {
      if (state.status !== 'loading' || state.requestId !== action.requestId) {
        return state;
      }

      const initialEvents = action.events.map((event) => ({ ...event }));
      return {
        status: 'success',
        events: initialEvents.map((event) => ({ ...event })),
        initialEvents,
      };
    }
    case 'loadFailed':
      return state.status === 'loading' && state.requestId === action.requestId
        ? { status: 'error', requestId: action.requestId, error: action.error }
        : state;
    case 'eventCreated':
      return state.status === 'success'
        ? {
            ...state,
            events: [{ ...action.event }, ...state.events],
          }
        : state;
    case 'eventUpdated': {
      if (state.status !== 'success') {
        return state;
      }

      const eventExists = state.events.some(
        (event) => event.id === action.eventId,
      );
      return eventExists
        ? {
            ...state,
            events: state.events.map((event) =>
              event.id === action.eventId
                ? { ...event, ...action.changes }
                : event,
            ),
          }
        : state;
    }
    case 'eventsReset':
      return state.status === 'success'
        ? {
            ...state,
            events: state.initialEvents.map((event) => ({ ...event })),
          }
        : state;
    default:
      return assertNever(action);
  }
}
