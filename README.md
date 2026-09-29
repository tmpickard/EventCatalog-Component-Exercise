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
