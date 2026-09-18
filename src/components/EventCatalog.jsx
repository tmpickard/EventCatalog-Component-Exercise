import EventCard from "./EventCard";

function EventCatalog({ events }) {
  return (
    <section>
      <h2>Upcoming Events</h2>

      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
        />
      ))}
    </section>
  );
}

export default EventCatalog;