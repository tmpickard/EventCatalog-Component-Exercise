import type { ResultsDensity, SortOption } from '../types/event';

export const sortOptions = [
  { value: 'date-asc', label: 'Date - Earliest First' },
  { value: 'date-desc', label: 'Date - Latest First' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
];

interface SearchAndSortControlsProps {
  value: string;
  onSearchChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  density: ResultsDensity;
  onDensityChange: (value: ResultsDensity) => void;
}

export default function SearchAndSortControls({
  value,
  onSearchChange,
  sortBy,
  onSortChange,
  density,
  onDensityChange,
}: SearchAndSortControlsProps) {
  return (
    <div className="search-and-sort-controls">
      <div className="search-field">
        <label htmlFor="event-search">Search</label>
        <input
          id="event-search"
          type="search"
          value={value}
          placeholder="Search name, city, or state"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="sort-field">
        <label htmlFor="event-sort">Sort</label>
        <select
          id="event-sort"
          value={sortBy}
          onChange={(event) => onSortChange(event.currentTarget.value as SortOption)}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="density-field">
        <label htmlFor="event-density">Results Density</label>
        <select
          id="event-density"
          value={density}
          onChange={(event) => onDensityChange(event.currentTarget.value as ResultsDensity)}
        >
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
        </select>
      </div>

    </div>
  );
}
