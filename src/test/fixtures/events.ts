import type { Event } from '../../types/event';

export function createTestEvents(): Event[] {
  return [
    {
      id: 1,
      name: 'Test Event A',
      city: 'Seattle',
      state: 'WA',
      date: '2026-04-10',
      capacity: 32,
      registered: 12,
      format: 'League',
    },
    {
      id: 2,
      name: 'Test Event B',
      city: 'Portland',
      state: 'OR',
      date: '2026-05-20',
      capacity: 16,
      registered: 16,
      format: 'Tournament',
    },
    {
      id: 3,
      name: 'Test Event C',
      city: 'Austin',
      state: 'TX',
      date: '2026-03-05',
      capacity: 24,
      registered: 8,
      format: 'Casual',
    },
  ];
}
