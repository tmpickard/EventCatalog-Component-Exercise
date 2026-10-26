import { describe, expect, it } from 'vitest';
import { validateEventForm } from './eventValidation';
import validateEvents from '../utils/validateEvents';
import { createTestEvents } from '../test/fixtures/events';
import type { EventFormValues } from './eventValidation';

function createFormValues(
  overrides: Partial<EventFormValues> = {},
): EventFormValues {
  return {
    name: 'Valid Event',
    city: 'Seattle',
    state: 'WA',
    date: '2026-04-10',
    capacity: '20',
    format: 'League',
    ...overrides,
  };
}

describe('event validation', () => {
  it('accepts a positive event capacity', () => {
    expect(validateEventForm(createFormValues())).toEqual({});
  });

  it.each(['0', '-1'])('rejects capacity %s', (capacity) => {
    expect(validateEventForm(createFormValues({ capacity }))).toMatchObject({
      capacity: 'Capacity must be greater than zero.',
    });
  });

  it('accepts capacity above or equal to registered participants', () => {
    expect(
      validateEventForm(createFormValues({ capacity: '13' }), 12),
    ).toEqual({});
    expect(
      validateEventForm(createFormValues({ capacity: '12' }), 12),
    ).toEqual({});
  });

  it('rejects capacity below registered participants', () => {
    expect(
      validateEventForm(createFormValues({ capacity: '11' }), 12),
    ).toMatchObject({
      capacity: 'Capacity cannot be less than registered participants.',
    });
  });

  it('rejects an empty required event name', () => {
    expect(validateEventForm(createFormValues({ name: '  ' }))).toHaveProperty(
      'name',
      'Enter an event name.',
    );
  });

  it('rejects a missing required event location', () => {
    const errors = validateEventForm(
      createFormValues({ city: '', state: '' }),
    );

    expect(errors).toMatchObject({
      city: 'Enter a city.',
      state: 'Enter a state.',
    });
  });

  it('rejects an unsupported event format at the runtime data boundary', () => {
    const invalidFormatEvent: Record<string, unknown> = {
      ...createTestEvents()[0],
      format: 'Workshop',
    };

    expect(() => validateEvents([invalidFormatEvent])).toThrow(
      'Event at index 0 contains invalid data.',
    );
  });
});
