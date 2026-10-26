import type { Event } from '../types/event';

export function createTestEvents(): Event[] {
  return [
    {
      id: 17,
      name: 'Seattle Trainer League',
      city: 'Seattle',
      state: 'WA',
      date: '2026-11-14',
      capacity: 32,
      registered: 20,
      format: 'League',
    },
    {
      id: 18,
      name: 'Portland Regional Tournament',
      city: 'Portland',
      state: 'OR',
      date: '2026-11-21',
      capacity: 64,
      registered: 42,
      format: 'Tournament',
    },
    {
      id: 19,
      name: 'Bellevue Casual Meetup',
      city: 'Bellevue',
      state: 'WA',
      date: '2026-11-07',
      capacity: 24,
      registered: 8,
      format: 'Casual',
    },
    {
      id: 20,
      name: 'Seattle Championship',
      city: 'Seattle',
      state: 'WA',
      date: '2026-12-05',
      capacity: 48,
      registered: 35,
      format: 'Tournament',
    },
  ];
}
