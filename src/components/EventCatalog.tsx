import type { Event, ResultsDensity } from '../types/event';
import EventCard from './EventCard';

interface EventCatalogProps {
  events: Event[];
  totalCount: number;
  density?: ResultsDensity;
}

function EventCatalog({
  events,
  totalCount,
  density = 'compact',
}: EventCatalogProps) {
  return (
    <section>
      <h2>Upcoming Events</h2>
      <p className="event-results-status" role="status" aria-atomic="true">
        Showing {events.length} of {totalCount} events.
      </p>

      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          density={density}
        />
      ))}
    </section>
  );
}

export default EventCatalog;