export const sortOptions = [
  { value: 'date-asc', label: 'Date - Earliest First' },
  { value: 'date-desc', label: 'Date - Latest First' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
];

export function sortEvents(events, sortBy = 'date-asc') {
  if (!Array.isArray(events)) {
    return [];
  }

  const normalizedSortOption = sortBy === 'default' ? 'date-asc' : sortBy;
  const sortedEvents = [...events];

  switch (normalizedSortOption) {
    case 'name-asc':
      return sortedEvents.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return sortedEvents.sort((a, b) => b.name.localeCompare(a.name));
    case 'date-desc':
      return sortedEvents.sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      );
    case 'date-asc':
    default:
      return sortedEvents.sort(
        (a, b) => new Date(a.date) - new Date(b.date),
      );
  }
}

export default function SearchAndSortControls({
  value,
  onSearchChange,
  sortBy,
  onSortChange,
  density,
  onDensityChange,
  count,
}) {
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
          onChange={(event) => onSortChange(event.target.value)}
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
          onChange={(event) => onDensityChange(event.target.value)}
        >
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
        </select>
      </div>

      <span>{count} event{count === 1 ? '' : 's'}</span>
    </div>
  );
}
