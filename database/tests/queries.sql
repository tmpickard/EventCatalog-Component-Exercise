\set ON_ERROR_STOP on

BEGIN;

DELETE FROM event_registrations;
DELETE FROM events;
DELETE FROM users;

\ir ../queries/event_catalog.sql
\ir ../queries/event_discovery.sql
\ir ../queries/organizer_dashboard.sql
\ir ../queries/community_statistics.sql
\ir fixtures/query_testing.sql

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

CREATE TEMP TABLE actual_catalog ON COMMIT DROP AS
EXECUTE event_catalog;

SELECT pg_temp.assert_true(
    '1 - catalog contains exactly six events',
    (SELECT COUNT(*) = 6 FROM actual_catalog)
);

SELECT pg_temp.assert_true(
    '2 - each event has its correct organizer',
    (SELECT COUNT(*) = 6
     FROM actual_catalog
     WHERE (event_name = 'Seattle Trainer League' AND organizer_name = 'Alice')
        OR (event_name = 'Bellevue Casual Meetup' AND organizer_name = 'Alice')
        OR (event_name = 'Portland Regional Tournament' AND organizer_name = 'Bob')
        OR (event_name = 'Tacoma Championship' AND organizer_name = 'Bob')
        OR (event_name = 'Everett Community Gathering' AND organizer_name = 'Charlie')
        OR (event_name = 'Olympia Trainer League' AND organizer_name = 'Charlie'))
);

SELECT pg_temp.assert_true(
    '3 - full event remains visible with zero availability',
    (SELECT COUNT(*) = 1
     FROM actual_catalog
     WHERE event_name = 'Tacoma Championship' AND available_spots = 0)
);

SELECT pg_temp.assert_true(
    '4 - event with no registrations has full availability',
    (SELECT COUNT(*) = 1
     FROM actual_catalog
     WHERE event_name = 'Everett Community Gathering'
       AND registered = 0
       AND available_spots = capacity)
);

SELECT pg_temp.assert_true(
    '5 - catalog is in chronological, name order',
    (SELECT array_agg(event_name ORDER BY ctid) =
        ARRAY[
            'Bellevue Casual Meetup',
            'Everett Community Gathering',
            'Seattle Trainer League',
            'Portland Regional Tournament',
            'Tacoma Championship',
            'Olympia Trainer League'
        ]::VARCHAR[]
     FROM actual_catalog)
);

INSERT INTO events (
    id, organizer_id, name, city, state, event_date, capacity, registered, format
) OVERRIDING SYSTEM VALUE
VALUES (
    107,
    '01111111-1111-4111-8111-111111111111',
    'Seattle Trainer League',
    'Seattle',
    'WA',
    '2026-11-14',
    8,
    2,
    'League'
);

CREATE TEMP TABLE actual_catalog_tie ON COMMIT DROP AS
EXECUTE event_catalog;

SELECT pg_temp.assert_true(
    '6 - events sharing a date and name use event ID as the final sort key',
    (SELECT array_agg(event_id ORDER BY ctid) = array_agg(event_id ORDER BY event_id)
     FROM actual_catalog_tie
     WHERE event_name = 'Seattle Trainer League')
);

DELETE FROM events
WHERE id = (
    SELECT MAX(event_id)
    FROM actual_catalog_tie
    WHERE event_name = 'Seattle Trainer League'
);

CREATE TEMP TABLE actual_wa_leagues ON COMMIT DROP AS
EXECUTE event_discovery('WA', 'League', '2026-11-14', '2026-12-05', FALSE);

SELECT pg_temp.assert_true(
    '7 - inclusive WA League date range returns exactly two events',
    (SELECT COUNT(*) = 2
         AND COUNT(*) FILTER (WHERE event_name = 'Seattle Trainer League') = 1
         AND COUNT(*) FILTER (WHERE event_name = 'Olympia Trainer League') = 1
     FROM actual_wa_leagues)
);

CREATE TEMP TABLE actual_available_tournaments ON COMMIT DROP AS
EXECUTE event_discovery(NULL, 'Tournament', NULL, NULL, TRUE);

SELECT pg_temp.assert_true(
    '8 - tournaments with capacity remaining returns Portland only',
    (SELECT COUNT(*) = 1
         AND MIN(event_name) = 'Portland Regional Tournament'
     FROM actual_available_tournaments)
);

CREATE TEMP TABLE actual_no_matches ON COMMIT DROP AS
EXECUTE event_discovery('WA', 'Tournament', '2026-11-14', '2026-11-20', FALSE);

SELECT pg_temp.assert_true(
    '9 - a nonexistent filter combination returns no rows',
    (SELECT COUNT(*) = 0 FROM actual_no_matches)
);

CREATE TEMP TABLE actual_organizers ON COMMIT DROP AS
EXECUTE organizer_dashboard;

