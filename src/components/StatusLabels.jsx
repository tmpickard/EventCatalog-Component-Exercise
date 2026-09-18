export function getEventStatus(event) {
  if (!event || !event.capacity) {
    return 'Spots Available';
  }

  const percentRegistered = (event.registered / event.capacity) * 100;

  if (event.registered >= event.capacity) {
    return 'Full';
  }

  if (percentRegistered >= 90) {
    return 'Almost Full';
  }

  return 'Spots Available';
}

export default function StatusLabels({ event }) {
  return <span>{getEventStatus(event)}</span>;
}