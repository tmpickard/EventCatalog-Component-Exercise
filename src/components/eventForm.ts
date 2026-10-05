import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import type { CreateEventInput, EventFormat } from '../types/event';

export type EventFormValues = Omit<CreateEventInput, 'capacity'> & {
  capacity: string;
};

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
  setFormValues: Dispatch<SetStateAction<EventFormValues>>,
) {
  const { name, value } = event.target;

  switch (name) {
    case 'name':
    case 'city':
    case 'state':
    case 'date':
    case 'capacity':
      setFormValues((current) => ({ ...current, [name]: value }));
      break;
    case 'format':
      if (isEventFormat(value)) {
        setFormValues((current) => ({ ...current, format: value }));
      }
      break;
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