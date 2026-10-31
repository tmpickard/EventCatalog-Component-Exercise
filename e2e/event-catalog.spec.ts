import { expect, test } from '@playwright/test';
import { e2eEvents } from './fixtures/events';

async function interceptEvents(page: import('@playwright/test').Page) {
  await page.route('**/events.json', (route) =>
    route.fulfill({ json: e2eEvents }),
  );
}

test.describe('event catalog workflows', () => {
  test('creates an event, opens its details, and returns to the catalog', async ({
    page,
  }) => {
    await interceptEvents(page);
    await page.goto('/events');

    await expect(
      page.getByRole('heading', { name: 'Community Events' }),
    ).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Showing 5 of 5 events.' }))
      .toBeVisible();
    await page.getByRole('link', { name: 'Create Event' }).first().click();

    await expect(
      page.getByRole('heading', { name: 'Create a New Event' }),
    ).toBeVisible();
    const eventName = page.getByLabel('Event name', { exact: true });
    await eventName.fill('Seattle Autumn Trainer Gathering');
    await expect(eventName).toHaveValue('Seattle Autumn Trainer Gathering');
    await page.getByLabel('City', { exact: true }).fill('Seattle');
    await page.getByLabel('State', { exact: true }).fill('WA');
    await page.getByLabel('Date', { exact: true }).fill('2026-11-14');
    await page.getByLabel('Capacity', { exact: true }).fill('40');
    await page.getByLabel('Format', { exact: true }).selectOption('Casual');
    await page.getByRole('button', { name: 'Create Event' }).click();

    const newEventCard = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Seattle Autumn Trainer Gathering' }) });
    await expect(newEventCard).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Total Events: 6' }),
    ).toBeVisible();

    await newEventCard.getByRole('link', { name: 'View Details' }).click();
    await expect(page).toHaveURL(/\/events\/\d+$/);
    await expect(
      page.getByRole('heading', { name: 'Seattle Autumn Trainer Gathering' }),
    ).toBeVisible();
    await expect(
      page
        .getByText('Capacity', { exact: true })
        .locator('..')
        .getByText('40', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('0', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Back to Event Catalog' }).click();
    await expect(newEventCard).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Showing 6 of 6 events.' }))
      .toBeVisible();
  });

  test('edits an event without changing its identity or registration count', async ({
    page,
  }) => {
    await interceptEvents(page);
    await page.goto('/events');

    const originalCard = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Seattle Trainer League' }) });
    const originalDetailsHref = await originalCard
      .getByRole('link', { name: 'View Details' })
      .getAttribute('href');
    expect(originalDetailsHref).not.toBeNull();

    await originalCard.getByRole('link', { name: 'Edit Event' }).click();
    await page.getByLabel('Event name').fill('Seattle Championship Trainer League');
    await page.getByLabel('Capacity').fill('48');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(
      page.getByRole('heading', { name: 'Total Events: 5' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Seattle Trainer League' }),
    ).toHaveCount(0);
    const updatedCard = page
      .locator('article')
      .filter({
        has: page.getByRole('heading', {
          name: 'Seattle Championship Trainer League',
        }),
      });
    await expect(updatedCard).toBeVisible();
    await expect(
      page.getByRole('status').filter({ hasText: 'Showing 5 of 5 events.' }),
    ).toBeVisible();

    await updatedCard.getByRole('link', { name: 'View Details' }).click();
    await expect(page).toHaveURL(new RegExp(`${originalDetailsHref}$`));
    await expect(
      page.getByRole('heading', {
        name: 'Seattle Championship Trainer League',
      }),
    ).toBeVisible();
    await expect(page.getByText('48', { exact: true })).toBeVisible();
    await expect(page.getByText('20', { exact: true })).toBeVisible();
  });

  test('rejects a capacity below the registered count and preserves the event', async ({
    page,
  }) => {
    await interceptEvents(page);
    await page.goto('/events');

    const eventCard = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Seattle Trainer League' }) });
    await eventCard.getByRole('link', { name: 'Edit Event' }).click();
    const capacity = page.getByLabel('Capacity');
    await capacity.fill('19');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    const capacityError = page.getByText(
      'Error: Capacity cannot be less than registered participants.',
    );
    await expect(capacityError).toBeVisible();
    await expect(capacity).toBeFocused();
    await expect(capacity).toHaveAttribute('aria-invalid', 'true');
    await expect(capacity).toHaveAttribute('aria-describedby', 'event-capacity-error');

    await page.getByRole('button', { name: 'Cancel' }).click();
    const unchangedCard = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Seattle Trainer League' }) });
    await unchangedCard.getByRole('link', { name: 'View Details' }).click();
    await expect(page.getByText('32', { exact: true })).toBeVisible();
    await expect(page.getByText('20', { exact: true })).toBeVisible();
  });

  test('combines search, format filtering, and chronological sorting', async ({
    page,
  }) => {
    await interceptEvents(page);
    await page.goto('/events');

    await page.getByLabel('Search').fill('Seattle');
    await page.getByLabel('Format').selectOption('tournament');
    await expect(
      page.getByRole('status').filter({ hasText: 'Showing 1 of 5 events.' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Seattle Championship' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Portland Regional Tournament' }),
    ).toHaveCount(0);

    await page.getByLabel('Search').fill('');
    await expect(
      page.getByRole('heading', { name: 'Portland Regional Tournament' }),
    ).toBeVisible();
    await expect(
      page.getByRole('status').filter({ hasText: 'Showing 2 of 5 events.' }),
    ).toBeVisible();
    await page.getByLabel('Sort').selectOption('date-asc');

    await expect(page.locator('article h3').allTextContents()).resolves.toEqual([
      'Seattle Championship',
      'Portland Regional Tournament',
    ]);
    await expect(page.getByRole('heading', { name: 'Total Events: 2' }))
      .toBeVisible();
  });

  test('loads and refreshes an existing event through direct navigation', async ({
    page,
  }) => {
    await interceptEvents(page);
    await page.goto('/events/17');

    await expect(
      page.getByRole('heading', { name: 'Seattle Trainer League' }),
    ).toBeVisible();
    await expect(page.getByText('32', { exact: true })).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Seattle Trainer League' }),
    ).toBeVisible();
    await expect(page.getByText('20', { exact: true })).toBeVisible();
  });

  test('shows a not-found page for an unknown event ID', async ({ page }) => {
    await interceptEvents(page);
    await page.goto('/events/999999');

    await expect(
      page.getByRole('heading', { name: 'Event not found' }),
    ).toBeVisible();
    await expect(
      page.getByText('The event address may be invalid, or the event may no longer exist.'),
    ).toBeVisible();
  });

  test('recovers from a failed initial request using keyboard retry', async ({
    page,
  }) => {
    let releaseInitialRequests!: () => void;
    const firstRequestGate = new Promise<void>((resolve) => {
      releaseInitialRequests = resolve;
    });
    let signalInitialRequest!: () => void;
    const initialRequestIntercepted = new Promise<void>((resolve) => {
      signalInitialRequest = resolve;
    });
    let retryRequestCount = 0;
    let retryAllowed = false;
    await page.route('**/events.json', async (route) => {
      if (!retryAllowed) {
        signalInitialRequest();
        await firstRequestGate;
        await route.abort();
        return;
      }

      retryRequestCount += 1;
      await route.fulfill({ json: e2eEvents });
    });

    await page.goto('/events');
    await initialRequestIntercepted;
    await expect(page.getByText('Loading upcoming events...')).toBeVisible();
    releaseInitialRequests();

    await expect(
      page.getByRole('heading', { name: 'Unable to Load Events' }),
    ).toBeVisible();
    await expect(
      page.getByText("We couldn't retrieve the upcoming community events."),
    ).toBeVisible();

    const retryButton = page.getByRole('button', { name: 'Retry' });
    await retryButton.focus();
    retryAllowed = true;
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Community Events' }),
    ).toBeVisible();
    await expect(
      page.getByRole('status').filter({ hasText: 'Showing 5 of 5 events.' }),
    ).toBeVisible();
    expect(retryRequestCount).toBe(1);
  });
});

test.describe('mobile event catalog', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('keeps catalog controls and the creation form usable without horizontal overflow', async ({
    page,
  }) => {
    await interceptEvents(page);
    await page.goto('/events');

    await expect(page.getByLabel('Search')).toBeVisible();
    await expect(page.getByLabel('Format')).toBeVisible();
    await expect(page.locator('article')).toHaveCount(5);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);

    await page.getByRole('link', { name: 'Create Event' }).first().click();
    await expect(page.getByLabel('Event name')).toBeVisible();
    await expect(page.getByLabel('City', { exact: true })).toBeVisible();
    await expect(page.getByLabel('State', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Date', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Capacity', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Format', { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });

  test('creates keyboard-submitted invalid input and focuses the first invalid field', async ({
    page,
  }) => {
    await interceptEvents(page);
    await page.goto('/events');

    const createLink = page.getByRole('link', { name: 'Create Event' }).first();
    await createLink.focus();
    await expect(createLink).toBeFocused();
    await page.keyboard.press('Enter');

    const formHeading = page.getByRole('heading', {
      name: 'Create a New Event',
    });
    await expect(formHeading).toBeFocused();
    const name = page.getByLabel('Event name');
    await page.keyboard.press('Tab');
    await expect(name).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('City', { exact: true })).toBeFocused();
    await page.keyboard.type('Seattle');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('State', { exact: true })).toBeFocused();
    await page.keyboard.type('WA');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Date', { exact: true })).toBeFocused();
    await page.getByLabel('Date', { exact: true }).fill('2026-11-14');
    const capacity = page.getByLabel('Capacity', { exact: true });
    for (let tabCount = 0; tabCount < 4; tabCount += 1) {
      if (await capacity.evaluate((element) => element === document.activeElement)) {
        break;
      }
      await page.keyboard.press('Tab');
    }
    await expect(capacity).toBeFocused();
    await page.keyboard.type('40');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Format', { exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Create Event' })).toBeFocused();
    await page.keyboard.press('Enter');

    const nameError = page.getByText('Error: Enter an event name.');
    await expect(nameError).toBeVisible();
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAttribute('aria-describedby', 'event-name-error');
  });
});
