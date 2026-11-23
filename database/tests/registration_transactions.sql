\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS dblink;

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

CREATE FUNCTION pg_temp.assert_equal(
    p_test_name TEXT,
    p_actual TEXT,
    p_expected TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_actual IS DISTINCT FROM p_expected THEN
        RAISE EXCEPTION 'FAIL: %; expected %, got %',
            p_test_name, p_expected, p_actual;
    END IF;
    RAISE NOTICE 'PASS: %', p_test_name;
END;
$$;

CREATE FUNCTION pg_temp.is_retryable_transaction_sqlstate(p_sqlstate TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT p_sqlstate IN ('40001', '40P01')
$$;

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

CREATE TEMP TABLE registration_test_events (
    test_name TEXT PRIMARY KEY,
    event_id BIGINT NOT NULL UNIQUE
);

SELECT pg_temp.assert_true(
    'retry classifier recognizes serialization failures',
    pg_temp.is_retryable_transaction_sqlstate('40001')
);
SELECT pg_temp.assert_true(
    'retry classifier recognizes deadlocks',
    pg_temp.is_retryable_transaction_sqlstate('40P01')
);
SELECT pg_temp.assert_true(
    'retry classifier does not retry unique-constraint business failures',
    NOT pg_temp.is_retryable_transaction_sqlstate('23505')
);

INSERT INTO users (id, email, display_name, password_hash)
VALUES
    ('10000000-0000-4000-8000-000000000001', 'registration-organizer@example.test', 'Registration Organizer', 'test-only'),
    ('10000000-0000-4000-8000-000000000002', 'registration-alpha@example.test', 'Registration Alpha', 'test-only'),
    ('10000000-0000-4000-8000-000000000003', 'registration-beta@example.test', 'Registration Beta', 'test-only'),
    ('10000000-0000-4000-8000-000000000004', 'registration-gamma@example.test', 'Registration Gamma', 'test-only'),
    ('10000000-0000-4000-8000-000000000005', 'registration-delta@example.test', 'Registration Delta', 'test-only');

INSERT INTO users (id, email, display_name, password_hash)
SELECT
    ('20000000-0000-4000-8000-' || lpad(to_hex(n), 12, '0'))::UUID,
    format('registration-occupant-%s@example.test', n),
    format('Registration Occupant %s', n),
    'test-only'
FROM generate_series(1, 31) AS occupants(n);

WITH inserted AS (
    INSERT INTO events (
        organizer_id, name, city, state, event_date, capacity, format
    )
    SELECT
        '10000000-0000-4000-8000-000000000001'::UUID,
        event_name,
        'Seattle',
        'WA',
        '2027-06-01'::DATE,
        event_capacity,
        'League'
    FROM (
        VALUES
            ('registration-main', 40),
            ('registration-full', 31),
            ('race-competing-users', 1),
            ('race-same-user', 2)
    ) AS fixtures(event_name, event_capacity)
    UNION ALL
    SELECT
        '10000000-0000-4000-8000-000000000001'::UUID,
        'race-repeat-' || lpad(run_number::TEXT, 2, '0'),
        'Seattle',
        'WA',
        '2027-06-01'::DATE,
        1,
        'League'
    FROM generate_series(1, 10) AS runs(run_number)
    RETURNING id, name
)
INSERT INTO registration_test_events (test_name, event_id)
SELECT name, id FROM inserted;

INSERT INTO event_registrations (event_id, user_id)
SELECT
    (SELECT event_id FROM registration_test_events WHERE test_name = 'registration-full'),
    ('20000000-0000-4000-8000-' || lpad(to_hex(n), 12, '0'))::UUID
FROM generate_series(1, 31) AS occupants(n);

SELECT pg_temp.assert_true(
    '0 - the 31-registration full-event fixture starts with a matching stored counter',
    (SELECT registered = 31
            AND registered = (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id)
     FROM events e
     WHERE e.id = (SELECT event_id FROM registration_test_events WHERE test_name = 'registration-full'))
);

BEGIN;
SELECT pg_temp.assert_equal(
    '1 - eligible trainer registers',
    register_for_event(
        (SELECT event_id FROM registration_test_events WHERE test_name = 'registration-main'),
        '10000000-0000-4000-8000-000000000002'
    ),
    'registered'
);
COMMIT;

SELECT pg_temp.assert_true(
    '2 - successful registration increments the counter and creates exactly one row',
    (SELECT registered = 1
            AND registered = (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id)
     FROM events e
     WHERE e.id = (SELECT event_id FROM registration_test_events WHERE test_name = 'registration-main'))
);

SELECT pg_temp.assert_equal(
    '3 - sequential duplicate is reported without a second write',
    register_for_event(
        (SELECT event_id FROM registration_test_events WHERE test_name = 'registration-main'),
        '10000000-0000-4000-8000-000000000002'
    ),
    'already_registered'
);
SELECT pg_temp.assert_true(
    '3a - sequential duplicate leaves registration and counter unchanged',
    (SELECT registered = 1
            AND (SELECT count(*) FROM event_registrations r
                 WHERE r.event_id = e.id
                   AND r.user_id = '10000000-0000-4000-8000-000000000002') = 1
     FROM events e
     WHERE e.id = (SELECT event_id FROM registration_test_events WHERE test_name = 'registration-main'))
);

SELECT pg_temp.assert_equal(
    '4 - nonexistent event is reported',
    register_for_event(9223372036854775807, '10000000-0000-4000-8000-000000000002'),
    'event_not_found'
);
SELECT pg_temp.assert_equal(
    '5 - nonexistent user is reported',
    register_for_event(
        (SELECT event_id FROM registration_test_events WHERE test_name = 'registration-main'),
        'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    ),
    'user_not_found'
);

SELECT pg_temp.assert_equal(
    '6 - full event is reported separately from a duplicate',
    register_for_event(
        (SELECT event_id FROM registration_test_events WHERE test_name = 'registration-full'),
        '10000000-0000-4000-8000-000000000003'
    ),
    'event_full'
);

CREATE FUNCTION pg_temp.assert_registration_race(
    p_event_id BIGINT,
    p_first_user UUID,
    p_second_user UUID,
    p_loser_outcome TEXT,
    p_test_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    first_outcome TEXT;
    second_outcome TEXT;
    first_sent INTEGER;
    second_sent INTEGER;
BEGIN
    first_sent := dblink_send_query(
        'registration_connection_a',
        format(
            'WITH delay AS MATERIALIZED (SELECT pg_sleep(0.1)) SELECT register_for_event(%s, %L::UUID) FROM delay',
            p_event_id, p_first_user
        )
    );
    second_sent := dblink_send_query(
        'registration_connection_b',
        format(
            'WITH delay AS MATERIALIZED (SELECT pg_sleep(0.1)) SELECT register_for_event(%s, %L::UUID) FROM delay',
            p_event_id, p_second_user
        )
    );

    IF first_sent <> 1 OR second_sent <> 1 THEN
        RAISE EXCEPTION 'FAIL: %; asynchronous requests did not both start', p_test_name;
    END IF;

    SELECT result.outcome
    INTO first_outcome
    FROM dblink_get_result('registration_connection_a') AS result(outcome TEXT);

    SELECT result.outcome
    INTO second_outcome
    FROM dblink_get_result('registration_connection_b') AS result(outcome TEXT);

    PERFORM result.outcome
    FROM dblink_get_result('registration_connection_a') AS result(outcome TEXT);
    PERFORM result.outcome
    FROM dblink_get_result('registration_connection_b') AS result(outcome TEXT);

    IF NOT (
        (first_outcome = 'registered' AND second_outcome = p_loser_outcome)
        OR (second_outcome = 'registered' AND first_outcome = p_loser_outcome)
    ) THEN
        RAISE EXCEPTION 'FAIL: %; expected one registered and one %, got % and %',
            p_test_name, p_loser_outcome, first_outcome, second_outcome;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM events e
        WHERE e.id = p_event_id
          AND e.registered = 1
          AND e.registered = (
              SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id
          )
    ) THEN
        RAISE EXCEPTION 'FAIL: %; event counter and rows are not exactly one', p_test_name;
    END IF;

    RAISE NOTICE 'PASS: %', p_test_name;
END;
$$;

SELECT dblink_connect(
    'registration_connection_a',
    format('dbname=%L user=%L', current_database(), current_user)
);
SELECT dblink_connect(
    'registration_connection_b',
    format('dbname=%L user=%L', current_database(), current_user)
);

SELECT pg_temp.assert_registration_race(
    (SELECT event_id FROM registration_test_events WHERE test_name = 'race-competing-users'),
    '10000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    'event_full',
    '7 - two users competing for one spot produce one registration and one full outcome'
);

SELECT pg_temp.assert_registration_race(
    (SELECT event_id FROM registration_test_events WHERE test_name = 'race-same-user'),
    '10000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000004',
    'already_registered',
    '8 - concurrent duplicate requests produce one registration and one duplicate outcome'
);

DO $$
DECLARE
    failure_message TEXT;
BEGIN
    BEGIN
        PERFORM register_for_event(
            (SELECT event_id FROM registration_test_events WHERE test_name = 'registration-main'),
            '10000000-0000-4000-8000-000000000003'
        );
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'registration rollback probe';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN
        GET STACKED DIAGNOSTICS failure_message = MESSAGE_TEXT;
        IF failure_message <> 'registration rollback probe' THEN
            RAISE;
        END IF;
    END;
END;
$$;

SELECT pg_temp.assert_true(
    '9 - a failure after insertion rolls back both the row and counter change',
    (SELECT registered = 1
            AND (SELECT count(*) FROM event_registrations r
                 WHERE r.event_id = e.id
                   AND r.user_id = '10000000-0000-4000-8000-000000000003') = 0
     FROM events e
     WHERE e.id = (SELECT event_id FROM registration_test_events WHERE test_name = 'registration-main'))
);

SELECT pg_temp.assert_true(
    '10 - stored counters equal registration rows for every test event',
    NOT EXISTS (
        SELECT 1
        FROM events e
        JOIN registration_test_events te ON te.event_id = e.id
        WHERE e.registered <> (
            SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id
        )
    )
);

SELECT pg_temp.assert_rejected(
    '11 - direct SQL cannot create a registration with a nonexistent user',
    format(
        'INSERT INTO event_registrations (event_id, user_id) VALUES (%L, %L)',
        (SELECT event_id FROM registration_test_events WHERE test_name = 'registration-main'),
        'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    ),
    '23503',
    'event_registrations_user_id_fkey'
);

SELECT pg_temp.assert_rejected(
    '11a - direct SQL rejects a missing required event ID',
    $sql$INSERT INTO event_registrations (user_id)
         VALUES ('10000000-0000-4000-8000-000000000005')$sql$,
    '23502',
    NULL,
    'event_id'
);

SELECT pg_temp.assert_rejected(
    '11b - direct SQL rejects a missing required user ID',
    format(
        'INSERT INTO event_registrations (event_id) VALUES (%L)',
        (SELECT event_id FROM registration_test_events WHERE test_name = 'registration-main')
    ),
    '23502',
    NULL,
    'user_id'
);

DO $$
DECLARE
    repeated_event RECORD;
BEGIN
    FOR repeated_event IN
        SELECT event_id
        FROM registration_test_events
        WHERE test_name LIKE 'race-repeat-%'
        ORDER BY test_name
    LOOP
        PERFORM pg_temp.assert_registration_race(
            repeated_event.event_id,
            '10000000-0000-4000-8000-000000000002',
            '10000000-0000-4000-8000-000000000003',
            'event_full',
            format('12 - repeated independent-connection race for event %s', repeated_event.event_id)
        );
    END LOOP;
END;
$$;

SELECT dblink_disconnect('registration_connection_a');
SELECT dblink_disconnect('registration_connection_b');

DELETE FROM event_registrations
WHERE event_id IN (SELECT event_id FROM registration_test_events);
DELETE FROM events
WHERE id IN (SELECT event_id FROM registration_test_events);
DELETE FROM users
WHERE id BETWEEN '20000000-0000-4000-8000-000000000001'::UUID
              AND '20000000-0000-4000-8000-00000000001f'::UUID
   OR id BETWEEN '10000000-0000-4000-8000-000000000001'::UUID
              AND '10000000-0000-4000-8000-000000000005'::UUID;

\echo 'Registration transaction and concurrency checks passed; fixture data was removed.'
