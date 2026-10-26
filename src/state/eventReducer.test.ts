import { describe, expect, it } from 'vitest';
import eventReducer from './eventReducer';
import type { EventState } from './eventReducer';
import { createTestEvents } from '../test/fixtures/events';

describe('eventReducer', () => {
  it('transitions into loading when a load starts', () => {
    const state = eventReducer(
      { status: 'error', requestId: 1, error: new Error('Previous error') },
      { type: 'loadStarted', requestId: 2 },
    );

    expect(state).toEqual({ status: 'loading', requestId: 2 });
  });

  it('stores the loaded collection for the matching request', () => {
    const events = createTestEvents();
    const state = eventReducer(
      { status: 'loading', requestId: 7 },
      { type: 'loadSucceeded', requestId: 7, events },
    );

    expect(state).toMatchObject({ status: 'success', events });
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.events).toEqual(events);
      expect(state.events).not.toBe(events);
      expect(state.initialEvents).not.toBe(events);
    }
  });

  it('records an error for the matching failed request', () => {
    const error = new Error('Unable to load events');
    const state = eventReducer(
      { status: 'loading', requestId: 3 },
      { type: 'loadFailed', requestId: 3, error },
    );

    expect(state).toEqual({ status: 'error', requestId: 3, error });
  });

  it('ignores results from a stale load request', () => {
    const state: EventState = { status: 'loading', requestId: 9 };

    expect(
      eventReducer(state, {
        type: 'loadSucceeded',
        requestId: 8,
        events: createTestEvents(),
      }),
    ).toBe(state);
    expect(
      eventReducer(state, {
        type: 'loadFailed',
        requestId: 8,
        error: new Error('Stale failure'),
      }),
    ).toBe(state);
  });

  it('adds one new event while preserving existing events', () => {
    const existingEvents = createTestEvents();
    const createdEvent = {
      id: 4,
      name: 'Test Event D',
      city: 'Denver',
      state: 'CO',
      date: '2026-06-01',
      capacity: 20,
      registered: 0,
      format: 'League' as const,
    };
    const state = eventReducer(
      { status: 'success', events: existingEvents, initialEvents: existingEvents },
      { type: 'eventCreated', event: createdEvent },
    );

    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.events).toHaveLength(4);
      expect(state.events[0]).toEqual(createdEvent);
      expect(state.events.slice(1)).toEqual(existingEvents);
      expect(state.events[0]).not.toBe(createdEvent);
    }
  });

  it('updates only the intended event immutably', () => {
    const events = createTestEvents();
    const originalEvents = events.map((event) => ({ ...event }));
    const originalEventReferences = [...events];
    const state = eventReducer(
      { status: 'success', events, initialEvents: createTestEvents() },
      {
        type: 'eventUpdated',
        eventId: 2,
        changes: {
          name: 'Updated Test Event B',
          city: 'Salem',
          state: 'OR',
          date: '2026-05-21',
          capacity: 18,
          format: 'Tournament',
        },
      },
    );

    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.events).not.toBe(events);
      expect(state.events[0]).toBe(originalEventReferences[0]);
      expect(state.events[1]).not.toBe(originalEventReferences[1]);
      expect(state.events[2]).toBe(originalEventReferences[2]);
      expect(state.events[1]).toEqual({
        ...originalEvents[1],
        name: 'Updated Test Event B',
        city: 'Salem',
        state: 'OR',
        date: '2026-05-21',
        capacity: 18,
        format: 'Tournament',
      });
    }
    expect(events).toEqual(originalEvents);
    expect(events[1]).toBe(originalEventReferences[1]);
  });

  it('safely ignores updates for nonexistent events', () => {
    const events = createTestEvents();
    const state: EventState = {
      status: 'success',
      events,
      initialEvents: createTestEvents(),
    };

    expect(
      eventReducer(state, {
        type: 'eventUpdated',
        eventId: 999,
        changes: {
          name: 'No event',
          city: 'Nowhere',
          state: 'NA',
          date: '2026-01-01',
          capacity: 1,
          format: 'Casual',
        },
      }),
    ).toBe(state);
  });

  it('resets events to an independent copy of the initial collection', () => {
    const initialEvents = createTestEvents();
    const changedEvents = createTestEvents();
    changedEvents[0].name = 'Changed';
    const state = eventReducer(
      { status: 'success', events: changedEvents, initialEvents },
      { type: 'eventsReset' },
    );

    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.events).toEqual(initialEvents);
      expect(state.events).not.toBe(initialEvents);
      expect(state.events[0]).not.toBe(initialEvents[0]);
    }
  });

  it('ignores event changes and resets outside the success state', () => {
    const state: EventState = { status: 'loading', requestId: 1 };

    expect(
      eventReducer(state, {
        type: 'eventCreated',
        event: createTestEvents()[0],
      }),
    ).toBe(state);
    expect(
      eventReducer(state, {
        type: 'eventUpdated',
        eventId: 1,
        changes: {
          name: 'Changed',
          city: 'Seattle',
          state: 'WA',
          date: '2026-04-10',
          capacity: 32,
          format: 'League',
        },
      }),
    ).toBe(state);
    expect(eventReducer(state, { type: 'eventsReset' })).toBe(state);
  });
});
