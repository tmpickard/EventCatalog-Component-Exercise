import { useEffect, useReducer, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import type {
  CatalogPreferences,
  CreateEventInput,
  Event,
  EventUpdate,
  EventStatusFilter,
} from './types/event';
import CreateEventForm from './components/CreateEventForm';
import EditEventForm from './components/EditEventForm';
import EventCatalog from './components/EventCatalog';
import EventDetails from './components/EventDetails';
import EventFilter, {
  statusFilterOptions,
  typeFilterOptions,
} from './components/EventFilter';
import EventSummary from './components/EventSummary';
import SearchAndSortControls from './components/SearchAndSortControls';
import { filterEvents, sortEvents } from './domain/eventSelectors';
import useCatalogPreferences from './hooks/useCatalogPreferences';
import eventReducer from './state/eventReducer';
import type { EventState } from './state/eventReducer';
import validateEvents from './utils/validateEvents';

function getReturnFocusEventId(state: unknown): number | null {
  if (
    typeof state !== 'object' ||
    state === null ||
    !('focusEventId' in state)
  ) {
    return null;
  }

  const { focusEventId } = state;
  return typeof focusEventId === 'number' && Number.isSafeInteger(focusEventId)
    ? focusEventId
    : null;
}

interface DashboardPageProps {
  events: Event[];
  catalogPreferences: CatalogPreferences;
  onResetEvents: () => void;
  onCatalogPreferenceChange: <K extends keyof CatalogPreferences>(
    key: K,
    value: CatalogPreferences[K],
  ) => void;
}

function DashboardPage({
  events,
  catalogPreferences,
  onResetEvents,
  onCatalogPreferenceChange,
}: DashboardPageProps) {
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
            />
            <EventFilter
              id="status-filter"
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusFilterOptions}
            />
            <EventFilter
              id="type-filter"
              label="Format"
              value={selectedFormat}
              onChange={(nextFormat) =>
                onCatalogPreferenceChange('selectedFormat', nextFormat)
              }
              options={typeFilterOptions}
            />
          </div>

          <Link to="/create" className="button-link">
            Create Event
          </Link>
          <button type="button" className="secondary-button" onClick={onResetEvents}>
            Reset Events
          </button>
        </div>

        <EventCatalog
          events={visibleEvents}
          totalCount={events.length}
          density={resultsDensity}
        />
      </section>
    </>
  );
}

function App() {
  const location = useLocation();
  const [eventRequest, dispatch] = useReducer(
    eventReducer,
    { status: 'loading', requestId: 0 } satisfies EventState,
  );
  const [retryCount, setRetryCount] = useState(0);
  const [notification, setNotification] = useState('');
  const requestIdRef = useRef(0);
  const previousPathnameRef = useRef(location.pathname);
  const pendingRouteFocusRef = useRef(false);
  const {
    catalogPreferences,
    updateCatalogPreference: handleCatalogPreferenceChange,
  } = useCatalogPreferences();

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    dispatch({ type: 'loadStarted', requestId });

    async function loadEvents() {
      try {
        const response = await fetch('/events.json', {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`The events request failed with status ${response.status}.`);
        }

        const responseData: unknown = await response.json();
        dispatch({
          type: 'loadSucceeded',
          requestId,
          events: validateEvents(responseData),
        });
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        dispatch({
          type: 'loadFailed',
          requestId,
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

    dispatch({ type: 'eventCreated', event: newEvent });
    setNotification(
      `${newEvent.name} has been added to the community event catalog.`,
    );
  };

  const handleUpdateEvent = (updatedEvent: Event) => {
    const changes: EventUpdate = {
      name: updatedEvent.name,
      city: updatedEvent.city,
      state: updatedEvent.state,
      date: updatedEvent.date,
      capacity: updatedEvent.capacity,
      format: updatedEvent.format,
    };
    dispatch({ type: 'eventUpdated', eventId: updatedEvent.id, changes });
    setNotification(`${updatedEvent.name} has been updated.`);
  };

  const routeEventId = Number(location.pathname.split('/').at(-1));
  const routeEvent =
    eventRequest.status === 'success' &&
    (location.pathname.startsWith('/events/') ||
      location.pathname.startsWith('/edit/')) &&
    Number.isSafeInteger(routeEventId)
      ? eventRequest.events.find((event) => event.id === routeEventId)
      : undefined;
  const returnFocusEventId =
    location.pathname === '/events'
      ? getReturnFocusEventId(location.state)
      : null;

  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/events') {
      document.title = 'Community Events | Trainer Events';
    } else if (location.pathname === '/create') {
      document.title = 'Create Event | Trainer Events';
    } else if (location.pathname.startsWith('/edit/')) {
      document.title = routeEvent
        ? `Edit ${routeEvent.name} | Trainer Events`
        : 'Edit Event | Trainer Events';
    } else if (location.pathname.startsWith('/events/')) {
      document.title = `${routeEvent?.name ?? 'Event Not Found'} | Trainer Events`;
    } else {
      document.title = 'Trainer Events';
    }

    const routeChanged = previousPathnameRef.current !== location.pathname;
    previousPathnameRef.current = location.pathname;
    if (routeChanged) {
      pendingRouteFocusRef.current = true;
    }

    if (
      pendingRouteFocusRef.current &&
      eventRequest.status === 'success'
    ) {
      const returnLink =
        returnFocusEventId === null
          ? null
          : document.getElementById(
              `event-details-link-${returnFocusEventId}`,
            );
      const pageHeading =
        document.querySelector<HTMLElement>('.app-content h1');
      (returnLink ?? pageHeading)?.focus();
      pendingRouteFocusRef.current = false;
    }
  }, [
    eventRequest.status,
    location.pathname,
    location.state,
    returnFocusEventId,
    routeEvent,
  ]);

  return (
    <>
      <header className="app-header">
        <nav aria-label="Primary navigation">
          <Link to="/events">Event Catalog</Link>
          <Link to="/create">Create Event</Link>
        </nav>
      </header>

      <main className="app-content">
        <p className="operation-notification" role="status" aria-atomic="true">
          {notification}
        </p>
        <p className="request-announcement" role="status" aria-atomic="true">
          {eventRequest.status === 'loading' ? 'Loading upcoming events...' : ''}
        </p>
        {eventRequest.status === 'loading' && (
          <section className="request-state">
            <h1>Community Events</h1>
          </section>
        )}
        {eventRequest.status === 'error' && (
          <section className="request-state" role="alert" aria-atomic="true">
            <h1>Unable to Load Events</h1>
            <p>We couldn&apos;t retrieve the upcoming community events.</p>
            <p>Please try again.</p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
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
                    <h1 tabIndex={-1}>Community Events</h1>
                    <DashboardPage
                      events={eventRequest.events}
                      catalogPreferences={catalogPreferences}
                      onResetEvents={() => {
                        dispatch({ type: 'eventsReset' });
                        setNotification('');
                      }}
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