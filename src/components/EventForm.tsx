import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CreateEventInput, Event } from '../types/event';
import {
  emptyForm,
  handleEventFormChange,
  toCreateEventInput,
  type EventFormMode,
  type EventFormValues,
} from './eventFormUtils';

interface EventFormProps {
  mode: EventFormMode;
  onSubmit: (event: CreateEventInput) => void;
}

function buildFormState(event: Event): EventFormValues {
  return {
    ...event,
    capacity: String(event.capacity),
  };
}

export default function EventForm({ mode, onSubmit }: EventFormProps) {
  const navigate = useNavigate();
  const editingEvent = mode.type === 'edit' ? mode.event : undefined;
  const [formData, setFormData] = useState<EventFormValues>(() =>
    editingEvent ? buildFormState(editingEvent) : emptyForm,
  );

  useEffect(() => {
    setFormData(editingEvent ? buildFormState(editingEvent) : emptyForm);
  }, [editingEvent]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => handleEventFormChange(event, setFormData);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

    onSubmit(eventInput);

    if (mode.type === 'create') {
      setFormData(emptyForm);
    }

    navigate('/events');
  };

  const isEditing = mode.type === 'edit';

  return (
    <section className="create-event-page">
      <h2>{isEditing ? 'Edit Event' : 'Create a New Event'}</h2>

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
          <button type="submit">
            {isEditing ? 'Save Changes' : 'Create Event'}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/events')}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}