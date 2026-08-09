-- +goose Up
WITH updated_parties AS (
    SELECT
        p.id,
        jsonb_object_agg(
            role.key,
            jsonb_build_object(
                'default', COALESCE((role.value->>'default')::numeric * 100, 0),
                'states', (
                    SELECT COALESCE(jsonb_object_agg(state.key, (state.value::text::numeric) * 100), '{}'::jsonb)
                    FROM jsonb_each(role.value->'states') AS state
                )
            )
        ) AS new_allocation
    FROM
        parties p,
        jsonb_each(p.agent_payment_allocation_kobo) AS role
    WHERE
        p.agent_payment_allocation_kobo IS NOT NULL 
        AND p.agent_payment_allocation_kobo != '{}'::jsonb
    GROUP BY p.id
)
UPDATE parties p
SET agent_payment_allocation_kobo = up.new_allocation
FROM updated_parties up
WHERE p.id = up.id;

-- +goose Down
WITH updated_parties AS (
    SELECT
        p.id,
        jsonb_object_agg(
            role.key,
            jsonb_build_object(
                'default', COALESCE((role.value->>'default')::numeric / 100, 0),
                'states', (
                    SELECT COALESCE(jsonb_object_agg(state.key, (state.value::text::numeric) / 100), '{}'::jsonb)
                    FROM jsonb_each(role.value->'states') AS state
                )
            )
        ) AS new_allocation
    FROM
        parties p,
        jsonb_each(p.agent_payment_allocation_kobo) AS role
    WHERE
        p.agent_payment_allocation_kobo IS NOT NULL 
        AND p.agent_payment_allocation_kobo != '{}'::jsonb
    GROUP BY p.id
)
UPDATE parties p
SET agent_payment_allocation_kobo = up.new_allocation
FROM updated_parties up
WHERE p.id = up.id;
