\set ON_ERROR_STOP on

BEGIN;

CREATE FUNCTION pg_temp.assert_rejected(
    p_test_name TEXT,
    p_statement TEXT,
    p_expected_state TEXT,
    p_expected_constraint TEXT DEFAULT NULL,
    p_expected_column TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    actual_state TEXT;
    actual_constraint TEXT;
    actual_column TEXT;
BEGIN
    BEGIN
        EXECUTE p_statement;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS
            actual_state = RETURNED_SQLSTATE,
            actual_constraint = CONSTRAINT_NAME,
            actual_column = COLUMN_NAME;

        IF actual_state IS DISTINCT FROM p_expected_state
           OR (p_expected_constraint IS NOT NULL AND actual_constraint IS DISTINCT FROM p_expected_constraint)
           OR (p_expected_column IS NOT NULL AND actual_column IS DISTINCT FROM p_expected_column) THEN
            RAISE EXCEPTION 'FAIL: %; expected SQLSTATE %, constraint %, column %, got SQLSTATE %, constraint %, column %',
                p_test_name, p_expected_state, p_expected_constraint, p_expected_column,
                actual_state, actual_constraint, actual_column;
        END IF;

        RAISE NOTICE 'PASS: % rejected for the expected reason', p_test_name;
        RETURN;
    END;

    RAISE EXCEPTION 'FAIL: % unexpectedly succeeded', p_test_name;
END;
$$;

INSERT INTO users (id, email, display_name, password_hash)
VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'integrity-user@example.test',
    'Integrity User',
    'test-only-not-a-real-password-hash'
);
DO $$ BEGIN
    RAISE NOTICE 'PASS: 1 - insert valid user';
END $$;

SELECT pg_temp.assert_rejected(
    '2 - duplicate email ignoring case',
    $sql$INSERT INTO users (id, email, display_name, password_hash)
         VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'INTEGRITY-USER@EXAMPLE.TEST', 'Duplicate', 'test-hash')$sql$,
    '23505',
    'users_email_normalized_uq'
);

SELECT pg_temp.assert_rejected(
    '3 - blank display name',
    $sql$INSERT INTO users (id, email, display_name, password_hash)
         VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'blank-name@example.test', '   ', 'test-hash')$sql$,
    '23514',
    'users_display_name_nonblank'
);

SELECT pg_temp.assert_rejected(
    '3a - missing password hash',
    $sql$INSERT INTO users (id, email, display_name, password_hash)
         VALUES ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'missing-hash@example.test', 'Missing Hash', NULL)$sql$,
    '23502',
    NULL,
    'password_hash'
);

DO $$
DECLARE
    generated_event_id BIGINT;
BEGIN
    INSERT INTO events (
        organizer_id, name, city, state, event_date, capacity, format
    )
    VALUES (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'Integrity Test Event',
        'Seattle',
        'WA',
        '2027-05-01',
        10,
        'League'
    )
    RETURNING id INTO generated_event_id;

    IF generated_event_id IS NULL THEN
        RAISE EXCEPTION 'FAIL: 4 - valid event did not receive an identifier';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM events
        WHERE id = generated_event_id
          AND registered = 0
          AND created_at IS NOT NULL
          AND updated_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'FAIL: 4 - valid event defaults were not applied';
    END IF;

    RAISE NOTICE 'PASS: 4 - insert valid event with generated ID and defaults';

    PERFORM pg_temp.assert_rejected(
        '6a - update capacity to zero',
        format('UPDATE events SET capacity = 0 WHERE id = %L', generated_event_id),
        '23514',
        'events_capacity_positive'
    );

    PERFORM pg_temp.assert_rejected(
        '7a - update registrations to a negative number',
        format('UPDATE events SET registered = -1 WHERE id = %L', generated_event_id),
        '23514',
        'events_registered_nonnegative'
    );

    PERFORM pg_temp.assert_rejected(
        '8a - update registrations beyond capacity',
        format('UPDATE events SET registered = 11 WHERE id = %L', generated_event_id),
        '23514',
        'events_registered_within_capacity'
    );
END $$;

SELECT pg_temp.assert_rejected(
    '5 - nonexistent organizer',
    $sql$INSERT INTO events (organizer_id, name, city, state, event_date, capacity, format)
         VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'Orphan Event', 'Seattle', 'WA', '2027-05-02', 10, 'League')$sql$,
    '23503',
    'events_organizer_id_fkey'
);

