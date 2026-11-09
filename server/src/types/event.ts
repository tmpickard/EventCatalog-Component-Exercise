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
}

export type NewEvent = Omit<Event, 'id' | 'registered'>;

export type EventChanges = Partial<NewEvent>;

export function isEventFormat(value: unknown): value is EventFormat {
  return typeof value === 'string' && eventFormats.some((format) => format === value);
}
