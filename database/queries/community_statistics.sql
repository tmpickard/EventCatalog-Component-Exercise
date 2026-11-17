PREPARE community_statistics AS
SELECT
    COUNT(*)::BIGINT AS total_events,
    COALESCE(SUM(e.capacity), 0)::BIGINT AS total_capacity,
    COALESCE(SUM(e.registered), 0)::BIGINT AS total_registered,
    COALESCE(SUM(e.capacity - e.registered), 0)::BIGINT AS total_available_spots,
    COUNT(*) FILTER (WHERE e.registered < e.capacity)::BIGINT AS events_with_remaining_capacity,
    COUNT(*) FILTER (WHERE e.registered = e.capacity)::BIGINT AS fully_booked_events
FROM events AS e;

PREPARE community_format_statistics AS
SELECT
    e.format,
    COUNT(*)::BIGINT AS event_count,
    SUM(e.capacity)::BIGINT AS total_capacity,
    SUM(e.registered)::BIGINT AS total_registered,
    SUM(e.capacity - e.registered)::BIGINT AS total_available_spots
FROM events AS e
GROUP BY e.format
ORDER BY e.format ASC;

PREPARE community_format_statistics_above (BIGINT) AS
SELECT
    e.format,
    COUNT(*)::BIGINT AS event_count,
    SUM(e.capacity)::BIGINT AS total_capacity,
    SUM(e.registered)::BIGINT AS total_registered,
    SUM(e.capacity - e.registered)::BIGINT AS total_available_spots
FROM events AS e
GROUP BY e.format
HAVING SUM(e.capacity - e.registered) > $1
ORDER BY e.format ASC;
