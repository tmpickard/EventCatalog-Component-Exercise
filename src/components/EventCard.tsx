import { Link } from 'react-router-dom';
import type { Event, ResultsDensity } from '../types/event';
import StatusLabels, { getEventStatus } from './StatusLabels';

interface EventCardProps {
  event: Event;
  density?: ResultsDensity;
}

function EventCard({ event, density = 'compact' }: EventCardProps) {
  const status = getEventStatus(event);
  const isCompact = density === 'compact';

  return (
    <article>
      <h3>{event.name}</h3>

      {!isCompact && <StatusLabels event={event} />}

      <p>
        {event.city}, {event.state}
      </p>
      <p>{event.date}</p>

      {isCompact ? (
        <p>Status: {status}</p>
      ) : (
        <>
          <p>{event.format}</p>
          <p>
            Capacity: {event.registered}/{event.capacity}
          </p>
          <p>Status: {status}</p>
        </>
      )}

      <div className="form-actions">
        <Link to={`/events/${event.id}`} className="button-link">
          Event Details
        </Link>
        <Link to={`/edit/${event.id}`} className="button-link">
          Edit Event
        </Link>
      </div>
    </article>
  );
}

export default EventCard;