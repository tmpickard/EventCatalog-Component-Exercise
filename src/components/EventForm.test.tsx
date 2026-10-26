import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditEventForm from './EditEventForm';
import EventForm from './EventForm';
import type { CreateEventInput, Event } from '../types/event';
import { createTestEvents } from '../test/fixtures';
import { renderWithRouter } from '../test/testUtils';
import { Route, Routes } from 'react-router-dom';

describe('EventForm creation', () => {
  it('renders labeled controls and submits typed creation information', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(event: CreateEventInput) => void>();

    renderWithRouter(
      <EventForm mode={{ type: 'create' }} onSubmit={onSubmit} />,
      '/create',
    );

    expect(screen.getByRole('textbox', { name: 'Event name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'City' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'State' })).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Capacity' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Format' })).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Event name' }), 'Seattle Trainer League');
    await user.type(screen.getByRole('textbox', { name: 'City' }), 'Seattle');
    await user.type(screen.getByRole('textbox', { name: 'State' }), 'wa');
    await user.type(screen.getByLabelText('Date'), '2026-11-14');
    await user.type(screen.getByRole('spinbutton', { name: 'Capacity' }), '32');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Format' }), 'League');
    await user.click(screen.getByRole('button', { name: 'Create Event' }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      name: 'Seattle Trainer League',
      city: 'Seattle',
      state: 'WA',
      date: '2026-11-14',
      capacity: 32,
      format: 'League',
    });
    expect(typeof onSubmit.mock.calls[0][0].capacity).toBe('number');
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('id');
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('registered');
  });

  it('shows required-field errors and focuses the first invalid control', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(event: CreateEventInput) => void>();

    renderWithRouter(
      <EventForm mode={{ type: 'create' }} onSubmit={onSubmit} />,
      '/create',
    );

    await user.click(screen.getByRole('button', { name: 'Create Event' }));

    const name = screen.getByRole('textbox', { name: 'Event name' });
    const city = screen.getByRole('textbox', { name: 'City' });
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(city).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Error: Enter an event name.');
    expect(city).toHaveAccessibleDescription('Error: Enter a city.');
    expect(name).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([0, -1])('rejects capacity %s with an accessible error', async (capacity) => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(event: CreateEventInput) => void>();

    renderWithRouter(
      <EventForm mode={{ type: 'create' }} onSubmit={onSubmit} />,
      '/create',
    );

    await user.type(screen.getByRole('textbox', { name: 'Event name' }), 'Seattle Trainer League');
    await user.type(screen.getByRole('textbox', { name: 'City' }), 'Seattle');
    await user.type(screen.getByRole('textbox', { name: 'State' }), 'WA');
    await user.type(screen.getByLabelText('Date'), '2026-11-14');
    await user.type(screen.getByRole('spinbutton', { name: 'Capacity' }), String(capacity));
    await user.click(screen.getByRole('button', { name: 'Create Event' }));

    const capacityControl = screen.getByRole('spinbutton', { name: 'Capacity' });
    expect(screen.getByRole('alert')).toHaveTextContent('Capacity must be greater than zero.');
    expect(capacityControl).toHaveAttribute('aria-invalid', 'true');
    expect(capacityControl).toHaveAccessibleDescription(
      'Error: Capacity must be greater than zero.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('EventForm editing', () => {
  function renderEditForm(onUpdateEvent: (event: Event) => void) {
    const events = createTestEvents();
    return renderWithRouter(
      <Routes>
        <Route
          path="/edit/:eventId"
          element={<EditEventForm events={events} onUpdateEvent={onUpdateEvent} />}
        />
      </Routes>,
      '/edit/17',
    );
  }

  it('populates the existing event, then preserves its identity and registration count on update', async () => {
    const user = userEvent.setup();
    const onUpdateEvent = vi.fn<(event: Event) => void>();
    renderEditForm(onUpdateEvent);

    expect(screen.getByRole('textbox', { name: 'Event name' })).toHaveValue(
      'Seattle Trainer League',
    );
    expect(screen.getByRole('spinbutton', { name: 'Capacity' })).toHaveValue(32);
    expect(screen.getByRole('combobox', { name: 'Format' })).toHaveValue('League');

    await user.clear(screen.getByRole('textbox', { name: 'Event name' }));
    await user.type(screen.getByRole('textbox', { name: 'Event name' }), 'Seattle Trainer Championship');
    await user.clear(screen.getByRole('spinbutton', { name: 'Capacity' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Capacity' }), '40');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onUpdateEvent).toHaveBeenCalledExactlyOnceWith({
      ...createTestEvents()[0],
      name: 'Seattle Trainer Championship',
      capacity: 40,
    });
    expect(typeof onUpdateEvent.mock.calls[0][0].capacity).toBe('number');
  });

  it('rejects capacity below the current registration count', async () => {
    const user = userEvent.setup();
    const onUpdateEvent = vi.fn<(event: Event) => void>();
    renderEditForm(onUpdateEvent);

    await user.clear(screen.getByRole('spinbutton', { name: 'Capacity' }));
    await user.type(screen.getByRole('spinbutton', { name: 'Capacity' }), '19');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    const capacity = screen.getByRole('spinbutton', { name: 'Capacity' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Capacity cannot be less than the 20 registered participants.',
    );
    expect(capacity).toHaveAttribute('aria-invalid', 'true');
    expect(capacity).toHaveAccessibleDescription(
      'Error: Capacity cannot be less than the 20 registered participants.',
    );
    expect(onUpdateEvent).not.toHaveBeenCalled();
  });

  it('cancels edits without invoking the update callback', async () => {
    const user = userEvent.setup();
    const onUpdateEvent = vi.fn<(event: Event) => void>();
    renderEditForm(onUpdateEvent);

    await user.clear(screen.getByRole('textbox', { name: 'Event name' }));
    await user.type(screen.getByRole('textbox', { name: 'Event name' }), 'Discarded name');
    await user.clear(screen.getByRole('textbox', { name: 'City' }));
    await user.type(screen.getByRole('textbox', { name: 'City' }), 'Tacoma');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onUpdateEvent).not.toHaveBeenCalled();
  });
});
