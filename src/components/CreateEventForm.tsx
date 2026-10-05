import type { CreateEventInput } from '../types/event';
import EventForm from './EventForm';

interface CreateEventFormProps {
  onCreateEvent: (event: CreateEventInput) => void;
}

export default function CreateEventForm({ onCreateEvent }: CreateEventFormProps) {
  return <EventForm mode={{ type: 'create' }} onSubmit={onCreateEvent} />;
}