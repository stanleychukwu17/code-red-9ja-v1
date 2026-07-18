CREATE TEMP TABLE test_pu (
  id INT PRIMARY KEY,
  total_reports_count INT DEFAULT 0,
  total_updates_count INT DEFAULT 0,
  parties JSONB DEFAULT '[]'::jsonb
);

INSERT INTO test_pu (id, parties) VALUES (
  1,
  '[{"party_id": 1, "updates_count": 0, "reports_count": 0, "last_update_given_at": null, "average_update_time_interval_in_seconds": 0.0}]'::jsonb
);

UPDATE test_pu
SET
  total_reports_count = total_reports_count + 1,
  parties = (
    SELECT jsonb_agg(
      CASE
        WHEN (elem->>'party_id')::bigint = 1
        THEN jsonb_set(
               jsonb_set(
                 jsonb_set(
                   jsonb_set(
                     elem,
                     '{reports_count}',
                     to_jsonb(COALESCE((elem->>'reports_count')::int, 0) + 1)
                   ),
                   '{updates_count}',
                   to_jsonb(COALESCE((elem->>'updates_count')::int, 0) + 0)
                 ),
                 '{last_update_given_at}',
                 to_jsonb(NOW()::text)
               ),
               '{average_update_time_interval_in_seconds}',
               to_jsonb(
                 CASE
                   WHEN (elem->>'last_update_given_at') IS NULL THEN 0.0
                   ELSE (
                     (COALESCE((elem->>'average_update_time_interval_in_seconds')::numeric, 0.0) * (COALESCE((elem->>'updates_count')::numeric, 0) + COALESCE((elem->>'reports_count')::numeric, 0)))
                     + EXTRACT(EPOCH FROM (NOW() - (elem->>'last_update_given_at')::timestamptz))
                   ) / (COALESCE((elem->>'updates_count')::numeric, 0) + COALESCE((elem->>'reports_count')::numeric, 0) + 1.0)
                 END
               )
             )
        ELSE elem
      END
    )
    FROM jsonb_array_elements(parties) AS elem
  )
WHERE id = 1;

SELECT parties FROM test_pu;
