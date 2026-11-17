PREPARE organizer_dashboard AS
SELECT
    u.id AS organizer_id,
    u.display_name AS organizer_name,
    COUNT(e.id)::BIGINT AS event_count,
    COALESCE(SUM(e.capacity), 0)::BIGINT AS total_capacity,
    COALESCE(SUM(e.registered), 0)::BIGINT AS total_registered,
    COALESCE(SUM(e.capacity - e.registered), 0)::BIGINT AS total_available_spots
FROM users AS u
LEFT JOIN events AS e
    ON e.organizer_id = u.id
GROUP BY u.id, u.display_name
ORDER BY u.display_name ASC, u.id ASC;
