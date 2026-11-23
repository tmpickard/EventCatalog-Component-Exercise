BEGIN;

INSERT INTO users (id, email, display_name, password_hash)
VALUES
    (
        '11111111-1111-4111-8111-111111111111',
        'alice@example.test',
        'Alice Morgan',
        '$argon2id$v=19$m=19456,t=2,p=1$yf0YW+yInBbwPYb75lbO/g$bfj7HurW+OHwi7SelHmQOwKtxCPNfevpDQWKRhi+Ufo'
    ),
    (
        '22222222-2222-4222-8222-222222222222',
        'bob@example.test',
        'Bob Rivera',
        '$argon2id$v=19$m=19456,t=2,p=1$Ht+ibtxrNJckT7HgeenXzA$mey/eLnzS5YBF87EOWjNKB7pMWR+wevuovsxkVeNzjk'
    ),
    (
        '33333333-3333-4333-8333-333333333333',
        'charlie@example.test',
        'Charlie Chen',
        '$argon2id$v=19$m=19456,t=2,p=1$l1HcYe4Th+txnqeFlU0DLA$nCK1NXdVEN5iqrK+AqG6ep4gRnZGsM8PpPuuDoT0WNg'
    )
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    password_hash = EXCLUDED.password_hash;

INSERT INTO users (id, email, display_name, password_hash)
SELECT
    ('55555555-5555-4555-8555-' || lpad(to_hex(n), 12, '0'))::UUID,
    format('community-participant-%s@example.test', n),
    format('Community Participant %s', n),
    'development-seed-only'
FROM generate_series(1, 51) AS participants(n)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    password_hash = EXCLUDED.password_hash;

INSERT INTO events (organizer_id, name, city, state, event_date, capacity, registered, format)
SELECT '11111111-1111-4111-8111-111111111111', 'Seattle Trainer League', 'Seattle', 'WA', '2027-02-13', 32, 0, 'League'
WHERE NOT EXISTS (
    SELECT 1 FROM events
    WHERE organizer_id = '11111111-1111-4111-8111-111111111111'
      AND name = 'Seattle Trainer League'
);

INSERT INTO events (organizer_id, name, city, state, event_date, capacity, registered, format)
SELECT '11111111-1111-4111-8111-111111111111', 'Bellevue Casual Meetup', 'Bellevue', 'WA', '2027-02-20', 24, 0, 'Casual'
WHERE NOT EXISTS (
    SELECT 1 FROM events
    WHERE organizer_id = '11111111-1111-4111-8111-111111111111'
      AND name = 'Bellevue Casual Meetup'
);

INSERT INTO events (organizer_id, name, city, state, event_date, capacity, registered, format)
SELECT '22222222-2222-4222-8222-222222222222', 'Portland Regional Tournament', 'Portland', 'OR', '2027-03-06', 64, 0, 'Tournament'
WHERE NOT EXISTS (
    SELECT 1 FROM events
    WHERE organizer_id = '22222222-2222-4222-8222-222222222222'
      AND name = 'Portland Regional Tournament'
);

INSERT INTO events (organizer_id, name, city, state, event_date, capacity, registered, format)
SELECT '22222222-2222-4222-8222-222222222222', 'Tacoma Championship', 'Tacoma', 'WA', '2027-03-20', 48, 0, 'Tournament'
WHERE NOT EXISTS (
    SELECT 1 FROM events
    WHERE organizer_id = '22222222-2222-4222-8222-222222222222'
      AND name = 'Tacoma Championship'
);

INSERT INTO events (organizer_id, name, city, state, event_date, capacity, registered, format)
SELECT '33333333-3333-4333-8333-333333333333', 'Everett Community Gathering', 'Everett', 'WA', '2027-04-03', 30, 0, 'Casual'
WHERE NOT EXISTS (
    SELECT 1 FROM events
    WHERE organizer_id = '33333333-3333-4333-8333-333333333333'
      AND name = 'Everett Community Gathering'
);

INSERT INTO events (organizer_id, name, city, state, event_date, capacity, registered, format)
SELECT '33333333-3333-4333-8333-333333333333', 'Olympia Trainer League', 'Olympia', 'WA', '2027-04-17', 36, 0, 'League'
WHERE NOT EXISTS (
    SELECT 1 FROM events
    WHERE organizer_id = '33333333-3333-4333-8333-333333333333'
      AND name = 'Olympia Trainer League'
);

WITH seeded_event_counts (organizer_id, name, registration_count) AS (
    VALUES
        ('11111111-1111-4111-8111-111111111111'::UUID, 'Seattle Trainer League', 18),
        ('11111111-1111-4111-8111-111111111111'::UUID, 'Bellevue Casual Meetup', 9),
        ('22222222-2222-4222-8222-222222222222'::UUID, 'Portland Regional Tournament', 51),
        ('22222222-2222-4222-8222-222222222222'::UUID, 'Tacoma Championship', 37),
        ('33333333-3333-4333-8333-333333333333'::UUID, 'Everett Community Gathering', 12),
        ('33333333-3333-4333-8333-333333333333'::UUID, 'Olympia Trainer League', 22)
)
UPDATE events AS e
SET registered = 0
FROM seeded_event_counts AS seed
WHERE e.organizer_id = seed.organizer_id
  AND e.name = seed.name
  AND NOT EXISTS (
      SELECT 1 FROM event_registrations AS r WHERE r.event_id = e.id
  );

WITH seeded_event_counts (organizer_id, name, registration_count) AS (
    VALUES
        ('11111111-1111-4111-8111-111111111111'::UUID, 'Seattle Trainer League', 18),
        ('11111111-1111-4111-8111-111111111111'::UUID, 'Bellevue Casual Meetup', 9),
        ('22222222-2222-4222-8222-222222222222'::UUID, 'Portland Regional Tournament', 51),
        ('22222222-2222-4222-8222-222222222222'::UUID, 'Tacoma Championship', 37),
        ('33333333-3333-4333-8333-333333333333'::UUID, 'Everett Community Gathering', 12),
        ('33333333-3333-4333-8333-333333333333'::UUID, 'Olympia Trainer League', 22)
)
INSERT INTO event_registrations (event_id, user_id)
SELECT
    e.id,
    ('55555555-5555-4555-8555-' || lpad(to_hex(participant.n), 12, '0'))::UUID
FROM seeded_event_counts AS seed
JOIN events AS e
  ON e.organizer_id = seed.organizer_id
 AND e.name = seed.name
CROSS JOIN LATERAL generate_series(1, seed.registration_count) AS participant(n)
WHERE NOT EXISTS (
    SELECT 1 FROM event_registrations AS r WHERE r.event_id = e.id
);

COMMIT;
