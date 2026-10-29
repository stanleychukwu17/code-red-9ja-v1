-- +goose Up
-- +goose StatementBegin

-- ============================================================
-- fn_egcov_on_polling_unit_assignment
-- Fires AFTER INSERT on polling_unit_assignments.
-- Responsibilities:
--   INSERT: upsert skeleton row in election_group_polling_units if missing.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_egcov_on_polling_unit_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_pu               RECORD;
  v_state_const_id   INT;
  v_fed_const_id     INT;
  v_senat_id         INT;
  v_state_id         SMALLINT;
  v_eg_id            BIGINT;
  v_pu_id            INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN NULL;
  END IF;

  v_eg_id := NEW.election_group_id;
  v_pu_id := NEW.polling_unit_id;

  -- Fetch full geography from polling_units + wards + lgas
  SELECT
    pu.id, pu.ward_id, pu.lga_id, pu.state_id,
    w.state_constituency_id,
    l.federal_constituency_id,
    l.senatorial_district_id
  INTO v_pu
  FROM polling_units pu
  JOIN wards w ON w.id = pu.ward_id
  JOIN lgas  l ON l.id = pu.lga_id
  WHERE pu.id = v_pu_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_state_const_id := v_pu.state_constituency_id;
  v_fed_const_id   := v_pu.federal_constituency_id;
  v_senat_id       := v_pu.senatorial_district_id;
  v_state_id       := v_pu.state_id;

  -- Ensure election_group_polling_units skeleton row exists
  INSERT INTO election_group_polling_units (
    election_group_id, polling_unit_id,
    state_id, lga_id, ward_id,
    state_constituency_id, federal_constituency_id, senatorial_district_id,
    pu_agents_count
  ) VALUES (
    v_eg_id, v_pu_id,
    v_state_id, v_pu.lga_id, v_pu.ward_id,
    v_state_const_id, v_fed_const_id, v_senat_id,
    0
  )
  ON CONFLICT (election_group_id, polling_unit_id) DO NOTHING;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- +goose StatementEnd

CREATE TRIGGER trg_egcov_polling_unit_assignment
AFTER INSERT ON polling_unit_assignments
FOR EACH ROW
EXECUTE FUNCTION fn_egcov_on_polling_unit_assignment();


-- +goose Down
DROP TRIGGER IF EXISTS trg_egcov_polling_unit_assignment ON polling_unit_assignments;
DROP FUNCTION IF EXISTS fn_egcov_on_polling_unit_assignment();
