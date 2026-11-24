\set ON_ERROR_STOP on
\timing on

DO $$
BEGIN
    IF to_regclass('public.events_discovery_state_format_date_id_idx') IS NULL
       OR to_regclass('public.events_organizer_date_id_idx') IS NULL THEN
        RAISE EXCEPTION 'Indexed comparison requires both indexes from database/indexes.sql';
    END IF;
END;
$$;

ANALYZE users;
ANALYZE events;
ANALYZE event_registrations;

CREATE TEMP TABLE benchmark_plans (
    workload TEXT NOT NULL,
    run_number INTEGER NOT NULL,
    execution_plan JSONB NOT NULL
);

CREATE FUNCTION pg_temp.capture_plan(
    p_workload TEXT,
    p_query TEXT,
    p_run_number INTEGER,
    p_rollback_after BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    measured_plan JSONB;
BEGIN
    BEGIN
        EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' || p_query
        INTO measured_plan;

        IF p_rollback_after THEN
            RAISE EXCEPTION USING
                ERRCODE = 'Z0001',
                MESSAGE = 'Roll back controlled event insert benchmark';
        END IF;
    EXCEPTION
        WHEN SQLSTATE 'Z0001' THEN
            NULL;
    END;

    INSERT INTO pg_temp.benchmark_plans (workload, run_number, execution_plan)
    VALUES (p_workload, p_run_number, measured_plan);
END;
$$;

-- Match baseline warm-up and measurement order exactly.
DO $$
DECLARE
    run_number INTEGER;
BEGIN
    PERFORM pg_temp.capture_plan(
        'event_discovery',
        $query$SELECT e.id AS event_id, e.name, e.event_date, u.display_name AS organizer_name,
                      e.capacity, e.registered
               FROM events AS e
               JOIN users AS u ON u.id = e.organizer_id
               WHERE e.state = 'WA'
                 AND e.format = 'Tournament'
                 AND e.event_date >= DATE '2026-11-16'
                 AND e.event_date <= DATE '2027-03-31'
                 AND e.registered < e.capacity
               ORDER BY e.event_date ASC, e.id ASC
               LIMIT 25$query$,
        0
    );
    PERFORM pg_temp.capture_plan(
        'organizer_dashboard',
        $query$SELECT e.id AS event_id, e.name, e.event_date, e.capacity, e.registered,
                      e.capacity - e.registered AS remaining_spots,
                      COUNT(*) OVER () AS organizer_event_count,
                      SUM(e.capacity) OVER () AS total_capacity,
                      SUM(e.registered) OVER () AS total_registrations,
                      SUM(e.capacity - e.registered) OVER () AS total_remaining_spots
               FROM events AS e
               WHERE e.organizer_id = md5('event-catalog-benchmark-user-0')::UUID
               ORDER BY e.event_date ASC, e.id ASC$query$,
        0
    );
    PERFORM pg_temp.capture_plan(
        'registration_lookup_existing',
        $query$SELECT EXISTS (
                   SELECT 1 FROM event_registrations
                   WHERE event_id = 2
                     AND user_id = md5('event-catalog-benchmark-user-20')::UUID
               ) AS is_registered$query$,
        0
    );
    PERFORM pg_temp.capture_plan(
        'registration_lookup_missing',
        $query$SELECT EXISTS (
                   SELECT 1 FROM event_registrations
                   WHERE event_id = 4
                     AND user_id = md5('event-catalog-benchmark-user-0')::UUID
               ) AS is_registered$query$,
        0
    );
    PERFORM pg_temp.capture_plan(
        'community_statistics',
        $query$SELECT COUNT(*)::BIGINT AS total_events,
                      COALESCE(SUM(capacity), 0)::BIGINT AS total_capacity,
                      COALESCE(SUM(registered), 0)::BIGINT AS total_registrations,
                      COALESCE(SUM(capacity - registered), 0)::BIGINT AS total_remaining_spots
               FROM events$query$,
        0
    );
    PERFORM pg_temp.capture_plan(
        'event_insert_1000',
        $query$INSERT INTO events (
                   organizer_id, name, city, state, event_date, capacity, registered, format
               )
               SELECT
                   md5('event-catalog-benchmark-user-0')::UUID,
                   'Index benchmark insert ' || batch_number,
                   'Seattle',
                   'WA',
                   DATE '2027-01-01' + (batch_number % 365),
                   80,
                   0,
                   CASE WHEN batch_number % 2 = 0 THEN 'League' ELSE 'Tournament' END
               FROM generate_series(1, 1000) AS insert_batch(batch_number)$query$,
        0,
        TRUE
    );

    FOR run_number IN 1..5 LOOP
        PERFORM pg_temp.capture_plan(
            'event_discovery',
            $query$SELECT e.id AS event_id, e.name, e.event_date, u.display_name AS organizer_name,
                          e.capacity, e.registered
                   FROM events AS e
                   JOIN users AS u ON u.id = e.organizer_id
                   WHERE e.state = 'WA'
                     AND e.format = 'Tournament'
                     AND e.event_date >= DATE '2026-11-16'
                     AND e.event_date <= DATE '2027-03-31'
                     AND e.registered < e.capacity
                   ORDER BY e.event_date ASC, e.id ASC
                   LIMIT 25$query$,
            run_number
        );
        PERFORM pg_temp.capture_plan(
            'organizer_dashboard',
            $query$SELECT e.id AS event_id, e.name, e.event_date, e.capacity, e.registered,
                          e.capacity - e.registered AS remaining_spots,
                          COUNT(*) OVER () AS organizer_event_count,
                          SUM(e.capacity) OVER () AS total_capacity,
                          SUM(e.registered) OVER () AS total_registrations,
                          SUM(e.capacity - e.registered) OVER () AS total_remaining_spots
                   FROM events AS e
                   WHERE e.organizer_id = md5('event-catalog-benchmark-user-0')::UUID
                   ORDER BY e.event_date ASC, e.id ASC$query$,
            run_number
        );
        PERFORM pg_temp.capture_plan(
            'registration_lookup_existing',
            $query$SELECT EXISTS (
                       SELECT 1 FROM event_registrations
                       WHERE event_id = 2
                         AND user_id = md5('event-catalog-benchmark-user-20')::UUID
                   ) AS is_registered$query$,
            run_number
        );
        PERFORM pg_temp.capture_plan(
            'registration_lookup_missing',
            $query$SELECT EXISTS (
                       SELECT 1 FROM event_registrations
                       WHERE event_id = 4
                         AND user_id = md5('event-catalog-benchmark-user-0')::UUID
                   ) AS is_registered$query$,
            run_number
        );
        PERFORM pg_temp.capture_plan(
            'community_statistics',
            $query$SELECT COUNT(*)::BIGINT AS total_events,
                          COALESCE(SUM(capacity), 0)::BIGINT AS total_capacity,
                          COALESCE(SUM(registered), 0)::BIGINT AS total_registrations,
                          COALESCE(SUM(capacity - registered), 0)::BIGINT AS total_remaining_spots
                   FROM events$query$,
            run_number
        );
        PERFORM pg_temp.capture_plan(
            'event_insert_1000',
            $query$INSERT INTO events (
                       organizer_id, name, city, state, event_date, capacity, registered, format
                   )
                   SELECT
                       md5('event-catalog-benchmark-user-0')::UUID,
                       'Index benchmark insert ' || batch_number,
                       'Seattle',
                       'WA',
                       DATE '2027-01-01' + (batch_number % 365),
                       80,
                       0,
                       CASE WHEN batch_number % 2 = 0 THEN 'League' ELSE 'Tournament' END
                   FROM generate_series(1, 1000) AS insert_batch(batch_number)$query$,
            run_number,
            TRUE
        );
    END LOOP;
END;
$$;

\echo 'Indexed run medians and root-plan metrics (full JSON plans follow):'
SELECT
    workload,
    percentile_cont(0.5) WITHIN GROUP (
        ORDER BY ((execution_plan -> 0 ->> 'Execution Time')::DOUBLE PRECISION)
    ) AS median_execution_ms,
    percentile_cont(0.5) WITHIN GROUP (
        ORDER BY ((execution_plan -> 0 ->> 'Planning Time')::DOUBLE PRECISION)
    ) AS median_planning_ms,
    MIN(execution_plan -> 0 -> 'Plan' ->> 'Node Type') AS root_node,
    percentile_cont(0.5) WITHIN GROUP (
        ORDER BY ((execution_plan -> 0 -> 'Plan' ->> 'Plan Rows')::DOUBLE PRECISION)
    ) AS estimated_root_rows,
    percentile_cont(0.5) WITHIN GROUP (
        ORDER BY ((execution_plan -> 0 -> 'Plan' ->> 'Actual Rows')::DOUBLE PRECISION)
    ) AS actual_root_rows,
    percentile_cont(0.5) WITHIN GROUP (
        ORDER BY ((execution_plan -> 0 -> 'Plan' ->> 'Shared Hit Blocks')::DOUBLE PRECISION)
    ) AS root_shared_hit_blocks,
    percentile_cont(0.5) WITHIN GROUP (
        ORDER BY ((execution_plan -> 0 -> 'Plan' ->> 'Shared Read Blocks')::DOUBLE PRECISION)
    ) AS root_shared_read_blocks
FROM pg_temp.benchmark_plans
WHERE run_number BETWEEN 1 AND 5
GROUP BY workload
ORDER BY workload;

\echo 'Five captured indexed plans per workload:'
SELECT workload, run_number, jsonb_pretty(execution_plan) AS execution_plan
FROM pg_temp.benchmark_plans
WHERE run_number BETWEEN 1 AND 5
ORDER BY workload, run_number;
