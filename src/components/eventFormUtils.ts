import type { ChangeEvent } from 'react';
import type { CreateEventInput, Event, EventFormat } from '../types/event';
import type { EventFormValues } from '../domain/eventValidation';

export type { EventFormValues } from '../domain/eventValidation';

export type EventFormMode =
  | { type: 'create' }
  | { type: 'edit'; event: Event };

export const emptyForm: EventFormValues = {
  name: '',
  city: '',
  state: '',
  date: '',
  capacity: '',
  format: 'League',
};

function isEventFormat(value: string): value is EventFormat {
  return value === 'League' || value === 'Tournament' || value === 'Casual';
}

export function handleEventFormChange(
  event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  currentValues: EventFormValues,
): EventFormValues {
  const { name, value } = event.target;

  switch (name) {
    case 'name':
      return { ...currentValues, name: value };
    case 'city':
      return { ...currentValues, city: value };
    case 'state':
      return { ...currentValues, state: value };
    case 'date':
      return { ...currentValues, date: value };
    case 'capacity':
      return { ...currentValues, capacity: value };
    case 'format':
      if (isEventFormat(value)) {
        return { ...currentValues, format: value };
      }
      return currentValues;
    default:
      return currentValues;
  }
}

export function toCreateEventInput(values: EventFormValues): CreateEventInput {
  return {
    name: values.name.trim(),
    city: values.city.trim(),
    state: values.state.trim().toUpperCase(),
    date: values.date,
    capacity: Number(values.capacity),
    format: values.format,
  };
}