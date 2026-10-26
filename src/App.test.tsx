import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { createTestEvents } from './test/fixtures';
import { renderWithRouter } from './test/testUtils';
import type { Event } from './types/event';

function responseWithEvents(events: Event[]): Response {
  return new Response(JSON.stringify(events), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function stubEventRequest(events = createTestEvents()) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(responseWithEvents(events));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function visibleEventNames(): Array<string | null> {
  return screen.queryAllByRole('article').map((article) =>
    within(article).getByRole('heading', { level: 3 }).textContent,
  );
}

function createDeferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error('The deferred request has not been initialized.');
  };
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('event catalog controls', () => {
  beforeEach(() => {
    stubEventRequest();
  });

  it('shows only events matching a search query', async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />);

    await screen.findByRole('heading', { name: 'Upcoming Events' });
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'Seattle');

    expect(visibleEventNames()).toEqual([
      'Seattle Trainer League',
      'Seattle Championship',
    ]);
  });

  it('filters the visible catalog by format', async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />);

    await screen.findByRole('heading', { name: 'Upcoming Events' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Format' }), 'tournament');

    expect(visibleEventNames()).toEqual([
      'Portland Regional Tournament',
      'Seattle Championship',
    ]);
  });

  it('applies search and format filtering together', async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />);

    await screen.findByRole('heading', { name: 'Upcoming Events' });
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'Seattle');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Format' }), 'tournament');

    expect(visibleEventNames()).toEqual(['Seattle Championship']);
  });

  it('sorts displayed events chronologically when the latest-first option is selected', async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />);

    await screen.findByRole('heading', { name: 'Upcoming Events' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort' }), 'date-desc');

    expect(visibleEventNames()).toEqual([
      'Seattle Championship',
      'Portland Regional Tournament',
      'Seattle Trainer League',
      'Bellevue Casual Meetup',
    ]);
  });

  it('shows an empty-results message for an unmatched search', async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />);

    await screen.findByRole('heading', { name: 'Upcoming Events' });
    await user.type(
      screen.getByRole('searchbox', { name: 'Search' }),
      'No event in this catalog',
    );

    expect(screen.getByText('No events match your search or filters.')).toBeInTheDocument();
    expect(visibleEventNames()).toEqual([]);
  });
});

describe('asynchronous event loading', () => {
  it('shows loading first and renders the catalog after a successful request', async () => {
    const request = createDeferred<Response>();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockReturnValue(request.promise));

    renderWithRouter(<App />);

    expect(screen.getByText('Loading upcoming events...')).toBeInTheDocument();
    request.resolve(responseWithEvents(createTestEvents()));

    expect(
      await screen.findByRole('heading', { name: 'Upcoming Events' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading upcoming events...')).not.toBeInTheDocument();
  });

  it('shows an understandable error and a Retry control when loading fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new Error('Service unavailable')),
    );

    renderWithRouter(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't retrieve the upcoming community events.",
    );
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('recovers from a failed request after the user retries', async () => {
    const user = userEvent.setup();
    const retryRequest = createDeferred<Response>();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockReturnValueOnce(retryRequest.promise);
    vi.stubGlobal('fetch', fetchMock);

    renderWithRouter(<App />);
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(screen.getByText('Loading upcoming events...')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    retryRequest.resolve(responseWithEvents(createTestEvents()));

    expect(
      await screen.findByRole('heading', { name: 'Upcoming Events' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('event detail navigation', () => {
  it('opens Event 17 details and returns to the unchanged catalog collection', async () => {
    const user = userEvent.setup();
    stubEventRequest();
    renderWithRouter(<App />);

    await screen.findByRole('heading', { name: 'Upcoming Events' });
    await user.click(
      screen.getByRole('link', { name: 'View details for Seattle Trainer League' }),
    );

    expect(
      screen.getByRole('heading', { name: 'Seattle Trainer League', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Seattle, WA')).toBeInTheDocument();
    expect(screen.getByText('2026-11-14')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Back to Event Catalog' }));

    expect(await screen.findByRole('heading', { name: 'Upcoming Events' })).toBeInTheDocument();
    expect(visibleEventNames()).toEqual([
      'Bellevue Casual Meetup',
      'Seattle Trainer League',
      'Portland Regional Tournament',
      'Seattle Championship',
    ]);
  });
});
