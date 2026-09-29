import type { Event, ResultsDensity } from '../types/event';
import EventCard from './EventCard';

interface EventCatalogProps {
  events: Event[];
  density?: ResultsDensity;
}

function EventCatalog({ events, density = 'compact' }: EventCatalogProps) {
  return (
    <section>
      <h2>Upcoming Events</h2>

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