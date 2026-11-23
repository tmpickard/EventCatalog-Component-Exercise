CREATE OR REPLACE FUNCTION register_for_event(
    p_event_id BIGINT,
    p_user_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    event_registered INTEGER;
    event_capacity INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM users WHERE id = p_user_id
    ) THEN
        RETURN 'user_not_found';
    END IF;

    SELECT registered, capacity
    INTO event_registered, event_capacity
    FROM events
    WHERE id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN 'event_not_found';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM event_registrations
        WHERE event_id = p_event_id
          AND user_id = p_user_id
    ) THEN
        RETURN 'already_registered';
    END IF;

    IF event_registered >= event_capacity THEN
        RETURN 'event_full';
    END IF;

    INSERT INTO event_registrations (event_id, user_id)
    VALUES (p_event_id, p_user_id);

    RETURN 'registered';
END;
$$;

-- Call within the caller's transaction and commit only after receiving
-- 'registered'. All other return values are non-mutating business outcomes.
-- The trigger in schema.sql updates events.registered in the same transaction.
