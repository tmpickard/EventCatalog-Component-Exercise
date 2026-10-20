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
- Input validation and error handling
- Unit and UI testing
- More advanced dashboard analytics

## Summary

This repository is a practical, beginner-to-intermediate React exercise with clear portfolio value. It is intentionally structured to be extensible, making it a strong foundation for demonstrating real front-end skill growth over time.
