import { describe, expect, it } from 'vitest';
import { filterEvents, sortEvents } from './eventSelectors';
import { createTestEvents } from '../test/fixtures/events';

describe('event selectors', () => {
  it('filters events to the selected format', () => {
    const events = createTestEvents();

    expect(
      filterEvents(events, { type: 'tournament' }).map((event) => event.id),
    ).toEqual([2]);
  });

  it('searches names, locations, and state codes without case sensitivity', () => {
    const events = createTestEvents();

    expect(
      filterEvents(events, { search: '  PORTLAND ' }).map((event) => event.id),
    ).toEqual([2]);
    expect(
      filterEvents(events, { search: 'test event c' }).map((event) => event.id),
    ).toEqual([3]);
  });

  it('sorts chronologically without mutating the source collection', () => {
    const events = createTestEvents();
    const sorted = sortEvents(events, 'date-asc');

    expect(sorted.map((event) => event.id)).toEqual([3, 1, 2]);
    expect(events.map((event) => event.id)).toEqual([1, 2, 3]);
    expect(sorted).not.toBe(events);
  });
});
