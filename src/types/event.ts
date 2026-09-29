export type EventFormat = 'League' | 'Tournament' | 'Casual';

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

export interface EventFormData {
  name: string;
  city: string;
  state: string;
  date: string;
  capacity: string;
  format: EventFormat;
  registered?: number;
}

export type EventFormatFilter = 'all' | 'league' | 'tournament' | 'casual';
export type EventStatusFilter = 'all' | 'spots-available' | 'almost-full' | 'full';
export type SortOption = 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc';
export type ResultsDensity = 'compact' | 'comfortable';

export interface CatalogPreferences {
  selectedFormat: EventFormatFilter;
  searchQuery: string;
  sortOption: SortOption;
  resultsDensity: ResultsDensity;
}