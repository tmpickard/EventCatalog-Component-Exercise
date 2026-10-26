import { describe, expect, it } from 'vitest';
import eventReducer from './eventReducer';
import { createTestEvents } from '../test/fixtures';

describe('eventReducer', () => {
  it('updates an event immutably while retaining the initial loaded collection', () => {
    const initialEvents = createTestEvents();
    const loadedState = eventReducer(
      { status: 'loading', requestId: 1 },
      { type: 'loadSucceeded', requestId: 1, events: initialEvents },
    );

    expect(loadedState.status).toBe('success');
    if (loadedState.status !== 'success') {
      throw new Error('Expected the event collection to load successfully.');
    }

    const updatedState = eventReducer(loadedState, {
      type: 'eventUpdated',
      eventId: 17,
      changes: {
        name: 'Updated Seattle League',
        city: 'Seattle',
        state: 'WA',
        date: '2026-11-14',
        capacity: 40,
        format: 'League',
      },
    });

    expect(updatedState.status).toBe('success');
    if (updatedState.status !== 'success') {
      throw new Error('Expected the event collection to remain loaded.');
    }

    expect(updatedState.events[0]).toMatchObject({
      id: 17,
      name: 'Updated Seattle League',
      capacity: 40,
      registered: 20,
    });
    expect(updatedState.initialEvents[0].name).toBe('Seattle Trainer League');
    expect(loadedState.events[0].name).toBe('Seattle Trainer League');
    expect(initialEvents[0].name).toBe('Seattle Trainer League');
  });
});
