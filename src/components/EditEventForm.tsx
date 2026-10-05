import { useNavigate, useParams } from 'react-router-dom';
import type { Event } from '../types/event';
import EventForm from './EventForm';

interface EditEventFormProps {
  events: Event[];
  onUpdateEvent: (event: Event) => void;
}

export default function EditEventForm({ events, onUpdateEvent }: EditEventFormProps) {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const eventToEdit = events.find((event) => event.id === Number(eventId));

  if (!eventToEdit) {
    return (
      <section className="create-event-page">
        <h2>Event not found</h2>
        <button type="button" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </section>
    );
  }

  return (
    <EventForm
      mode={{ type: 'edit', event: eventToEdit }}
      onSubmit={(eventInput) =>
        onUpdateEvent({
          ...eventToEdit,
          ...eventInput,
        })
      }
    />
  );
}
