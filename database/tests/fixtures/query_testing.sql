INSERT INTO users (id, email, display_name, password_hash)
VALUES
    ('01111111-1111-4111-8111-111111111111', 'query-alice@example.test', 'Alice', 'query-test-only'),
    ('02222222-2222-4222-8222-222222222222', 'query-bob@example.test', 'Bob', 'query-test-only'),
    ('03333333-3333-4333-8333-333333333333', 'query-charlie@example.test', 'Charlie', 'query-test-only'),
    ('04444444-4444-4444-8444-444444444444', 'query-dana@example.test', 'Dana', 'query-test-only');

INSERT INTO users (id, email, display_name, password_hash)
SELECT
    ('05555555-5555-4555-8555-' || lpad(to_hex(n), 12, '0'))::UUID,
    format('query-participant-%s@example.test', n),
    format('Query Participant %s', n),
    'query-test-only'
FROM generate_series(1, 48) AS participants(n);

INSERT INTO events (
    id, organizer_id, name, city, state, event_date, capacity, registered, format
) OVERRIDING SYSTEM VALUE
VALUES
    (101, '01111111-1111-4111-8111-111111111111', 'Seattle Trainer League', 'Seattle', 'WA', '2026-11-14', 32, 0, 'League'),
    (102, '01111111-1111-4111-8111-111111111111', 'Bellevue Casual Meetup', 'Bellevue', 'WA', '2026-11-07', 24, 0, 'Casual'),
    (103, '02222222-2222-4222-8222-222222222222', 'Portland Regional Tournament', 'Portland', 'OR', '2026-11-21', 64, 0, 'Tournament'),
    (104, '02222222-2222-4222-8222-222222222222', 'Tacoma Championship', 'Tacoma', 'WA', '2026-11-28', 32, 0, 'Tournament'),
    (105, '03333333-3333-4333-8333-333333333333', 'Everett Community Gathering', 'Everett', 'WA', '2026-11-14', 16, 0, 'Casual'),
    (106, '03333333-3333-4333-8333-333333333333', 'Olympia Trainer League', 'Olympia', 'WA', '2026-12-05', 40, 0, 'League');

INSERT INTO event_registrations (event_id, user_id)
SELECT
    fixtures.event_id,
    ('05555555-5555-4555-8555-' || lpad(to_hex(participant.n), 12, '0'))::UUID
FROM (
    VALUES (101, 20), (102, 8), (103, 48), (104, 32), (105, 0), (106, 10)
) AS fixtures(event_id, registration_count)
CROSS JOIN LATERAL generate_series(1, fixtures.registration_count) AS participant(n);
