\set ON_ERROR_STOP on
\timing on

-- This suite rebuilds the fixture and leaves its candidate indexes installed.
-- Run only against a disposable benchmark database.
DROP INDEX IF EXISTS events_discovery_state_format_date_id_idx;
DROP INDEX IF EXISTS events_organizer_date_id_idx;
\ir ../benchmarks/generate_data.sql

CREATE FUNCTION pg_temp.assert_true(p_test_name TEXT, p_condition BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_condition IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'FAIL: %', p_test_name;
    END IF;
    RAISE NOTICE 'PASS: %', p_test_name;
END;
$$;

CREATE TEMP TABLE baseline_event_discovery AS
SELECT
    e.id AS event_id,
    e.name,
    e.event_date,
    u.display_name AS organizer_name,
    e.capacity,
    e.registered
FROM events AS e
JOIN users AS u ON u.id = e.organizer_id
WHERE e.state = 'WA'
  AND e.format = 'Tournament'
  AND e.event_date >= DATE '2026-11-16'
  AND e.event_date <= DATE '2027-03-31'
  AND e.registered < e.capacity
ORDER BY e.event_date ASC, e.id ASC
LIMIT 25;

CREATE TEMP TABLE baseline_organizer_dashboard AS
SELECT
    e.id AS event_id,
    e.name,
    e.event_date,
    e.capacity,
    e.registered,
    e.capacity - e.registered AS remaining_spots,
    COUNT(*) OVER () AS organizer_event_count,
    SUM(e.capacity) OVER () AS total_capacity,
    SUM(e.registered) OVER () AS total_registrations,
    SUM(e.capacity - e.registered) OVER () AS total_remaining_spots
FROM events AS e
WHERE e.organizer_id = md5('event-catalog-benchmark-user-0')::UUID
ORDER BY e.event_date ASC, e.id ASC;

CREATE TEMP TABLE baseline_registration_lookup AS
SELECT 'existing'::TEXT AS pair_kind, EXISTS (
    SELECT 1
    FROM event_registrations
    WHERE event_id = 2
      AND user_id = md5('event-catalog-benchmark-user-20')::UUID
) AS is_registered
UNION ALL
SELECT 'missing', EXISTS (
    SELECT 1
    FROM event_registrations
    WHERE event_id = 4
      AND user_id = md5('event-catalog-benchmark-user-0')::UUID
);

CREATE TEMP TABLE baseline_community_statistics AS
SELECT
    COUNT(*)::BIGINT AS total_events,
    COALESCE(SUM(capacity), 0)::BIGINT AS total_capacity,
    COALESCE(SUM(registered), 0)::BIGINT AS total_registrations,
    COALESCE(SUM(capacity - registered), 0)::BIGINT AS total_remaining_spots
FROM events;

SELECT pg_temp.assert_true(
    'fixture has target counts and exactly 250,000 registrations',
    (SELECT COUNT(*) = 2000 FROM users)
    AND (SELECT COUNT(*) = 100000 FROM events)
    AND (SELECT COUNT(*) = 250000 FROM event_registrations)
);

SELECT pg_temp.assert_true(
    'stored counters match registration rows and remain within capacity',
    NOT EXISTS (
        SELECT 1
        FROM events AS e
        LEFT JOIN event_registrations AS r ON r.event_id = e.id
        GROUP BY e.id, e.registered, e.capacity
        HAVING e.registered <> COUNT(r.id)
            OR e.registered > e.capacity
    )
);

SELECT pg_temp.assert_true(
    'selected organizer owns 1,000 events for the dashboard workload',
    (SELECT COUNT(*) = 1000
     FROM events
     WHERE organizer_id = md5('event-catalog-benchmark-user-0')::UUID)
);

SELECT pg_temp.assert_true(
    'organizer dashboard reports the expected event and aggregate totals',
    (SELECT COUNT(*) = 1000
            AND MIN(organizer_event_count) = 1000
            AND MIN(total_capacity) = (
                SELECT SUM(capacity)
                FROM events
                WHERE organizer_id = md5('event-catalog-benchmark-user-0')::UUID
            )
            AND MIN(total_registrations) = (
                SELECT SUM(registered)
                FROM events
                WHERE organizer_id = md5('event-catalog-benchmark-user-0')::UUID
            )
            AND MIN(total_remaining_spots) = (
                SELECT SUM(capacity - registered)
                FROM events
                WHERE organizer_id = md5('event-catalog-benchmark-user-0')::UUID
            )
     FROM baseline_organizer_dashboard)
);

SELECT pg_temp.assert_true(
    'registration workload has one existing and one valid missing pair',
    (SELECT bool_and(
                (pair_kind = 'existing' AND is_registered)
                OR (pair_kind = 'missing' AND NOT is_registered)
            )
     FROM baseline_registration_lookup)
);

SELECT pg_temp.assert_true(
    'community aggregation matches the generated platform totals',
    (SELECT total_events = 100000
            AND total_registrations = 250000
            AND total_remaining_spots = total_capacity - total_registrations
     FROM baseline_community_statistics)
);

SELECT pg_temp.assert_true(
    'discovery includes both inclusive date boundaries and excludes the full event',
    (SELECT COUNT(*) = 25
     FROM baseline_event_discovery)
    AND (SELECT COUNT(*) FILTER (WHERE id IN (1, 2)) = 2
         AND COUNT(*) FILTER (
             WHERE id = 1 AND event_date = DATE '2026-11-16'
         ) = 1
         AND COUNT(*) FILTER (
             WHERE id = 2 AND event_date = DATE '2027-03-31'
         ) = 1
     FROM events
     WHERE state = 'WA'
       AND format = 'Tournament'
       AND event_date >= DATE '2026-11-16'
       AND event_date <= DATE '2027-03-31'
       AND registered < capacity)
    AND EXISTS (
        SELECT 1
        FROM events
        WHERE id = 11
          AND state = 'WA'
          AND format = 'Tournament'
          AND event_date BETWEEN DATE '2026-11-16' AND DATE '2027-03-31'
          AND registered = capacity
    )
    AND NOT EXISTS (
        SELECT 1
        FROM events
        WHERE id = 11
          AND state = 'WA'
          AND format = 'Tournament'
          AND event_date BETWEEN DATE '2026-11-16' AND DATE '2027-03-31'
          AND registered < capacity
    )
);

SELECT pg_temp.assert_true(
    'same-date discovery results use ascending event ID as the tie-breaker',
    (SELECT array_agg(id ORDER BY event_date, id) = ARRAY[1, 12]::BIGINT[]
     FROM events
     WHERE id IN (1, 12)
       AND state = 'WA'
       AND format = 'Tournament'
       AND event_date BETWEEN DATE '2026-11-16' AND DATE '2027-03-31'
       AND registered < capacity)
);

DO $$
DECLARE
    actual_state TEXT;
    actual_constraint TEXT;
BEGIN
    BEGIN
        INSERT INTO event_registrations (event_id, user_id)
        VALUES (2, md5('event-catalog-benchmark-user-20')::UUID);

        RAISE EXCEPTION USING
            ERRCODE = 'Z0002',
            MESSAGE = 'Duplicate registration unexpectedly succeeded';
    EXCEPTION
        WHEN unique_violation THEN
            GET STACKED DIAGNOSTICS
                actual_state = RETURNED_SQLSTATE,
                actual_constraint = CONSTRAINT_NAME;

            IF actual_state <> '23505'
               OR actual_constraint <> 'event_registrations_event_id_user_id_key' THEN
                RAISE EXCEPTION 'Duplicate rejected by unexpected constraint/state: % / %',
                    actual_constraint, actual_state;
            END IF;
        WHEN SQLSTATE 'Z0002' THEN
            RAISE EXCEPTION 'Duplicate registration unexpectedly succeeded';
    END;
END;
$$;

SELECT pg_temp.assert_true(
    'duplicate registration is rejected without changing its stored counter',
    (SELECT registered = 5 FROM events WHERE id = 2)
    AND (SELECT COUNT(*) = 5 FROM event_registrations WHERE event_id = 2)
);

\ir ../indexes.sql

CREATE TEMP TABLE indexed_event_discovery AS
SELECT
    e.id AS event_id,
    e.name,
    e.event_date,
    u.display_name AS organizer_name,
    e.capacity,
    e.registered
FROM events AS e
JOIN users AS u ON u.id = e.organizer_id
WHERE e.state = 'WA'
  AND e.format = 'Tournament'
  AND e.event_date >= DATE '2026-11-16'
  AND e.event_date <= DATE '2027-03-31'
  AND e.registered < e.capacity
ORDER BY e.event_date ASC, e.id ASC
LIMIT 25;

CREATE TEMP TABLE indexed_organizer_dashboard AS
SELECT
    e.id AS event_id,
    e.name,
    e.event_date,
    e.capacity,
    e.registered,
    e.capacity - e.registered AS remaining_spots,
    COUNT(*) OVER () AS organizer_event_count,
    SUM(e.capacity) OVER () AS total_capacity,
    SUM(e.registered) OVER () AS total_registrations,
    SUM(e.capacity - e.registered) OVER () AS total_remaining_spots
FROM events AS e
WHERE e.organizer_id = md5('event-catalog-benchmark-user-0')::UUID
ORDER BY e.event_date ASC, e.id ASC;

CREATE TEMP TABLE indexed_registration_lookup AS
SELECT 'existing'::TEXT AS pair_kind, EXISTS (
    SELECT 1
    FROM event_registrations
    WHERE event_id = 2
      AND user_id = md5('event-catalog-benchmark-user-20')::UUID
) AS is_registered
UNION ALL
SELECT 'missing', EXISTS (
    SELECT 1
    FROM event_registrations
    WHERE event_id = 4
      AND user_id = md5('event-catalog-benchmark-user-0')::UUID
);

CREATE TEMP TABLE indexed_community_statistics AS
SELECT
    COUNT(*)::BIGINT AS total_events,
    COALESCE(SUM(capacity), 0)::BIGINT AS total_capacity,
    COALESCE(SUM(registered), 0)::BIGINT AS total_registrations,
    COALESCE(SUM(capacity - registered), 0)::BIGINT AS total_remaining_spots
FROM events;

SELECT pg_temp.assert_true(
    'indexed event discovery returns the same rows as baseline',
    NOT EXISTS (
        (SELECT * FROM baseline_event_discovery
         EXCEPT ALL
         SELECT * FROM indexed_event_discovery)
        UNION ALL
        (SELECT * FROM indexed_event_discovery
         EXCEPT ALL
         SELECT * FROM baseline_event_discovery)
    )
);

SELECT pg_temp.assert_true(
    'indexed organizer query preserves each event and all aggregate values',
    NOT EXISTS (
        (SELECT * FROM baseline_organizer_dashboard
         EXCEPT ALL
         SELECT * FROM indexed_organizer_dashboard)
        UNION ALL
        (SELECT * FROM indexed_organizer_dashboard
         EXCEPT ALL
         SELECT * FROM baseline_organizer_dashboard)
    )
);

SELECT pg_temp.assert_true(
    'indexed registration lookups preserve existing and missing results',
    NOT EXISTS (
        (SELECT * FROM baseline_registration_lookup
         EXCEPT ALL
         SELECT * FROM indexed_registration_lookup)
        UNION ALL
        (SELECT * FROM indexed_registration_lookup
         EXCEPT ALL
         SELECT * FROM baseline_registration_lookup)
    )
);

SELECT pg_temp.assert_true(
    'community statistics preserve all platform totals',
    NOT EXISTS (
        (SELECT * FROM baseline_community_statistics
         EXCEPT ALL
         SELECT * FROM indexed_community_statistics)
        UNION ALL
        (SELECT * FROM indexed_community_statistics
         EXCEPT ALL
         SELECT * FROM baseline_community_statistics)
    )
);

\echo 'Index storage, including total bytes occupied by retained performance indexes:'
SELECT index_name, pg_size_pretty(index_bytes) AS index_size, index_bytes
FROM (
    SELECT
        indexrelid::REGCLASS::TEXT AS index_name,
        pg_relation_size(indexrelid) AS index_bytes
    FROM pg_index
    WHERE indexrelid IN (
        'events_discovery_state_format_date_id_idx'::REGCLASS,
        'events_organizer_date_id_idx'::REGCLASS
    )
    UNION ALL
    SELECT 'TOTAL retained performance indexes', SUM(pg_relation_size(indexrelid))
    FROM pg_index
    WHERE indexrelid IN (
        'events_discovery_state_format_date_id_idx'::REGCLASS,
        'events_organizer_date_id_idx'::REGCLASS
    )
) AS index_sizes
ORDER BY index_name;

\ir ../benchmarks/compare.sql

\echo 'Index performance correctness and measurement suite passed.'
