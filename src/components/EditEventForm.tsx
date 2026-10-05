import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Event } from '../types/event';
import {
  emptyForm,
  handleEventFormChange,
  toCreateEventInput,
  type EventFormValues,
} from './eventForm';

function buildFormState(event: Event): EventFormValues {
  return {
    ...event,
    capacity: String(event.capacity),
  };
}

interface EditEventFormProps {
  events: Event[];
  onUpdateEvent: (event: Event) => void;
}

export default function EditEventForm({ events, onUpdateEvent }: EditEventFormProps) {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const eventToEdit = events.find((event) => event.id === Number(eventId));

  const [formData, setFormData] = useState<EventFormValues>(() =>
    eventToEdit ? buildFormState(eventToEdit) : emptyForm,
  );

  useEffect(() => {
    if (eventToEdit) {
      setFormData(buildFormState(eventToEdit));
    }
  }, [eventToEdit]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => handleEventFormChange(event, setFormData);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!eventToEdit) {
      return;
    }

    const eventInput = toCreateEventInput(formData);

    if (
      !eventInput.name ||
      !eventInput.city ||
      !eventInput.state ||
      !eventInput.date ||
      !Number.isFinite(eventInput.capacity) ||
      eventInput.capacity <= 0
    ) {
      window.alert('Please complete all required fields with a valid capacity.');
      return;
    }

    onUpdateEvent({
      ...eventToEdit,
      ...eventInput,
    });

    navigate('/');
  };

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
    <section className="create-event-page">
      <h2>Edit Event</h2>

      <form onSubmit={handleSubmit} className="event-form">
        <label>
          Event name
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Trainer League"
            required
          />
        </label>

        <label>
          City
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="Seattle"
            required
          />
        </label>

        <label>
          State
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            placeholder="WA"
            maxLength={2}
            required
          />
        </label>

        <label>
          Date
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Capacity
          <input
            type="number"
            name="capacity"
            value={formData.capacity}
            onChange={handleChange}
            min="1"
            required
          />
        </label>

        <label>
          Format
          <select
            name="format"
            value={formData.format}
            onChange={handleChange}
          >
            <option value="League">League</option>
            <option value="Tournament">Tournament</option>
            <option value="Casual">Casual</option>
          </select>
        </label>

        <div className="form-actions">
          <button type="submit">Save Changes</button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/')}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
