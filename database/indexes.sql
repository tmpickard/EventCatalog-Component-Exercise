-- Retained read-performance indexes. See benchmarks/README.md for the
-- workload rationale and the procedure for comparing plans and write cost.
CREATE INDEX IF NOT EXISTS events_discovery_state_format_date_id_idx
    ON events (state, format, event_date, id);

CREATE INDEX IF NOT EXISTS events_organizer_date_id_idx
    ON events (organizer_id, event_date, id);