SELECT pg_temp.assert_true(
    'organizer dashboard contains one row for each of the four fixture users',
    (SELECT COUNT(*) = 4 FROM actual_organizers)
);

SELECT pg_temp.assert_true(
    '10 - Alice dashboard totals are correct',
    (SELECT COUNT(*) = 1
         AND MIN(event_count) = 2
         AND MIN(total_capacity) = 56
         AND MIN(total_registered) = 28
         AND MIN(total_available_spots) = 28
     FROM actual_organizers
     WHERE organizer_name = 'Alice')
);

SELECT pg_temp.assert_true(
    '11 - Bob dashboard totals are correct',
    (SELECT COUNT(*) = 1
         AND MIN(event_count) = 2
         AND MIN(total_capacity) = 96
         AND MIN(total_registered) = 80
         AND MIN(total_available_spots) = 16
     FROM actual_organizers
     WHERE organizer_name = 'Bob')
);

SELECT pg_temp.assert_true(
    '12 - Dana appears with zero dashboard totals',
    (SELECT COUNT(*) = 1
         AND MIN(event_count) = 0
         AND MIN(total_capacity) = 0
         AND MIN(total_registered) = 0
         AND MIN(total_available_spots) = 0
     FROM actual_organizers
     WHERE organizer_name = 'Dana')
);

INSERT INTO users (id, email, display_name, password_hash)
VALUES (
    '05555555-5555-4555-8555-555555555555',
    'query-second-alice@example.test',
    'Alice',
    'query-test-only'
);

CREATE TEMP TABLE actual_duplicate_names ON COMMIT DROP AS
EXECUTE organizer_dashboard;

SELECT pg_temp.assert_true(
    '13 - organizers with the same display name remain separate',
    (SELECT COUNT(*) = 2 AND COUNT(DISTINCT organizer_id) = 2
     FROM actual_duplicate_names
     WHERE organizer_name = 'Alice')
);

CREATE TEMP TABLE actual_community ON COMMIT DROP AS
EXECUTE community_statistics;

SELECT pg_temp.assert_true(
    '14 - community statistics match all six expected totals',
    (SELECT COUNT(*) = 1
         AND MIN(total_events) = 6
         AND MIN(total_capacity) = 208
         AND MIN(total_registered) = 118
         AND MIN(total_available_spots) = 90
         AND MIN(events_with_remaining_capacity) = 5
         AND MIN(fully_booked_events) = 1
     FROM actual_community)
);

CREATE TEMP TABLE actual_formats ON COMMIT DROP AS
EXECUTE community_format_statistics;

SELECT pg_temp.assert_true(
    'format statistics match League, Casual, and Tournament totals',
    (SELECT COUNT(*) = 3
         AND COUNT(*) FILTER (
             WHERE format = 'League'
               AND event_count = 2
               AND total_capacity = 72
               AND total_registered = 30
               AND total_available_spots = 42
         ) = 1
         AND COUNT(*) FILTER (
             WHERE format = 'Casual'
               AND event_count = 2
               AND total_capacity = 40
               AND total_registered = 8
               AND total_available_spots = 32
         ) = 1
         AND COUNT(*) FILTER (
             WHERE format = 'Tournament'
               AND event_count = 2
               AND total_capacity = 96
               AND total_registered = 80
               AND total_available_spots = 16
         ) = 1
     FROM actual_formats)
);

CREATE TEMP TABLE actual_formats_above_threshold ON COMMIT DROP AS
EXECUTE community_format_statistics_above(20);

SELECT pg_temp.assert_true(
    'HAVING returns only formats with more than 20 available spots',
    (SELECT COUNT(*) = 2
         AND COUNT(*) FILTER (WHERE format = 'League') = 1
         AND COUNT(*) FILTER (WHERE format = 'Casual') = 1
     FROM actual_formats_above_threshold)
);

DELETE FROM events;

CREATE TEMP TABLE actual_empty_community ON COMMIT DROP AS
EXECUTE community_statistics;

SELECT pg_temp.assert_true(
    '15 - empty events table still produces one all-zero community row',
    (SELECT COUNT(*) = 1
         AND MIN(total_events) = 0
         AND MIN(total_capacity) = 0
         AND MIN(total_registered) = 0
         AND MIN(total_available_spots) = 0
         AND MIN(events_with_remaining_capacity) = 0
         AND MIN(fully_booked_events) = 0
     FROM actual_empty_community)
);

DEALLOCATE event_catalog;
DEALLOCATE event_discovery;
DEALLOCATE organizer_dashboard;
DEALLOCATE community_statistics;
DEALLOCATE community_format_statistics;
DEALLOCATE community_format_statistics_above;

ROLLBACK;
\echo 'Query checks passed; all fixture and test data was rolled back.'
