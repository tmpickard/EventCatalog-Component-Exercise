import type { CreateEventInput } from '../types/event';

export type EventFormValues = Omit<CreateEventInput, 'capacity'> & {
  capacity: string;
};

export type EventFormField = 'name' | 'city' | 'state' | 'date' | 'capacity';
export type EventFormErrors = Partial<Record<EventFormField, string>>;

export function validateEventForm(
  values: EventFormValues,
  registeredParticipants = 0,
): EventFormErrors {
  const errors: EventFormErrors = {};

  if (!values.name.trim()) {
    errors.name = 'Enter an event name.';
  }
  if (!values.city.trim()) {
    errors.city = 'Enter a city.';
  }
  if (!values.state.trim()) {
    errors.state = 'Enter a state.';
  }
  if (!values.date) {
    errors.date = 'Choose a date.';
  }
  if (!values.capacity.trim()) {
    errors.capacity = 'Enter a capacity.';
  } else if (!Number.isFinite(Number(values.capacity)) || Number(values.capacity) <= 0) {
    errors.capacity = 'Capacity must be greater than zero.';
  } else if (Number(values.capacity) < registeredParticipants) {
    errors.capacity = 'Capacity cannot be less than registered participants.';
  }

  return errors;
}
