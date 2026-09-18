import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const emptyForm = {
  name: '',
  city: '',
  state: '',
  date: '',
  capacity: '',
  format: 'League',
};

export function createEvent(event) {
  return {
    id: Date.now(),
    name: event.name.trim(),
    city: event.city.trim(),
    state: event.state.trim().toUpperCase(),
    date: event.date,
    capacity: Number(event.capacity),
    registered: 0,
    format: event.format,
  };
}

export default function CreateEventForm({ onCreateEvent }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(emptyForm);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const normalizedEvent = createEvent(formData);

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

    onCreateEvent(normalizedEvent);
    setFormData(emptyForm);
    navigate('/');
  };

  return (
    <section className="create-event-page">
      <h2>Create a New Event</h2>

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
          <button type="submit">Create Event</button>
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