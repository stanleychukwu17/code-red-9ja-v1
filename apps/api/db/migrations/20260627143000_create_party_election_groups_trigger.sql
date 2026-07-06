-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION create_party_election_groups_for_new_group()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO party_election_groups (party_id, election_group_id, elections_contesting)
  SELECT id, NEW.id, 0
  FROM parties
  WHERE status = 'active'
  ON CONFLICT (party_id, election_group_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- +goose StatementEnd

CREATE TRIGGER trg_create_party_election_groups
AFTER INSERT ON election_groups
FOR EACH ROW
EXECUTE FUNCTION create_party_election_groups_for_new_group();

-- +goose Down
DROP TRIGGER IF EXISTS trg_create_party_election_groups ON election_groups;
DROP FUNCTION IF EXISTS create_party_election_groups_for_new_group();
