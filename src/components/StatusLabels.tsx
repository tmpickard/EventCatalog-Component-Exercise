import type { Event } from '../types/event';

export function getEventStatus(event: Event) {
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

interface StatusLabelsProps {
  event: Event;
}

export default function StatusLabels({ event }: StatusLabelsProps) {
  return <span>{getEventStatus(event)}</span>;
}