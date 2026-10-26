import { useEffect, useRef, useState } from 'react';
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
import {
  validateEventForm,
  type EventFormField,
  type EventFormErrors,
} from '../domain/eventValidation';

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

const fieldsInFormOrder: EventFormField[] = [
  'name',
  'city',
  'state',
  'date',
  'capacity',
];

export default function EventForm({ mode, onSubmit }: EventFormProps) {
  const navigate = useNavigate();
  const editingEvent = mode.type === 'edit' ? mode.event : undefined;
  const [formData, setFormData] = useState<EventFormValues>(() =>
    editingEvent ? buildFormState(editingEvent) : emptyForm,
  );
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [focusRequest, setFocusRequest] = useState(0);
  const fieldRefs = useRef<
    Partial<Record<EventFormField, HTMLInputElement>>
  >({});

  useEffect(() => {
    if (focusRequest === 0) {
      return;
    }

    const firstInvalidField = fieldsInFormOrder.find((field) => errors[field]);
    if (firstInvalidField) {
      fieldRefs.current[firstInvalidField]?.focus();
    }
  }, [errors, focusRequest]);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const nextFormData = handleEventFormChange(event, formData);
    setFormData(nextFormData);
    setErrors((currentErrors) =>
      Object.keys(currentErrors).length === 0
        ? currentErrors
        : validateEventForm(nextFormData, editingEvent?.registered ?? 0),
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateEventForm(
      formData,
      editingEvent?.registered ?? 0,
    );
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFocusRequest((request) => request + 1);
      return;
    }

    const eventInput = toCreateEventInput(formData);

    setErrors({});
    onSubmit(eventInput);

    if (mode.type === 'create') {
      setFormData(emptyForm);
    }

    navigate('/events');
  };

  const isEditing = mode.type === 'edit';

  return (
    <section className="create-event-page">
      <h1 tabIndex={-1}>{isEditing ? 'Edit Event' : 'Create a New Event'}</h1>

      <form onSubmit={handleSubmit} className="event-form" noValidate>
        <div className="form-field">
          <label htmlFor="event-name">Event name</label>
          <input
            id="event-name"
            type="text"
            name="name"
            ref={(element) => {
              fieldRefs.current.name = element ?? undefined;
            }}
            value={formData.name}
            onChange={handleChange}
            placeholder="Trainer League"
            required
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'event-name-error' : undefined}
          />
          {errors.name && (
            <span className="field-error" id="event-name-error">
              Error: {errors.name}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="event-city">City</label>
          <input
            id="event-city"
            type="text"
            name="city"
            ref={(element) => {
              fieldRefs.current.city = element ?? undefined;
            }}
            value={formData.city}
            onChange={handleChange}
            placeholder="Seattle"
            required
            aria-invalid={errors.city ? true : undefined}
            aria-describedby={errors.city ? 'event-city-error' : undefined}
          />
          {errors.city && (
            <span className="field-error" id="event-city-error">
              Error: {errors.city}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="event-state">State</label>
          <input
            id="event-state"
            type="text"
            name="state"
            ref={(element) => {
              fieldRefs.current.state = element ?? undefined;
            }}
            value={formData.state}
            onChange={handleChange}
            placeholder="WA"
            maxLength={2}
            required
            aria-invalid={errors.state ? true : undefined}
            aria-describedby={errors.state ? 'event-state-error' : undefined}
          />
          {errors.state && (
            <span className="field-error" id="event-state-error">
              Error: {errors.state}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="event-date">Date</label>
          <input
            id="event-date"
            type="date"
            name="date"
            ref={(element) => {
              fieldRefs.current.date = element ?? undefined;
            }}
            value={formData.date}
            onChange={handleChange}
            required
            aria-invalid={errors.date ? true : undefined}
            aria-describedby={errors.date ? 'event-date-error' : undefined}
          />
          {errors.date && (
            <span className="field-error" id="event-date-error">
              Error: {errors.date}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="event-capacity">Capacity</label>
          <input
            id="event-capacity"
            type="number"
            name="capacity"
            ref={(element) => {
              fieldRefs.current.capacity = element ?? undefined;
            }}
            value={formData.capacity}
            onChange={handleChange}
            min="1"
            required
            aria-invalid={errors.capacity ? true : undefined}
            aria-describedby={errors.capacity ? 'event-capacity-error' : undefined}
          />
          {errors.capacity && (
            <span className="field-error" id="event-capacity-error">
              Error: {errors.capacity}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="event-format">Format</label>
          <select
            id="event-format"
            name="format"
            value={formData.format}
            onChange={handleChange}
          >
            <option value="League">League</option>
            <option value="Tournament">Tournament</option>
            <option value="Casual">Casual</option>
          </select>
        </div>

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