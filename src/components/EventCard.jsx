import { Link } from 'react-router-dom';
import StatusLabels, { getEventStatus } from './StatusLabels.jsx';

function EventCard({ event }) {
  const status = getEventStatus(event);

  return (
    <article>
      <h3>{event.name}</h3>

      <StatusLabels event={event} />

      <p>
        {event.city}, {event.state}
      </p>
      <p>{event.date}</p>
      <p>{event.format}</p>

      <p>Status: {status}</p>

      <div className="form-actions">
        <Link to={`/edit/${event.id}`} className="button-link">
          Edit Event
        </Link>
      </div>
    </article>
  );
}

export default EventCard;