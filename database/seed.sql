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

INSERT INTO events (organizer_id, name, city, state, event_date, capacity, registered, format)
SELECT '11111111-1111-4111-8111-111111111111', 'Seattle Trainer League', 'Seattle', 'WA', '2027-02-13', 32, 18, 'League'
WHERE NOT EXISTS (
    SELECT 1 FROM events
    WHERE organizer_id = '11111111-1111-4111-8111-111111111111'
      AND name = 'Seattle Trainer League'
);

INSERT INTO events (organizer_id, name, city, state, event_date, capacity, registered, format)
SELECT '11111111-1111-4111-8111-111111111111', 'Bellevue Casual Meetup', 'Bellevue', 'WA', '2027-02-20', 24, 9, 'Casual'
WHERE NOT EXISTS (
    SELECT 1 FROM events
    WHERE organizer_id = '11111111-1111-4111-8111-111111111111'
      AND name = 'Bellevue Casual Meetup'
);

INSERT INTO events (organizer_id, name, city, state, event_date, capacity, registered, format)
SELECT '22222222-2222-4222-8222-222222222222', 'Portland Regional Tournament', 'Portland', 'OR', '2027-03-06', 64, 51, 'Tournament'
WHERE NOT EXISTS (
    SELECT 1 FROM events
    WHERE organizer_id = '22222222-2222-4222-8222-222222222222'
      AND name = 'Portland Regional Tournament'
);

INSERT INTO events (organizer_id, name, city, state, event_date, capacity, registered, format)
SELECT '22222222-2222-4222-8222-222222222222', 'Tacoma Championship', 'Tacoma', 'WA', '2027-03-20', 48, 37, 'Tournament'
WHERE NOT EXISTS (
    SELECT 1 FROM events
    WHERE organizer_id = '22222222-2222-4222-8222-222222222222'
      AND name = 'Tacoma Championship'
);

INSERT INTO events (organizer_id, name, city, state, event_date, capacity, registered, format)
SELECT '33333333-3333-4333-8333-333333333333', 'Everett Community Gathering', 'Everett', 'WA', '2027-04-03', 30, 12, 'Casual'
WHERE NOT EXISTS (
    SELECT 1 FROM events
    WHERE organizer_id = '33333333-3333-4333-8333-333333333333'
      AND name = 'Everett Community Gathering'
);

INSERT INTO events (organizer_id, name, city, state, event_date, capacity, registered, format)
SELECT '33333333-3333-4333-8333-333333333333', 'Olympia Trainer League', 'Olympia', 'WA', '2027-04-17', 36, 22, 'League'
WHERE NOT EXISTS (
    SELECT 1 FROM events
    WHERE organizer_id = '33333333-3333-4333-8333-333333333333'
      AND name = 'Olympia Trainer League'
);

COMMIT;
