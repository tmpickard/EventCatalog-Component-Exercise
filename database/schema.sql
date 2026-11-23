BEGIN;

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    display_name VARCHAR(60) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_email_nonblank CHECK (btrim(email) <> ''),
    CONSTRAINT users_display_name_nonblank CHECK (btrim(display_name) <> ''),
    CONSTRAINT users_password_hash_nonblank CHECK (btrim(password_hash) <> '')
);

CREATE UNIQUE INDEX users_email_normalized_uq
    ON users (lower(btrim(email)));

CREATE TABLE events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organizer_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state CHAR(2) NOT NULL,
    event_date DATE NOT NULL,
    capacity INTEGER NOT NULL,
    registered INTEGER NOT NULL DEFAULT 0,
    format VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT events_organizer_id_fkey
        FOREIGN KEY (organizer_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT events_name_nonblank CHECK (btrim(name) <> ''),
    CONSTRAINT events_city_nonblank CHECK (btrim(city) <> ''),
    CONSTRAINT events_state_nonblank CHECK (btrim(state) <> ''),
    CONSTRAINT events_capacity_positive CHECK (capacity > 0),
    CONSTRAINT events_registered_nonnegative CHECK (registered >= 0),
    CONSTRAINT events_registered_within_capacity CHECK (registered <= capacity),
    CONSTRAINT events_format_supported CHECK (format IN ('League', 'Tournament', 'Casual'))
);

CREATE TABLE event_registrations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id BIGINT NOT NULL,
    user_id UUID NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT event_registrations_event_id_user_id_key UNIQUE (event_id, user_id),
    CONSTRAINT event_registrations_event_id_fkey
        FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE RESTRICT,
    CONSTRAINT event_registrations_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE FUNCTION maintain_event_registration_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM 1
        FROM events
        WHERE id = NEW.event_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN NEW;
        END IF;

        UPDATE events
        SET registered = registered + 1
        WHERE id = NEW.event_id
          AND registered < capacity;

        IF NOT FOUND THEN
            RAISE EXCEPTION USING
                ERRCODE = 'P0001',
                MESSAGE = 'event capacity reached',
                DETAIL = 'EVENT_FULL';
        END IF;

        RETURN NEW;
    END IF;

    UPDATE events
    SET registered = registered - 1
    WHERE id = OLD.event_id
      AND registered > 0;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'registration counter is inconsistent for event %', OLD.event_id;
    END IF;

    RETURN OLD;
END;
$$;

CREATE TRIGGER event_registrations_maintain_count
AFTER INSERT OR DELETE ON event_registrations
FOR EACH ROW
EXECUTE FUNCTION maintain_event_registration_count();

COMMIT;
