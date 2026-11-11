export const eventFormats = ['League', 'Tournament', 'Casual'] as const;

export type EventFormat = (typeof eventFormats)[number];

export interface Event {
  id: number;
  name: string;
  city: string;
  state: string;
  date: string;
  capacity: number;
  registered: number;
  format: EventFormat;
  organizerId: string;
}

export type NewEvent = Omit<Event, 'id' | 'registered' | 'organizerId'>;

export type EventChanges = Partial<
  Pick<NewEvent, 'name' | 'city' | 'state' | 'date' | 'capacity' | 'format'>
>;

export function isEventFormat(value: unknown): value is EventFormat {
  return typeof value === 'string' && eventFormats.some((format) => format === value);
}
