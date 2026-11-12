# Event Catalog React Exercise

This project is a growing React.js exercise designed to demonstrate practical front-end development skills in a way that translates cleanly into resume experience. It focuses on component-driven UI design, state management, filtering logic, and user interactions that mirror many real-world dashboard and catalog applications.

The purpose of this repository is to serve as a learning project that can evolve over time into a stronger portfolio artifact. Each feature is intentionally structured to show thoughtful React patterns, reusable components, and a clear path for continued expansion.

## Why this project is valuable

This exercise is ideal for resume-building because it showcases:

- React component architecture
- State and event handling with hooks
- Reusable UI patterns
- Client-side filtering and summary logic
- Route-based navigation between views
- Dynamic creation of new records
- A realistic product workflow for event management

These are all common skills employers look for in front-end developers and can be described clearly in interviews and portfolio narratives.

## Project overview

The application simulates an event management dashboard where users can:

- View a list of events
- See each event's key details
- Filter events by status and type
- Review summary metrics for the currently visible dataset
- Navigate between a dashboard view and a create-event view
- Add a new event directly to the catalog

This gives the project a realistic product feel while remaining small enough to learn from and iterate on quickly.

## Unit tests

Run the unit tests in watch mode while developing:

```bash
npm run test
```

Run the complete test suite once and exit with a success or failure status:

```bash
npm run test:run
```

Vitest runs the TypeScript tests directly in Node; it does not start the React app, open a browser, or make HTTP requests. The current suite covers event reducer transitions and immutability, form and runtime event validation, and event format filtering, search, and chronological sorting. Tests use small deterministic fixtures.

## Backend API

The independent Node.js/Express backend is in `server/`; it does not import React application state.

### Setup and commands

```bash
cd server
npm install
npm run dev
```

The development command starts the HTTP server on port `3001` by default (override with `PORT`). In a separate terminal, use:

```bash
npm run build
npm start
npm test
```

`npm run build` compiles the strict TypeScript backend to `server/dist/`. `npm start` executes that compiled JavaScript. `npm test` type-checks and runs the backend HTTP tests without starting the React app or requiring external services.

### Endpoints

| Method and path | Success response | Other status codes |
| --- | --- | --- |
| `GET /health` | `200` — `{ "status": "ok" }` | — |
| `GET /api/events` | `200` — `{ "data": [Event, ...] }` | `400` for an unsupported `format` |
| `GET /api/events?format=League\|Tournament\|Casual` | `200` — `{ "data": [Event, ...] }` containing matching events | `400` for an unsupported `format` |
| `GET /api/events/:eventId` | `200` — `{ "data": Event }` | `400` for an invalid ID; `404` when no event exists |
| `POST /api/events` | `201` — `{ "data": Event }` and a `Location` header | `400` for invalid event data |
| `PATCH /api/events/:eventId` | `200` — `{ "data": Event }` containing the complete updated event | `400` for invalid data or ID; `404` when no event exists; `409` if capacity would be below registrations |
| `DELETE /api/events/:eventId` | `204` — no response body | `400` for an invalid ID; `404` when no event exists |
| `POST /api/auth/register` | `201` — `{ "data": PublicUser }` | `400` for invalid data; `409` when the normalized email is already registered |
| `POST /api/auth/login` | `200` — `{ "data": PublicUser }` and an HTTP-only session cookie | `400` for malformed input; `401` for invalid credentials |
| `GET /api/auth/me` | `200` — `{ "data": PublicUser }` | `401` when the session is missing, invalid, or expired |
| `POST /api/auth/logout` | `204` — no response body and the session cookie is cleared | `403` for an absent or untrusted Origin on an authenticated request |

An event has numeric `id`, string `name`, `city`, `state`, and ISO calendar `date`, numeric `capacity` and `registered`, and `format` of `League`, `Tournament`, or `Casual`. API errors use `{ "error": { "code": "...", "message": "..." } }`. Invalid event IDs return `INVALID_EVENT_ID`; missing events return `EVENT_NOT_FOUND`. Unexpected server failures return `500` with `INTERNAL_SERVER_ERROR` and do not expose internal details.

