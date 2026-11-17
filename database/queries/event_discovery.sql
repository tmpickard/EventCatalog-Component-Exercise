PREPARE event_discovery (CHAR(2), VARCHAR(20), DATE, DATE, BOOLEAN) AS
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
WHERE ($1 IS NULL OR e.state = $1)
  AND ($2 IS NULL OR e.format = $2)
  AND ($3 IS NULL OR e.event_date >= $3)
  AND ($4 IS NULL OR e.event_date <= $4)
  AND ($5 IS NULL OR NOT $5 OR e.registered < e.capacity)
ORDER BY e.event_date ASC, e.name ASC, e.id ASC;
