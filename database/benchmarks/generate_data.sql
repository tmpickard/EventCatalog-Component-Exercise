\set ON_ERROR_STOP on

-- Run only in a disposable development/benchmark database. This replaces all
-- rows in the three application tables and resets the event identity sequence.
BEGIN;

TRUNCATE TABLE event_registrations, events, users RESTART IDENTITY;

INSERT INTO users (id, email, display_name, password_hash)
SELECT
    md5('event-catalog-benchmark-user-' || user_number)::UUID,
    format('benchmark-user-%s@example.test', lpad(user_number::TEXT, 4, '0')),
    format('Benchmark User %s', lpad(user_number::TEXT, 4, '0')),
    'benchmark-only-placeholder-hash'
FROM generate_series(0, 1999) AS generated_users(user_number);

INSERT INTO events (
    organizer_id,
    name,
    city,
    state,
    event_date,
    capacity,
    registered,
    format
)
SELECT
    md5('event-catalog-benchmark-user-' || ((event_number - 1) % 100))::UUID,
    format('Benchmark Event %s', lpad(event_number::TEXT, 6, '0')),
    (ARRAY[
        'Seattle', 'Portland', 'San Francisco', 'Los Angeles', 'Denver',
        'Austin', 'Chicago', 'Boston', 'New York', 'Atlanta',
        'Phoenix', 'Miami', 'Minneapolis', 'Detroit', 'Nashville',
        'Las Vegas', 'Salt Lake City', 'Tampa', 'Cleveland', 'Charlotte'
    ])[((event_number - 1) % 20) + 1],
    CASE
        WHEN event_number IN (1, 2, 11, 12) THEN 'WA'
        WHEN event_number % 100 < 15 THEN 'WA'
        WHEN event_number % 100 < 27 THEN 'CA'
        WHEN event_number % 100 < 35 THEN 'OR'
        WHEN event_number % 100 < 42 THEN 'TX'
        WHEN event_number % 100 < 48 THEN 'NY'
        ELSE (ARRAY[
            'AZ', 'CO', 'FL', 'GA', 'IL', 'MA', 'MI', 'MN', 'NC', 'NV',
            'OH', 'TN', 'UT', 'VA', 'WI', 'AL', 'AK', 'AR', 'CT', 'DE',
            'HI', 'ID', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MS', 'MO',
            'MT', 'NE', 'NH', 'NJ', 'NM', 'ND', 'OK', 'PA', 'RI', 'SC',
            'SD', 'VT', 'WV', 'WY', 'IN'
        ])[((event_number - 1) % 45) + 1]
    END,
    CASE event_number
        WHEN 1 THEN DATE '2026-11-16'
        WHEN 2 THEN DATE '2027-03-31'
        WHEN 11 THEN DATE '2026-12-01'
        WHEN 12 THEN DATE '2026-11-16'
        ELSE DATE '2024-01-01' + ((event_number * 37) % 2557)
    END,
    CASE
        WHEN event_number IN (1, 2, 3, 11) THEN 20
        ELSE 20 + ((event_number * 17) % 81)
    END,
    CASE
        WHEN event_number IN (1, 2) THEN 5
        WHEN event_number = 3 THEN 15
        WHEN event_number % 10 = 1 THEN 20
        WHEN event_number % 10 = 2 THEN 5
        ELSE 0
    END,
    CASE
        WHEN event_number IN (1, 2, 11, 12) THEN 'Tournament'
        WHEN event_number % 100 < 35 THEN 'League'
        WHEN event_number % 100 < 75 THEN 'Tournament'
        ELSE 'Casual'
    END
FROM generate_series(1, 100000) AS generated_events(event_number);

-- Keep both foreign keys and the unique constraint active. Only the row-level
-- counter trigger is bypassed so this fixture does not perform 250,000 updates.
ALTER TABLE event_registrations
    DISABLE TRIGGER event_registrations_maintain_count;

INSERT INTO event_registrations (event_id, user_id)
SELECT
    e.id,
    md5(
        'event-catalog-benchmark-user-'
        || (((e.id - 1) * 20 + registration_number - 1) % 2000)
    )::UUID
FROM events AS e
CROSS JOIN LATERAL generate_series(1, e.registered) AS generated_registrations(registration_number);

UPDATE events AS e
SET registered = counts.registration_count
FROM (
    SELECT e_count.id, COUNT(r.id)::INTEGER AS registration_count
    FROM events AS e_count
    LEFT JOIN event_registrations AS r ON r.event_id = e_count.id
    GROUP BY e_count.id
) AS counts
WHERE counts.id = e.id;

ALTER TABLE event_registrations
    ENABLE TRIGGER event_registrations_maintain_count;

DO $$
BEGIN
    IF (SELECT COUNT(*) FROM users) <> 2000
       OR (SELECT COUNT(*) FROM events) <> 100000
       OR (SELECT COUNT(*) FROM event_registrations) <> 250000 THEN
        RAISE EXCEPTION 'Benchmark fixture row counts do not match their targets';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM events AS e
        LEFT JOIN event_registrations AS r ON r.event_id = e.id
        GROUP BY e.id, e.registered, e.capacity
        HAVING e.registered <> COUNT(r.id)
            OR e.registered > e.capacity
    ) THEN
        RAISE EXCEPTION 'Benchmark fixture registration counters or capacities are inconsistent';
    END IF;
END;
$$;

ANALYZE users;
ANALYZE events;
ANALYZE event_registrations;

COMMIT;

\echo 'Benchmark fixture created: 2,000 users, 100,000 events, 250,000 registrations.'
