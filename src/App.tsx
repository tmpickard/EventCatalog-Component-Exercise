import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import type {
  CatalogPreferences,
  CreateEventInput,
  Event,
  EventRequestState,
  EventStatusFilter,
} from './types/event';
import CreateEventForm from './components/CreateEventForm';
import EditEventForm from './components/EditEventForm';
import EventCatalog from './components/EventCatalog';
import EventDetails from './components/EventDetails';
import EventFilter, {
  filterEvents,
  statusFilterOptions,
  typeFilterOptions,
} from './components/EventFilter';
import EventSummary from './components/EventSummary';
import SearchAndSortControls, {
  sortEvents,
} from './components/SearchAndSortControls';
import useCatalogPreferences from './hooks/useCatalogPreferences';
import validateEvents from './utils/validateEvents';

interface DashboardPageProps {
  events: Event[];
  catalogPreferences: CatalogPreferences;
  onCatalogPreferenceChange: <K extends keyof CatalogPreferences>(
    key: K,
    value: CatalogPreferences[K],
  ) => void;
}

function DashboardPage({ events, catalogPreferences, onCatalogPreferenceChange }: DashboardPageProps) {
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>('all');

  const { selectedFormat, searchQuery, sortOption, resultsDensity } =
    catalogPreferences;

  const visibleEvents = sortEvents(
    filterEvents(events, {
      status: statusFilter,
      type: selectedFormat,
      search: searchQuery,
    }),
    sortOption,
  );

  return (
    <>
      <section id="dashboard">
        <h2>Event Dashboard</h2>
        <EventSummary events={visibleEvents} />
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
              value={selectedFormat}
              onChange={(nextFormat) =>
                onCatalogPreferenceChange('selectedFormat', nextFormat)
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
  const [eventRequest, setEventRequest] = useState<EventRequestState>({
    status: 'loading',
  });
  const [retryCount, setRetryCount] = useState(0);
  const {
    catalogPreferences,
    updateCatalogPreference: handleCatalogPreferenceChange,
  } = useCatalogPreferences();

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvents() {
      setEventRequest({ status: 'loading' });

      try {
        const response = await fetch('/events.json', {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`The events request failed with status ${response.status}.`);
        }

        const responseData: unknown = await response.json();
        setEventRequest({
          status: 'success',
          events: validateEvents(responseData),
        });
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setEventRequest({
          status: 'error',
          error:
            error instanceof Error
              ? error
              : new Error('An unexpected error occurred while loading events.'),
        });
      }
    }

    void loadEvents();
    return () => controller.abort();
  }, [retryCount]);

  const handleCreateEvent = (eventInput: CreateEventInput) => {
    const newEvent: Event = {
      id: Date.now(),
      ...eventInput,
      registered: 0,
    };

    setEventRequest((current) =>
      current.status === 'success'
        ? { status: 'success', events: [newEvent, ...current.events] }
        : current,
    );
  };

  const handleUpdateEvent = (updatedEvent: Event) => {
    setEventRequest((current) =>
      current.status === 'success'
        ? {
            status: 'success',
            events: current.events.map((event) =>
              event.id === updatedEvent.id ? updatedEvent : event,
            ),
          }
        : current,
    );
  };

  return (
    <>
      <header className="app-header">
        <nav>
          <Link to="/events">Event Catalog</Link>
          <Link to="/create">Create Event</Link>
        </nav>
      </header>

      <main className="app-content">
        {eventRequest.status === 'loading' && (
          <section className="request-state" aria-live="polite">
            <h1>Community Events</h1>
            <p>Loading upcoming events...</p>
          </section>
        )}
        {eventRequest.status === 'error' && (
          <section className="request-state" role="alert">
            <h1>Unable to Load Events</h1>
            <p>We couldn&apos;t retrieve the upcoming community events.</p>
            <p>Please try again.</p>
            <button
              type="button"
              onClick={() => {
                setEventRequest({ status: 'loading' });
                setRetryCount((count) => count + 1);
              }}
            >
              Retry
            </button>
          </section>
        )}
        {eventRequest.status === 'success' && (
          <>
            <Routes>
              <Route path="/" element={<Navigate to="/events" replace />} />
              <Route
                path="/events"
                element={
                  <>
                    <h1>Community Events</h1>
                    <DashboardPage
                      events={eventRequest.events}
                      catalogPreferences={catalogPreferences}
                      onCatalogPreferenceChange={handleCatalogPreferenceChange}
                    />
                  </>
                }
              />
              <Route
                path="/create"
                element={<CreateEventForm onCreateEvent={handleCreateEvent} />}
              />
              <Route
                path="/edit/:eventId"
                element={
                  <EditEventForm
                    events={eventRequest.events}
                    onUpdateEvent={handleUpdateEvent}
                  />
                }
              />
              <Route
                path="/events/:eventId"
                element={<EventDetails events={eventRequest.events} />}
              />
            </Routes>
          </>
        )}
      </main>
    </>
  );
}

export default App;