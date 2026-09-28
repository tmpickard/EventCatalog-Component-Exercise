import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import './App.css';
import CreateEventForm from './components/CreateEventForm.jsx';
import EditEventForm from './components/EditEventForm.jsx';
import EventCatalog from './components/EventCatalog.jsx';
import EventFilter, {
  filterEvents,
  statusFilterOptions,
  typeFilterOptions,
} from './components/EventFilter.jsx';
import EventSummary from './components/EventSummary.jsx';
import SearchAndSortControls, {
  sortEvents,
} from './components/SearchAndSortControls.jsx';

const defaultCatalogPreferences = {
  formatFilter: 'all',
  searchQuery: '',
  sortOption: 'date-asc',
  resultsDensity: 'compact',
};

function loadCatalogPreferences() {
  if (typeof window === 'undefined') {
    return defaultCatalogPreferences;
  }

  try {
    const storedPreferences = window.localStorage.getItem('catalogPreferences');

    if (!storedPreferences) {
      return defaultCatalogPreferences;
    }

    return {
      ...defaultCatalogPreferences,
      ...JSON.parse(storedPreferences),
    };
  } catch {
    return defaultCatalogPreferences;
  }
}

const initialEvents = [
  {
    id: 1,
    name: 'Seattle Trainer League',
    city: 'Seattle',
    state: 'WA',
    date: '2026-09-19',
    capacity: 32,
    registered: 27,
    format: 'League',
  },
  {
    id: 2,
    name: 'Portland Trainer League',
    city: 'Portland',
    state: 'OR',
    date: '2026-09-19',
    capacity: 32,
    registered: 31,
    format: 'League',
  },
  {
    id: 3,
    name: 'San Francisco Trainer League',
    city: 'San Francisco',
    state: 'CA',
    date: '2026-09-19',
    capacity: 32,
    registered: 5,
    format: 'League',
  },
  {
    id: 4,
    name: 'Los Angeles Trainer League',
    city: 'Los Angeles',
    state: 'CA',
    date: '2026-09-19',
    capacity: 32,
    registered: 0,
    format: 'League',
  },
  {
    id: 5,
    name: 'New York Weekend Tournament',
    city: 'New York',
    state: 'NY',
    date: '2026-09-19',
    capacity: 32,
    registered: 5,
    format: 'Tournament',
  },
  {
    id: 6,
    name: 'Chicago Weekend Tournament',
    city: 'Chicago',
    state: 'IL',
    date: '2026-09-30',
    capacity: 32,
    registered: 32,
    format: 'Tournament',
  },
  {
    id: 7,
    name: 'Miami Weekend Tournament',
    city: 'Miami',
    state: 'FL',
    date: '2026-09-30',
    capacity: 32,
    registered: 25,
    format: 'Tournament',
  },
  {
    id: 8,
    name: 'Dallas Weekend Tournament',
    city: 'Dallas',
    state: 'TX',
    date: '2026-10-01',
    capacity: 32,
    registered: 0,
    format: 'Tournament',
  },
  {
    id: 9,
    name: 'Boston Weekend Meetup',
    city: 'Boston',
    state: 'MA',
    date: '2026-10-02',
    capacity: 32,
    registered: 15,
    format: 'Casual',
  },
];

function DashboardPage({ events, catalogPreferences, onCatalogPreferenceChange }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const { formatFilter, searchQuery, sortOption, resultsDensity } =
    catalogPreferences;

  const visibleEvents = sortEvents(
    filterEvents(events, {
      status: statusFilter,
      type: formatFilter,
      search: searchQuery,
    }),
    sortOption,
  );

  return (
    <>
      <section id="dashboard">
        <h2>Event Dashboard</h2>
        <EventSummary event={visibleEvents} />
      </section>

      <section id="events">
        <div className="event-toolbar">
          <div className="event-filters">
            <SearchAndSortControls
              value={searchQuery}
              onSearchChange={(nextSearch) =>
                onCatalogPreferenceChange('searchQuery', nextSearch)
              }
              sortBy={sortOption}
              onSortChange={(nextSort) =>
                onCatalogPreferenceChange('sortOption', nextSort)
              }
              density={resultsDensity}
              onDensityChange={(nextDensity) =>
                onCatalogPreferenceChange('resultsDensity', nextDensity)
              }
              count={visibleEvents.length}
            />
            <EventFilter
              id="status-filter"
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              count={visibleEvents.length}
              options={statusFilterOptions}
            />
            <EventFilter
              id="type-filter"
              label="Format"
              value={formatFilter}
              onChange={(nextFormat) =>
                onCatalogPreferenceChange('formatFilter', nextFormat)
              }
              count={visibleEvents.length}
              options={typeFilterOptions}
            />
          </div>

          <Link to="/create" className="button-link">
            Create Event
          </Link>
        </div>

        <EventCatalog events={visibleEvents} density={resultsDensity} />
      </section>
    </>
  );
}

function App() {
  const [events, setEvents] = useState(initialEvents);
  const [catalogPreferences, setCatalogPreferences] = useState(
    loadCatalogPreferences,
  );

  useEffect(() => {
    window.localStorage.setItem(
      'catalogPreferences',
      JSON.stringify(catalogPreferences),
    );
  }, [catalogPreferences]);

  const handleCatalogPreferenceChange = (key, value) => {
    setCatalogPreferences((currentPreferences) => ({
      ...currentPreferences,
      [key]: value,
    }));
  };

  const handleCreateEvent = (newEvent) => {
    setEvents((currentEvents) => [newEvent, ...currentEvents]);
  };

  const handleUpdateEvent = (updatedEvent) => {
    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event,
      ),
    );
  };

  return (
    <>
      <header className="app-header">
        <nav>
          <Link to="/">Dashboard</Link>
          <Link to="/create">Create Event</Link>
        </nav>
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <DashboardPage
              events={events}
              catalogPreferences={catalogPreferences}
              onCatalogPreferenceChange={handleCatalogPreferenceChange}
            />
          }
        />
        <Route
          path="/create"
          element={<CreateEventForm onCreateEvent={handleCreateEvent} />}
        />
        <Route
          path="/edit/:eventId"
          element={<EditEventForm events={events} onUpdateEvent={handleUpdateEvent} />}
        />
      </Routes>
    </>
  );
}

export default App;