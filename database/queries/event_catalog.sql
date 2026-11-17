PREPARE event_catalog AS
SELECT
    e.id AS event_id,
    e.name AS event_name,
    e.city,
    e.state,
    e.event_date,
    e.format,
    e.capacity,
    e.registered,
    e.capacity - e.registered AS available_spots,
    u.id AS organizer_id,
    u.display_name AS organizer_name
FROM events AS e
JOIN users AS u
    ON u.id = e.organizer_id
ORDER BY e.event_date ASC, e.name ASC, e.id ASC;
