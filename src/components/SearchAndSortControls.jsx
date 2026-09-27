export const sortOptions = [
  { value: 'default', label: 'Default Order' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'date-asc', label: 'Date Soonest' },
  { value: 'date-desc', label: 'Date Latest' },
];

export function sortEvents(events, sortBy = 'default') {
  if (!Array.isArray(events)) {
    return [];
  }

  const sortedEvents = [...events];

  switch (sortBy) {
    case 'name-asc':
      return sortedEvents.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return sortedEvents.sort((a, b) => b.name.localeCompare(a.name));
    case 'date-asc':
      return sortedEvents.sort(
        (a, b) => new Date(a.date) - new Date(b.date),
      );
    case 'date-desc':
      return sortedEvents.sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      );
    default:
      return sortedEvents;
  }
}

export default function SearchAndSortControls({
  value,
  onSearchChange,
  sortBy,
  onSortChange,
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

      <span>{count} event{count === 1 ? '' : 's'}</span>
    </div>
  );
}
