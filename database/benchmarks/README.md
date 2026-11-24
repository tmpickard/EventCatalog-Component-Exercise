# PostgreSQL index benchmark

This is a local, development-only benchmark for PostgreSQL 17+. It rebuilds
the three application tables in a **disposable database**; do not run the data
generator or test suite against development data that must be preserved, and
never run them against production.

## Reproduce the fixture and capture plans

Apply `database/schema.sql` first. The scripts assume the default `public`
schema and that the caller owns the tables. From the repository root, run the
following in the same PostgreSQL database and with the same connection
settings:

```powershell
psql -X -v ON_ERROR_STOP=1 -d trainer_events_bench -f database/benchmarks/generate_data.sql
psql -X -v ON_ERROR_STOP=1 -d trainer_events_bench -f database/benchmarks/baseline.sql -o database/benchmarks/baseline-results.txt
psql -X -v ON_ERROR_STOP=1 -d trainer_events_bench -f database/indexes.sql
psql -X -v ON_ERROR_STOP=1 -d trainer_events_bench -f database/benchmarks/compare.sql -o database/benchmarks/indexed-results.txt
```

The baseline script refuses to run if either candidate index already exists.
Keep the two captured output files together: each contains five
`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` plans per workload, median planning
and execution times, root estimated/actual rows, and root buffer counts.
The complete JSON plans include all scan nodes and their row/buffer details.
The `event_insert_1000` plans measure a 1,000-row `INSERT ... SELECT`;
each batch is rolled back in a PL/pgSQL subtransaction, so no benchmark events
are left behind. The generated fixture itself remains in the disposable DB.

Run the end-to-end correctness suite with:

```powershell
psql -X -v ON_ERROR_STOP=1 -d trainer_events_bench -f database/tests/index_performance.sql -o database/benchmarks/test-results.txt
```

It rebuilds the fixture, drops/recreates only the two candidate performance
indexes, verifies results before and after indexing, prints their measured
storage, and includes the same five-run indexed benchmark. It intentionally
does not assert that a particular index or scan type is selected.

Both plan scripts use the same one-pass cache warm-up, then five measured runs
in the same workload order: event discovery, organizer retrieval, existing
registration lookup, missing registration lookup, community aggregation, and
the rolled-back 1,000-event insert. They use the median of those five
`Execution Time` values. Keep PostgreSQL version, instance, data, settings,
and connection conditions unchanged between baseline and indexed runs. The
median reduces one-off noise but these remain local measurements, not
production latency guarantees. `EXPLAIN ANALYZE` adds instrumentation
overhead; compare like with like.

## Fixture profile

`generate_data.sql` deterministically creates 2,000 users, 100,000 events,
and 250,000 registrations. One hundred organizers each own 1,000 events.
Dates span 2024–2030 with explicit boundary cases; formats and state values
are distributed across the generated events. Capacities vary from 20 to 100.
The generated event mix is approximately 10% full, 10% partially registered, and 80% empty
events; it includes deterministic WA Tournament events at both requested date
boundaries, a same-date tie for the ID sort key, and a full event inside that
range.

The generator disables only the application counter trigger while bulk
inserting registration rows. Foreign keys and the unique registration
constraint remain enabled. It then derives every stored counter from the
inserted rows, re-enables the trigger, checks row counts/capacities/counters,
and runs `ANALYZE`. This avoids using the registration workflow for 250,000
individual synthetic registrations without weakening the final fixture
constraints.

## Index decisions

| Retained index | Workload support | Tradeoff |
| --- | --- | --- |
| `events_discovery_state_format_date_id_idx` on `(state, format, event_date, id)` | Equality predicates on state and format lead the B-tree; the event-date range follows them. With both equality values fixed, the remaining keys can emit the requested `event_date, id` order and may avoid a sort. | The `registered < capacity` predicate is not covered by this key, and the query must fetch names/organizer details. The optimizer may prefer a sequential scan if enough qualifying rows or heap pages must be visited. |
| `events_organizer_date_id_idx` on `(organizer_id, event_date, id)` | Selects one organizer's events and provides the dashboard's deterministic event-date/ID order. | The dashboard reads all of that organizer's rows and calculates window aggregates, so it must visit heap data; compare total elapsed time and buffers rather than index usage alone. |

The discovery key order is intentional. `(state, format, event_date, id)`
places equality keys before the range key, allowing the range to narrow the
matching index interval while preserving the requested ordering. An
`(event_date, state, format, id)` key can produce date order, but once a
range is used on its leading key, later state/format values generally cannot
narrow the B-tree interval as effectively; they may be checked as filters.
Conversely, an event-date-first index might still win if the date range is
very selective or if the equality predicates are weakly selective. Plans on
this dataset, not index scan presence alone, determine the actual outcome.
There is no partial availability index: availability compares two columns,
and this workload's measured cardinality must justify the added complexity.

No separate registration lookup index is added. The existing unique
constraint on `(event_id, user_id)` already supplies a unique B-tree that
supports equality lookups on both values and enforces the application
invariant. It is not removed for any benchmark. No unrelated foreign-key
supporting indexes or constraints are removed.

The scripts capture the execution plans needed to decide whether to retain
the two event indexes. Review scan nodes, estimated versus actual rows,
buffers, and median execution time for each workload. The broad community
aggregate is expected to inspect most or all of `events`, so a sequential
scan can be the appropriate plan; an index choice by itself is not evidence
of a speedup.

## Results record

No PostgreSQL client/server is available in the authoring environment, so
there are no genuine local plans, timings, or index-size measurements checked
into this change. Generate them with the commands above before making a
performance claim. Record results here from `baseline-results.txt`,
`indexed-results.txt`, and `test-results.txt`:

| Workload | Baseline median ms | Indexed median ms | Scan/row/buffer observations | Interpretation |
| --- | ---: | ---: | --- | --- |
| Event discovery | Not measured | Not measured | Capture with the scripts | Pending local PostgreSQL run |
| Organizer dashboard | Not measured | Not measured | Capture with the scripts | Pending local PostgreSQL run |
| Registration lookup (existing / missing) | Not measured | Not measured | Existing unique index; no candidate added | Pending local PostgreSQL run |
| Community statistics | Not measured | Not measured | Broad aggregation; sequential scan may be appropriate | Pending local PostgreSQL run |
| Insert batch (1,000 events) | Not measured | Not measured | Compare the same rolled-back batch | Pending local PostgreSQL run |
| Added performance-index storage | — | Not measured | `pg_relation_size` output from the test suite | Pending local PostgreSQL run |

Do not treat the intended index purposes above as evidence of improvement.
Update this table with the plans' actual scan choices, row estimates versus
actuals, buffer activity, median times, measured storage, and whether the read
benefits justify the write overhead once those measurements have been run.
