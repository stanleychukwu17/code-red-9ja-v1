-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION sync_party_election_group_contesting()
RETURNS TRIGGER AS $$
DECLARE
  var_election_id INT;
  var_election_group_id INT;
  var_party_id SMALLINT;
  var_contesting_count INT;
BEGIN
  -- Determine affected election and party
  IF TG_OP = 'DELETE' THEN
    var_election_id := OLD.election_id;
    var_party_id := OLD.party_id;
  ELSE
    var_election_id := NEW.election_id;
    var_party_id := NEW.party_id;
  END IF;

  -- Get the election group id for this election
  SELECT election_group_id INTO var_election_group_id
  FROM elections
  WHERE id = var_election_id;

  IF var_election_group_id IS NOT NULL AND var_party_id IS NOT NULL THEN
    -- Count distinct elections this party is fielding candidates for in this election group
    SELECT COUNT(DISTINCT ec.election_id)::integer INTO var_contesting_count
    FROM election_candidates ec
    JOIN elections e ON e.id = ec.election_id
    WHERE e.election_group_id = var_election_group_id
      AND ec.party_id = var_party_id;

    IF var_contesting_count > 0 THEN
      -- Upsert into party_election_groups with accurate contesting count
      INSERT INTO party_election_groups (party_id, election_group_id, elections_contesting)
      VALUES (var_party_id, var_election_group_id, var_contesting_count)
      ON CONFLICT (party_id, election_group_id)
      DO UPDATE SET
        elections_contesting = EXCLUDED.elections_contesting,
        updated_at = NOW();
    ELSE
      -- If count dropped to 0, update elections_contesting if record exists
      UPDATE party_election_groups
      SET elections_contesting = 0, updated_at = NOW()
      WHERE party_id = var_party_id AND election_group_id = var_election_group_id;
    END IF;
  END IF;

  -- If it was an UPDATE and the party changed, also recalculate for the OLD party
  IF TG_OP = 'UPDATE' AND OLD.party_id IS DISTINCT FROM NEW.party_id AND var_election_group_id IS NOT NULL THEN
    SELECT COUNT(DISTINCT ec.election_id)::integer INTO var_contesting_count
    FROM election_candidates ec
    JOIN elections e ON e.id = ec.election_id
    WHERE e.election_group_id = var_election_group_id
      AND ec.party_id = OLD.party_id;

    IF var_contesting_count > 0 THEN
      INSERT INTO party_election_groups (party_id, election_group_id, elections_contesting)
      VALUES (OLD.party_id, var_election_group_id, var_contesting_count)
      ON CONFLICT (party_id, election_group_id)
      DO UPDATE SET
        elections_contesting = EXCLUDED.elections_contesting,
        updated_at = NOW();
    ELSE
      UPDATE party_election_groups
      SET elections_contesting = 0, updated_at = NOW()
      WHERE party_id = OLD.party_id AND election_group_id = var_election_group_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

DROP TRIGGER IF EXISTS trg_sync_party_election_group_contesting ON election_candidates;
CREATE TRIGGER trg_sync_party_election_group_contesting
AFTER INSERT OR UPDATE OR DELETE ON election_candidates
FOR EACH ROW
EXECUTE FUNCTION sync_party_election_group_contesting();

-- +goose Down
DROP TRIGGER IF EXISTS trg_sync_party_election_group_contesting ON election_candidates;
DROP FUNCTION IF EXISTS sync_party_election_group_contesting();
