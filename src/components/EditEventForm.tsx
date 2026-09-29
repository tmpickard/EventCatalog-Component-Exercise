import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Event, EventFormat, EventFormData } from '../types/event';
import { emptyForm, normalizeEvent } from './CreateEventForm';

function buildFormState(event: Event): EventFormData {
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

  const [formData, setFormData] = useState(() =>
    eventToEdit ? buildFormState(eventToEdit) : emptyForm,
  );

  useEffect(() => {
    if (eventToEdit) {
      setFormData(buildFormState(eventToEdit));
    }
  }, [eventToEdit]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
      format: name === 'format' ? (value as EventFormat) : current.format,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!eventToEdit) {
      return;
    }

    const normalizedEvent = normalizeEvent(formData, eventToEdit.id);

    if (
      !normalizedEvent.name ||
      !normalizedEvent.city ||
      !normalizedEvent.state ||
      !normalizedEvent.date ||
      !normalizedEvent.capacity ||
      normalizedEvent.capacity <= 0
    ) {
      window.alert('Please complete all required fields with a valid capacity.');
      return;
    }

    onUpdateEvent({
      ...eventToEdit,
      ...normalizedEvent,
      registered: eventToEdit.registered,
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
          <select name="format" value={formData.format} onChange={handleChange}>
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
