INSERT INTO users (id, email, display_name, password_hash)
VALUES
    ('01111111-1111-4111-8111-111111111111', 'query-alice@example.test', 'Alice', 'query-test-only'),
    ('02222222-2222-4222-8222-222222222222', 'query-bob@example.test', 'Bob', 'query-test-only'),
    ('03333333-3333-4333-8333-333333333333', 'query-charlie@example.test', 'Charlie', 'query-test-only'),
    ('04444444-4444-4444-8444-444444444444', 'query-dana@example.test', 'Dana', 'query-test-only');

INSERT INTO events (
    id, organizer_id, name, city, state, event_date, capacity, registered, format
) OVERRIDING SYSTEM VALUE
VALUES
    (101, '01111111-1111-4111-8111-111111111111', 'Seattle Trainer League', 'Seattle', 'WA', '2026-11-14', 32, 20, 'League'),
    (102, '01111111-1111-4111-8111-111111111111', 'Bellevue Casual Meetup', 'Bellevue', 'WA', '2026-11-07', 24, 8, 'Casual'),
    (103, '02222222-2222-4222-8222-222222222222', 'Portland Regional Tournament', 'Portland', 'OR', '2026-11-21', 64, 48, 'Tournament'),
    (104, '02222222-2222-4222-8222-222222222222', 'Tacoma Championship', 'Tacoma', 'WA', '2026-11-28', 32, 32, 'Tournament'),
    (105, '03333333-3333-4333-8333-333333333333', 'Everett Community Gathering', 'Everett', 'WA', '2026-11-14', 16, 0, 'Casual'),
    (106, '03333333-3333-4333-8333-333333333333', 'Olympia Trainer League', 'Olympia', 'WA', '2026-12-05', 40, 10, 'League');
