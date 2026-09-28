import EventCard from './EventCard';

function EventCatalog({ events, density = 'compact' }) {
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