SELECT pg_temp.assert_rejected(
    '6 - zero capacity',
    $sql$INSERT INTO events (organizer_id, name, city, state, event_date, capacity, format)
         VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Zero Capacity', 'Seattle', 'WA', '2027-05-02', 0, 'League')$sql$,
    '23514',
    'events_capacity_positive'
);

SELECT pg_temp.assert_rejected(
    '7 - negative registrations',
    $sql$INSERT INTO events (organizer_id, name, city, state, event_date, capacity, registered, format)
         VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Negative Registrations', 'Seattle', 'WA', '2027-05-02', 10, -1, 'League')$sql$,
    '23514',
    'events_registered_nonnegative'
);

SELECT pg_temp.assert_rejected(
    '8 - registrations exceed capacity',
    $sql$INSERT INTO events (organizer_id, name, city, state, event_date, capacity, registered, format)
         VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Over Capacity', 'Seattle', 'WA', '2027-05-02', 10, 11, 'League')$sql$,
    '23514',
    'events_registered_within_capacity'
);

SELECT pg_temp.assert_rejected(
    '9 - unsupported format',
    $sql$INSERT INTO events (organizer_id, name, city, state, event_date, capacity, format)
         VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Unsupported Format', 'Seattle', 'WA', '2027-05-02', 10, 'Battle')$sql$,
    '23514',
    'events_format_supported'
);

SELECT pg_temp.assert_rejected(
    '10 - blank event name',
    $sql$INSERT INTO events (organizer_id, name, city, state, event_date, capacity, format)
         VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '   ', 'Seattle', 'WA', '2027-05-02', 10, 'League')$sql$,
    '23514',
    'events_name_nonblank'
);

SELECT pg_temp.assert_rejected(
    '10a - blank event location',
    $sql$INSERT INTO events (organizer_id, name, city, state, event_date, capacity, format)
         VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Blank City', '   ', 'WA', '2027-05-02', 10, 'League')$sql$,
    '23514',
    'events_city_nonblank'
);

DO $$
DECLARE
    organizer_id UUID := 'ffffffff-ffff-4fff-8fff-ffffffffffff';
BEGIN
    INSERT INTO users (id, email, display_name, password_hash)
    VALUES (organizer_id, 'event-owner@example.test', 'Event Owner', 'test-hash');

    INSERT INTO events (organizer_id, name, city, state, event_date, capacity, format)
    VALUES (organizer_id, 'Owned Integrity Event', 'Seattle', 'WA', '2027-05-03', 10, 'Casual');
END $$;

SELECT pg_temp.assert_rejected(
    '11 - delete organizer with events',
    $sql$DELETE FROM users WHERE id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'$sql$,
    '23001',
    'events_organizer_id_fkey'
);

INSERT INTO users (id, email, display_name, password_hash)
VALUES (
    '99999999-9999-4999-8999-999999999999',
    'eventless@example.test',
    'Eventless User',
    'test-hash'
);
DELETE FROM users WHERE id = '99999999-9999-4999-8999-999999999999';
DO $$ BEGIN
    RAISE NOTICE 'PASS: 12 - delete organizer with no events';
END $$;

DO $$
DECLARE
    registration_event_id BIGINT;
BEGIN
    INSERT INTO events (organizer_id, name, city, state, event_date, capacity, format)
    VALUES (
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'Registration Integrity Event',
        'Seattle',
        'WA',
        '2027-05-04',
        10,
        'Casual'
    )
    RETURNING id INTO registration_event_id;

    INSERT INTO event_registrations (event_id, user_id)
    VALUES (registration_event_id, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    RAISE NOTICE 'PASS: 13 - insert valid registration';

    PERFORM pg_temp.assert_rejected(
        '14 - duplicate registration',
        format(
            'INSERT INTO event_registrations (event_id, user_id) VALUES (%L, %L)',
            registration_event_id,
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
        ),
        '23505',
        'event_registrations_pkey'
    );

    PERFORM pg_temp.assert_rejected(
        '15 - registration for nonexistent user',
        format(
            'INSERT INTO event_registrations (event_id, user_id) VALUES (%L, %L)',
            registration_event_id,
            'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
        ),
        '23503',
        'event_registrations_user_id_fkey'
    );

    PERFORM pg_temp.assert_rejected(
        '16 - registration for nonexistent event',
        format(
            'INSERT INTO event_registrations (event_id, user_id) VALUES (%L, %L)',
            9223372036854775807,
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
        ),
        '23503',
        'event_registrations_event_id_fkey'
    );
END $$;

ROLLBACK;
\echo 'Integrity checks passed; all test data was rolled back.'
