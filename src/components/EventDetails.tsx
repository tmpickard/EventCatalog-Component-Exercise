import { Link, useParams } from 'react-router-dom';
import type { Event } from '../types/event';

interface EventDetailsProps {
  events: Event[];
}

function parseEventId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const eventId = Number(value);
  return Number.isSafeInteger(eventId) ? eventId : null;
}

function EventDetails({ events }: EventDetailsProps) {
  const { eventId: eventIdParameter } = useParams();
  const eventId = parseEventId(eventIdParameter);
  const event = eventId === null
    ? undefined
    : events.find((candidate) => candidate.id === eventId);

  if (!event) {
    return (
      <section className="create-event-page">
        <h1 tabIndex={-1}>Event not found</h1>
        <p>The event address may be invalid, or the event may no longer exist.</p>
        <Link to="/events" className="button-link">
          Back to Event Catalog
        </Link>
      </section>
    );
  }

  return (
    <section className="event-details">
      <Link
        to="/events"
        state={{ focusEventId: event.id }}
        className="button-link"
      >
        Back to Event Catalog
      </Link>
      <h1 tabIndex={-1}>{event.name}</h1>
      <dl>
        <div>
          <dt>Date</dt>
          <dd>{event.date}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{event.city}, {event.state}</dd>
        </div>
        <div>
          <dt>Format</dt>
          <dd>{event.format}</dd>
        </div>
        <div>
          <dt>Capacity</dt>
          <dd>{event.capacity}</dd>
        </div>
        <div>
          <dt>Registered</dt>
          <dd>{event.registered}</dd>
        </div>
        <div>
          <dt>Available spots</dt>
          <dd>{event.capacity - event.registered}</dd>
        </div>
      </dl>
    </section>
  );
}

export default EventDetails;