Event creation accepts `name`, `city`, `state`, `date`, `capacity`, and `format`; IDs are assigned by the server and registrations start at zero. Updates accept only those editable fields, preserve omitted values, and cannot change IDs or registrations. The in-memory backend uses the same event service for reads and mutations; backend tests create an isolated service for each HTTP test.

Authentication uses independent in-memory user and session services; registration does not log in the new user. Passwords are hashed with Argon2id at 19 MiB memory, two iterations, and parallelism one (the Argon2 library's default variant is Argon2id). These exercise parameters should be benchmarked for production. Sessions use a 24-hour server-enforced lifetime and an HTTP-only, SameSite=Strict cookie. In development the cookie is not Secure; production requires `TRUSTED_ORIGIN` to be an HTTPS origin and enables Secure cookies. Authenticated logout requests require an exact matching `Origin`. The in-memory stores are for this exercise and do not persist across server restarts or multiple server processes.

## PostgreSQL development database

The database is an independent development environment; the Express application
continues to use its in-memory services. Use a currently supported PostgreSQL
release (17 or newer; this workspace has PostgreSQL 18 installed). Docker and
an ORM are not required.

### Create the development database and roles

Connect as a local PostgreSQL administrator using an interactive password
prompt. On Windows with the standard PostgreSQL 18 installer:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U postgres -d postgres
```

In the `psql` prompt, create a database/schema owner and a separate application
role. Set passwords interactively with `\password`; do not put real passwords
in this README, SQL files, or command-line arguments. If the local server is
configured for passwordless trusted connections, omit the `\password` lines
and keep that authentication limited to local development.

```sql
CREATE ROLE trainer_events_owner LOGIN;
CREATE ROLE trainer_events_app LOGIN;
\password trainer_events_owner
\password trainer_events_app
CREATE DATABASE trainer_events_dev OWNER trainer_events_owner;
\connect trainer_events_dev
SELECT current_database(), current_setting('server_version');
\dt
\q
```

The new database should initially have no application tables. `trainer_events_owner`
owns the schema objects and applies DDL; routine application access uses the
non-owner `trainer_events_app` role.

From the repository root, apply the schema, deterministic development seed,
and integrity checks:

```powershell
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
& $psql -U trainer_events_owner -d trainer_events_dev -v ON_ERROR_STOP=1 -f database/schema.sql
& $psql -U trainer_events_owner -d trainer_events_dev -v ON_ERROR_STOP=1 -f database/seed.sql
& $psql -U trainer_events_owner -d trainer_events_dev -v ON_ERROR_STOP=1 -f database/tests/integrity.sql
```

The connection prompts for the role's password when needed. The integrity
script prints a `PASS` notice for each check and rolls back all test records.
For routine application permissions, connect as the database owner and run:

```sql
GRANT CONNECT ON DATABASE trainer_events_dev TO trainer_events_app;
GRANT USAGE ON SCHEMA public TO trainer_events_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO trainer_events_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO trainer_events_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO trainer_events_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO trainer_events_app;
```

Verify the seeded records and database-generated event IDs with:

```sql
SELECT (SELECT count(*) FROM users) AS users,
       (SELECT count(*) FROM events) AS events,
       (SELECT count(*) FROM event_registrations) AS registrations;
SELECT id, name, organizer_id FROM events ORDER BY id;
```

On the current Windows workspace, the PostgreSQL 18 service is running and
`psql.exe` is installed at the path above. Local administrator and development
role connections currently use the machine's passwordless local authentication
configuration; keep it restricted to local development. Do not use the
superuser for routine app access.

See [database/README.md](./database/README.md) for the relational model,
constraints, identifier transition, and registration-concurrency design.

## End-to-End Testing

Run the browser suite with:

```bash
npm run test:e2e
```

Playwright automatically starts the Vite development server and runs the TypeScript tests in Chromium, Firefox, and WebKit. Install the browser binaries once on a new machine with `npx playwright install`. The suite reports each test's pass/fail result in the terminal; screenshots and traces are retained for failures in `test-results`.

Every test intercepts the app's initial `/events.json` request and supplies the dedicated five-event dataset in `e2e/fixtures/events.ts`. The production JSON resource and the 500-event performance dataset are not used or modified. Playwright creates a fresh browser context for each test, so cookies, storage, and in-memory event changes are isolated; tests do not depend on execution order or external services.

To type-check the Playwright configuration and E2E tests independently, run `npm run typecheck:e2e`. The existing Vitest commands remain independent: they do not start a browser or development server.

## Features

### Event dashboard
- Displays event cards with information such as city, date, capacity, and registration count
- Provides a quick visual summary of how full or active the catalog is
- Keeps the UI organized by separating display logic into components

### Filtering
- Allows users to filter events by status
- Allows users to filter events by format/type
- Updates the visible list based on the current filters

### Create event flow
- Includes a form for creating a new event
- Adds the new entry to the top of the list
- Demonstrates controlled inputs and state updates in React

### Navigation
- Uses React Router to move between views
- Keeps the app feeling like a small multi-page interface without a backend

## Accessibility

- Navigation and event-detail actions use links; actions such as submitting a form, retrying a request, and resetting the catalog use buttons.
- All event form controls have associated labels. Submitting invalid data displays field-specific errors, exposes each affected control's invalid state and error description to assistive technology, and moves focus to the first invalid control. Editing a value updates its error information.
- Keyboard users can reach and operate links, buttons, search and filter controls, and form fields using standard browser keyboard interaction. Focus indicators remain visible; route changes move focus to the new page heading, and returning from event details restores focus to that event's details link when it is still displayed.
- Page titles reflect the current route. Loading, request failures, catalog result counts, and successful create/edit operations are announced through concise live regions.

Known limitations: announcements and keyboard focus have not been tested against every browser and screen reader combination. If the originating event is no longer displayed when returning from its details page, focus falls back to the catalog heading.

## Performance

### Dataset

`public/events.json` is a checked-in, deterministic fixture containing 500 events: 167 League, 167 Tournament, and 166 Casual events across 29 locations and 495 dates. Capacity and registration counts vary, including zero-registration and full events. The JSON endpoint and runtime validation remain unchanged. To recreate the fixture, run `npm run generate:events`; the script preserves the original nine events and generates the remaining records without randomness or React-render-time generation.

### Profiling methodology and baseline

Measurements were taken in the Vite development build with React Strict Mode, on the same browser session and 500-event fixture. Each action was repeated five times after the catalog was loaded; searches, filters, and sorts were alternated between comparable values. The initial render measurement starts after the loaded collection is handed to React, so it excludes the `/events.json` request and parsing time. Values below are React Profiler `actualDuration` in milliseconds; each median is calculated from the five listed runs.

The integrated browser did not expose the React DevTools Profiler panel. For reproducibility, temporary React `<Profiler>` boundaries around the application and cards collected render durations, and a temporary development-only counter confirmed `EventCard` function invocations. That instrumentation was removed after profiling. The React Profiler API does not report a separate commit-duration measurement, so these results describe render work, not a DevTools commit-phase breakdown.

| Interaction | Five runs (ms) | Median (ms) | Baseline findings |
| --- | --- | ---: | --- |
| Initial catalog rendering | 155.6, 149.6, 171.9, 192.2, 163.0 | 163.0 | All 500 cards mounted. |
| Search input | 51.5, 49.5, 65.5, 67.3, 34.5 | 51.5 | Alternating `League` and `Tournament` queries showed 167 results; the query and visible collection changed. |
| Format filtering | 33.7, 167.2, 21.1, 104.4, 12.1 | 33.7 | Alternating all formats and League changed the visible collection between 500 and 167 cards. |
| Sorting | 64.5, 41.6, 26.9, 94.4, 63.1 | 63.1 | All 500 `EventCard` functions ran even though sorting changed only order and all event props were unchanged. |
| Editing one event | 191.7, 127.8, 94.8, 80.3, 81.5 | 94.8 | Saving an edit returned to the catalog route, which had unmounted; all 500 cards mounted again. |
| Catalog → details | 2.1, 1.6, 0.8, 0.9, 0.5 | 0.9 | The details view is small compared with the catalog. |
| Details → catalog | 194.9, 111.5, 93.4, 81.8, 85.6 | 93.4 | Returning remounted all 500 cards. |

### Findings and decisions

- `DashboardPage` derives its visible events from the reducer-owned `events` array, status, format, search query, and sort option. The React Compiler is enabled in `vite.config.js`; inspection of its development output showed that it already caches this derivation against those inputs. No explicit `useMemo` or duplicate visible-events state was added. Events, query, selected format, status, and sort changes invalidate the cached result; unrelated component updates can reuse it.
- Sorting was the avoidable cost: 500 cards re-ran even though each card's `event` reference and `density` value were unchanged. `EventCard` now uses `memo`. It has no callback props, and the reducer replaces only the edited event object, so a changed event still invalidates the memo while unchanged event references remain eligible to bail out.
- With the same sort interaction and five-run method, the memoized build's median `actualDuration` was 42.9 ms (runs: 99.8, 46.4, 23.6, 42.9, 25.3 ms), about 32% below the 63.1 ms baseline. A temporary invocation counter recorded 500 card function calls per sort before memoization (1,000 in development Strict Mode's double render) and zero after memoization. This confirms the card function was skipped; profiler boundaries themselves can still report wrapper commits.
- Filtering and search necessarily mount cards newly entering the visible result set, and route navigation back to the catalog remounts the catalog because the route is replaced. `memo` does not avoid those mounts; keeping the catalog mounted solely to change this behavior was not justified by the measurements.
- `EventSummary` still recalculates its totals when the visible collection changes. Sorting alone creates a new ordered collection, but the measured dominant avoidable work was rendering all cards; no extra summary cache was added.
- This checkout does not contain an `EventProvider`, `useEvents`, or event-operation Context: `App` owns the typed reducer and passes event data and operations through route props. That existing single source of truth and reducer boundary were left intact. Consequently there is no provider-value identity to profile, and adding split contexts would introduce new architecture without evidence of a benefit.

## Tech stack

- React
- Vite
- React Router DOM
- TypeScript
- CSS

## Project structure

```text
src/
├── App.tsx
├── App.css
├── index.css
├── main.tsx
├── types/
│   └── event.ts
├── assets/
└── components/
    ├── CreateEventForm.tsx
    ├── EditEventForm.tsx
    ├── EventCard.tsx
    ├── EventCatalog.tsx
    ├── EventFilter.tsx
    ├── EventSummary.tsx
    ├── SearchAndSortControls.tsx
    └── StatusLabels.tsx
```

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Start the local development server:

```bash
npm run dev
```

3. Open the Vite local URL in your browser to view the application.

## Resume-ready project summary

A strong resume description for this project could be:

> Built a React-based event dashboard application to practice reusable component design, state-driven UI updates, filtering logic, and route-based navigation. The project simulates a real-world event management workflow and demonstrates strong front-end development fundamentals relevant to modern web applications.

## Possible future improvements

This project is intentionally designed to grow. Future enhancements could include:

- Search and sorting
- Edit and delete event actions
- Local storage persistence
- API integration
- UI testing
- More advanced dashboard analytics

## Summary

This repository is a practical, beginner-to-intermediate React exercise with clear portfolio value. It is intentionally structured to be extensible, making it a strong foundation for demonstrating real front-end skill growth over time.
