-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION sync_polling_agents_coverage()
RETURNS TRIGGER AS $$
DECLARE
  var_new_count INTEGER;
  var_old_count INTEGER;
BEGIN
  -- 1. Handle OLD row decrement (for DELETE or UPDATE when keys change)
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND (
      OLD.party_id IS DISTINCT FROM NEW.party_id OR
      OLD.election_group_id IS DISTINCT FROM NEW.election_group_id OR
      OLD.polling_unit_id IS DISTINCT FROM NEW.polling_unit_id
  )) THEN
    -- Count remaining assignments in the OLD polling unit
    SELECT COUNT(*)::integer INTO var_old_count
    FROM polling_unit_assignments
    WHERE party_id = OLD.party_id
      AND election_group_id = OLD.election_group_id
      AND polling_unit_id = OLD.polling_unit_id;
      
    -- The threshold to decrement is the count before delete, which is var_old_count + 1
    IF (var_old_count + 1) >= 1 AND (var_old_count + 1) <= 10 THEN
      -- Ensure the party_election_group row exists
      INSERT INTO party_election_groups (party_id, election_group_id, polling_agents_coverage)
      VALUES (OLD.party_id, OLD.election_group_id, '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 0}'::jsonb)
      ON CONFLICT (party_id, election_group_id) DO NOTHING;

      -- Decrement the count for the (var_old_count + 1) threshold
      UPDATE party_election_groups
      SET polling_agents_coverage = jsonb_set(
            '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 0}'::jsonb || polling_agents_coverage,
            ARRAY[(var_old_count + 1)::text],
            to_jsonb(GREATEST(0, COALESCE(('{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 0}'::jsonb || polling_agents_coverage)->>(var_old_count + 1)::text, '0')::int - 1))
          ),
          updated_at = NOW()
      WHERE party_id = OLD.party_id AND election_group_id = OLD.election_group_id;
    END IF;
  END IF;

  -- 2. Handle NEW row increment (for INSERT or UPDATE when keys change)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
      OLD.party_id IS DISTINCT FROM NEW.party_id OR
      OLD.election_group_id IS DISTINCT FROM NEW.election_group_id OR
      OLD.polling_unit_id IS DISTINCT FROM NEW.polling_unit_id
  )) THEN
    -- Count total assignments in the NEW polling unit
    SELECT COUNT(*)::integer INTO var_new_count
    FROM polling_unit_assignments
    WHERE party_id = NEW.party_id
      AND election_group_id = NEW.election_group_id
      AND polling_unit_id = NEW.polling_unit_id;
      
    -- The threshold to increment is exactly the current count
    IF var_new_count >= 1 AND var_new_count <= 10 THEN
      -- Ensure the party_election_group row exists
      INSERT INTO party_election_groups (party_id, election_group_id, polling_agents_coverage)
      VALUES (NEW.party_id, NEW.election_group_id, '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 0}'::jsonb)
      ON CONFLICT (party_id, election_group_id) DO NOTHING;

      -- Increment the count for the var_new_count threshold
      UPDATE party_election_groups
      SET polling_agents_coverage = jsonb_set(
            '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 0}'::jsonb || polling_agents_coverage,
            ARRAY[var_new_count::text],
            to_jsonb(COALESCE(('{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 0}'::jsonb || polling_agents_coverage)->>var_new_count::text, '0')::int + 1)
          ),
          updated_at = NOW()
      WHERE party_id = NEW.party_id AND election_group_id = NEW.election_group_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_sync_polling_agents_coverage
AFTER INSERT OR UPDATE OR DELETE ON polling_unit_assignments
FOR EACH ROW
EXECUTE FUNCTION sync_polling_agents_coverage();

-- Backfill/sync existing coverages for all existing party election groups
UPDATE party_election_groups peg
SET polling_agents_coverage = COALESCE((
  WITH counts AS (
    SELECT polling_unit_id, COUNT(*) as agent_count
    FROM polling_unit_assignments
    WHERE party_id = peg.party_id AND election_group_id = peg.election_group_id
    GROUP BY polling_unit_id
  ),
  dist AS (
    SELECT gs.threshold, COALESCE(COUNT(c.polling_unit_id), 0) AS count
    FROM generate_series(1, 10) AS gs(threshold)
    LEFT JOIN counts c ON c.agent_count >= gs.threshold
    GROUP BY gs.threshold
  )
  SELECT jsonb_object_agg(threshold::text, count) FROM dist
), '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0, "10": 0}'::jsonb);

-- +goose Down
DROP TRIGGER IF EXISTS trg_sync_polling_agents_coverage ON polling_unit_assignments;
DROP FUNCTION IF EXISTS sync_polling_agents_coverage();
