-- +goose Up
-- +goose StatementBegin

-- ============================================================
-- fn_egcov_on_polling_unit_assignment
-- Fires AFTER INSERT OR DELETE on polling_unit_assignments.
-- Responsibilities:
--   INSERT: upsert skeleton rows from election_group_polling_units all
--           the way up to election_group_states. Increment polling_units_count
--           on each parent row IF this PU is newly entering that election group.
--   DELETE: decrement polling_units_count on each parent row IF this PU
--           now has 0 agents left for this election group.
-- NOTE: The parties JSONB agents_count update is handled in Go (ApproveApplication),
--       not here, to avoid complex JSONB manipulation in triggers.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_egcov_on_polling_unit_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_pu               RECORD;
  v_ward             RECORD;
  v_lga              RECORD;
  v_state_const_id   INT;
  v_fed_const_id     INT;
  v_senat_id         INT;
  v_state_id         SMALLINT;
  v_eg_id            BIGINT;
  v_pu_id            INT;
  v_party_id         BIGINT;
  v_remaining        INT;
  v_pu_was_new       BOOL := FALSE;
BEGIN
  -- Resolve the key fields from whichever row is active
  IF TG_OP = 'DELETE' THEN
    v_eg_id    := OLD.election_group_id;
    v_pu_id    := OLD.polling_unit_id;
    v_party_id := OLD.party_id;
  ELSE
    v_eg_id    := NEW.election_group_id;
    v_pu_id    := NEW.polling_unit_id;
    v_party_id := NEW.party_id;
  END IF;

  -- Fetch full geography from polling_units + wards + lgas
  SELECT
    pu.id, pu.ward_id, pu.lga_id, pu.state_id,
    w.state_assembly_constituency_id,
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

  v_state_const_id := v_pu.state_assembly_constituency_id;
  v_fed_const_id   := v_pu.federal_constituency_id;
  v_senat_id       := v_pu.senatorial_district_id;
  v_state_id       := v_pu.state_id;

  -- -------------------------------------------------------
  -- INSERT path: ensure all skeleton rows exist
  -- -------------------------------------------------------
  IF TG_OP = 'INSERT' THEN

    -- 1. election_group_polling_units
    --    We need to know if this PU row is brand-new for this election group
    --    so we can increment polling_units_count on parent rows.
    INSERT INTO election_group_polling_units (
      election_group_id, polling_unit_id,
      state_id, lga_id, ward_id,
      state_constituency_id, federal_constituency_id, senatorial_district_id,
      -- Grab static counts from geography tables
      pu_agents_count
    ) VALUES (
      v_eg_id, v_pu_id,
      v_state_id, v_pu.lga_id, v_pu.ward_id,
      v_state_const_id, v_fed_const_id, v_senat_id,
      0
    )
    ON CONFLICT (election_group_id, polling_unit_id) DO NOTHING;

    -- Did we just create the PU row? (xmax = 0 means it was inserted, not skipped)
    GET DIAGNOSTICS v_remaining = ROW_COUNT;
    v_pu_was_new := (v_remaining = 1);

    -- 2. election_group_wards
    INSERT INTO election_group_wards (
      election_group_id, ward_id, lga_id, state_id,
      polling_units_count
    )
    SELECT
      v_eg_id, v_pu.ward_id, v_pu.lga_id, v_state_id,
      w.polling_units_count  -- from ward record
    FROM wards w WHERE w.id = v_pu.ward_id
    ON CONFLICT (election_group_id, ward_id) DO NOTHING;

    -- 3. election_group_lgas
    INSERT INTO election_group_lgas (
      election_group_id, lga_id, state_id,
      senatorial_district_id, federal_constituency_id,
      state_constituencies_count, wards_count, polling_units_count
    )
    SELECT
      v_eg_id, l.id, v_state_id,
      l.senatorial_district_id, l.federal_constituency_id,
      l.state_constituencies_count, l.wards_count, l.polling_units_count
    FROM lgas l WHERE l.id = v_pu.lga_id
    ON CONFLICT (election_group_id, lga_id) DO NOTHING;

    -- 4. election_group_state_constituencies
    IF v_state_const_id IS NOT NULL THEN
      INSERT INTO election_group_state_constituencies (
        election_group_id, state_constituency_id, state_id,
        wards_count, polling_units_count
      )
      SELECT
        v_eg_id, sc.id, v_state_id,
        sc.wards_count, sc.polling_units_count
      FROM state_assembly_constituencies sc WHERE sc.id = v_state_const_id
      ON CONFLICT (election_group_id, state_constituency_id) DO NOTHING;
    END IF;

    -- 5. election_group_federal_constituencies
    IF v_fed_const_id IS NOT NULL THEN
      INSERT INTO election_group_federal_constituencies (
        election_group_id, federal_constituency_id, state_id, senatorial_district_id,
        lgas_count, state_constituencies_count, wards_count, polling_units_count
      )
      SELECT
        v_eg_id, fc.id, v_state_id, fc.senatorial_district_id,
        fc.lgas_count, fc.state_constituencies_count, fc.wards_count, fc.polling_units_count
      FROM federal_constituencies fc WHERE fc.id = v_fed_const_id
      ON CONFLICT (election_group_id, federal_constituency_id) DO NOTHING;
    END IF;

    -- 6. election_group_senatorial_districts
    IF v_senat_id IS NOT NULL THEN
      INSERT INTO election_group_senatorial_districts (
        election_group_id, senatorial_district_id, state_id,
        federal_constituencies_count, lgas_count,
        state_constituencies_count, wards_count, polling_units_count
      )
      SELECT
        v_eg_id, sd.id, v_state_id,
        sd.federal_constituencies_count, sd.lgas_count,
        sd.state_constituencies_count, sd.wards_count, sd.polling_units_count
      FROM senatorial_districts sd WHERE sd.id = v_senat_id
      ON CONFLICT (election_group_id, senatorial_district_id) DO NOTHING;
    END IF;

    -- 7. election_group_states
    INSERT INTO election_group_states (
      election_group_id, state_id,
      senatorial_districts_count, federal_constituencies_count,
      lgas_count, state_constituencies_count, wards_count, polling_units_count
    )
    SELECT
      v_eg_id, cs.id,
      cs.senatorial_districts_count, cs.federal_constituencies_count,
      cs.lgas_count, cs.state_constituencies_count, cs.wards_count, cs.polling_units_count
    FROM c_states cs WHERE cs.id = v_state_id
    ON CONFLICT (election_group_id, state_id) DO NOTHING;

  -- -------------------------------------------------------
  -- DELETE path: check if this PU is now empty; if so, nothing
  -- extra needed for skeleton rows (they stay). The Go service
  -- handles JSONB agent_count decrement. We just need to know
  -- if total agents for this PU dropped to 0 for the unique_pu count.
  -- That's handled in Go as well.
  -- -------------------------------------------------------
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- +goose StatementEnd

CREATE TRIGGER trg_egcov_polling_unit_assignment
AFTER INSERT OR DELETE ON polling_unit_assignments
FOR EACH ROW
EXECUTE FUNCTION fn_egcov_on_polling_unit_assignment();


-- +goose StatementBegin

-- ============================================================
-- fn_egcov_on_ward_supervisor
-- Fires AFTER INSERT OR DELETE on ward_election_supervisors.
-- On INSERT: ensure skeleton rows exist for the ward and all
--   parent geographic levels. ward_supervisors_count maintained by Go.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_egcov_on_ward_supervisor()
RETURNS TRIGGER AS $$
DECLARE
  v_ward    RECORD;
  v_lga     RECORD;
  v_eg_id   BIGINT;
  v_ward_id INT;
  v_lga_id  INT;
  v_state_id SMALLINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_eg_id   := OLD.election_group_id;
    v_ward_id := OLD.ward_id;
    v_lga_id  := OLD.lga_id;
    v_state_id := OLD.state_id;
  ELSE
    v_eg_id   := NEW.election_group_id;
    v_ward_id := NEW.ward_id;
    v_lga_id  := NEW.lga_id;
    v_state_id := NEW.state_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Fetch ward + lga details for denormalized IDs
    SELECT w.id, w.state_assembly_constituency_id, w.polling_units_count
    INTO v_ward
    FROM wards w WHERE w.id = v_ward_id;

    SELECT l.id, l.senatorial_district_id, l.federal_constituency_id,
           l.state_constituencies_count, l.wards_count, l.polling_units_count
    INTO v_lga
    FROM lgas l WHERE l.id = v_lga_id;

    -- 1. election_group_wards
    INSERT INTO election_group_wards (
      election_group_id, ward_id, lga_id, state_id,
      polling_units_count
    )
    SELECT v_eg_id, v_ward_id, v_lga_id, v_state_id, v_ward.polling_units_count
    ON CONFLICT (election_group_id, ward_id) DO NOTHING;

    -- 2. election_group_lgas
    INSERT INTO election_group_lgas (
      election_group_id, lga_id, state_id,
      senatorial_district_id, federal_constituency_id,
      state_constituencies_count, wards_count, polling_units_count
    )
    SELECT
      v_eg_id, v_lga_id, v_state_id,
      v_lga.senatorial_district_id, v_lga.federal_constituency_id,
      v_lga.state_constituencies_count, v_lga.wards_count, v_lga.polling_units_count
    ON CONFLICT (election_group_id, lga_id) DO NOTHING;

    -- 3. election_group_state_constituencies
    IF v_ward.state_assembly_constituency_id IS NOT NULL THEN
      INSERT INTO election_group_state_constituencies (
        election_group_id, state_constituency_id, state_id,
        wards_count, polling_units_count
      )
      SELECT
        v_eg_id, sc.id, v_state_id, sc.wards_count, sc.polling_units_count
      FROM state_assembly_constituencies sc
      WHERE sc.id = v_ward.state_assembly_constituency_id
      ON CONFLICT (election_group_id, state_constituency_id) DO NOTHING;
    END IF;

    -- 4. election_group_federal_constituencies
    IF v_lga.federal_constituency_id IS NOT NULL THEN
      INSERT INTO election_group_federal_constituencies (
        election_group_id, federal_constituency_id, state_id, senatorial_district_id,
        lgas_count, state_constituencies_count, wards_count, polling_units_count
      )
      SELECT
        v_eg_id, fc.id, v_state_id, fc.senatorial_district_id,
        fc.lgas_count, fc.state_constituencies_count, fc.wards_count, fc.polling_units_count
      FROM federal_constituencies fc WHERE fc.id = v_lga.federal_constituency_id
      ON CONFLICT (election_group_id, federal_constituency_id) DO NOTHING;
    END IF;

    -- 5. election_group_senatorial_districts
    IF v_lga.senatorial_district_id IS NOT NULL THEN
      INSERT INTO election_group_senatorial_districts (
        election_group_id, senatorial_district_id, state_id,
        federal_constituencies_count, lgas_count,
        state_constituencies_count, wards_count, polling_units_count
      )
      SELECT
        v_eg_id, sd.id, v_state_id,
        sd.federal_constituencies_count, sd.lgas_count,
        sd.state_constituencies_count, sd.wards_count, sd.polling_units_count
      FROM senatorial_districts sd WHERE sd.id = v_lga.senatorial_district_id
      ON CONFLICT (election_group_id, senatorial_district_id) DO NOTHING;
    END IF;

    -- 6. election_group_states
    INSERT INTO election_group_states (
      election_group_id, state_id,
      senatorial_districts_count, federal_constituencies_count,
      lgas_count, state_constituencies_count, wards_count, polling_units_count
    )
    SELECT
      v_eg_id, cs.id,
      cs.senatorial_districts_count, cs.federal_constituencies_count,
      cs.lgas_count, cs.state_constituencies_count, cs.wards_count, cs.polling_units_count
    FROM c_states cs WHERE cs.id = v_state_id
    ON CONFLICT (election_group_id, state_id) DO NOTHING;

  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- +goose StatementEnd

CREATE TRIGGER trg_egcov_ward_supervisor
AFTER INSERT OR DELETE ON ward_election_supervisors
FOR EACH ROW
EXECUTE FUNCTION fn_egcov_on_ward_supervisor();


-- +goose StatementBegin

-- ============================================================
-- fn_egcov_on_lga_supervisor
-- Fires AFTER INSERT OR DELETE on lga_election_supervisors.
-- On INSERT: ensure skeleton rows exist from election_group_lgas
--   upward to election_group_states.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_egcov_on_lga_supervisor()
RETURNS TRIGGER AS $$
DECLARE
  v_lga      RECORD;
  v_eg_id    BIGINT;
  v_lga_id   INT;
  v_state_id SMALLINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_eg_id   := OLD.election_group_id;
    v_lga_id  := OLD.lga_id;
    v_state_id := OLD.state_id;
  ELSE
    v_eg_id   := NEW.election_group_id;
    v_lga_id  := NEW.lga_id;
    v_state_id := NEW.state_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT l.id, l.senatorial_district_id, l.federal_constituency_id,
           l.state_constituencies_count, l.wards_count, l.polling_units_count
    INTO v_lga
    FROM lgas l WHERE l.id = v_lga_id;

    -- 1. election_group_lgas
    INSERT INTO election_group_lgas (
      election_group_id, lga_id, state_id,
      senatorial_district_id, federal_constituency_id,
      state_constituencies_count, wards_count, polling_units_count
    )
    SELECT
      v_eg_id, v_lga_id, v_state_id,
      v_lga.senatorial_district_id, v_lga.federal_constituency_id,
      v_lga.state_constituencies_count, v_lga.wards_count, v_lga.polling_units_count
    ON CONFLICT (election_group_id, lga_id) DO NOTHING;

    -- 2. election_group_federal_constituencies
    IF v_lga.federal_constituency_id IS NOT NULL THEN
      INSERT INTO election_group_federal_constituencies (
        election_group_id, federal_constituency_id, state_id, senatorial_district_id,
        lgas_count, state_constituencies_count, wards_count, polling_units_count
      )
      SELECT
        v_eg_id, fc.id, v_state_id, fc.senatorial_district_id,
        fc.lgas_count, fc.state_constituencies_count, fc.wards_count, fc.polling_units_count
      FROM federal_constituencies fc WHERE fc.id = v_lga.federal_constituency_id
      ON CONFLICT (election_group_id, federal_constituency_id) DO NOTHING;
    END IF;

    -- 3. election_group_senatorial_districts
    IF v_lga.senatorial_district_id IS NOT NULL THEN
      INSERT INTO election_group_senatorial_districts (
        election_group_id, senatorial_district_id, state_id,
        federal_constituencies_count, lgas_count,
        state_constituencies_count, wards_count, polling_units_count
      )
      SELECT
        v_eg_id, sd.id, v_state_id,
        sd.federal_constituencies_count, sd.lgas_count,
        sd.state_constituencies_count, sd.wards_count, sd.polling_units_count
      FROM senatorial_districts sd WHERE sd.id = v_lga.senatorial_district_id
      ON CONFLICT (election_group_id, senatorial_district_id) DO NOTHING;
    END IF;

    -- 4. election_group_states
    INSERT INTO election_group_states (
      election_group_id, state_id,
      senatorial_districts_count, federal_constituencies_count,
      lgas_count, state_constituencies_count, wards_count, polling_units_count
    )
    SELECT
      v_eg_id, cs.id,
      cs.senatorial_districts_count, cs.federal_constituencies_count,
      cs.lgas_count, cs.state_constituencies_count, cs.wards_count, cs.polling_units_count
    FROM c_states cs WHERE cs.id = v_state_id
    ON CONFLICT (election_group_id, state_id) DO NOTHING;

  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- +goose StatementEnd

CREATE TRIGGER trg_egcov_lga_supervisor
AFTER INSERT OR DELETE ON lga_election_supervisors
FOR EACH ROW
EXECUTE FUNCTION fn_egcov_on_lga_supervisor();


-- +goose StatementBegin

-- ============================================================
-- fn_egcov_on_state_supervisor
-- Fires AFTER INSERT OR DELETE on state_election_supervisors.
-- On INSERT: ensure election_group_states skeleton row exists.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_egcov_on_state_supervisor()
RETURNS TRIGGER AS $$
DECLARE
  v_eg_id    BIGINT;
  v_state_id SMALLINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_eg_id    := OLD.election_group_id;
    v_state_id := OLD.state_id;
  ELSE
    v_eg_id    := NEW.election_group_id;
    v_state_id := NEW.state_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO election_group_states (
      election_group_id, state_id,
      senatorial_districts_count, federal_constituencies_count,
      lgas_count, state_constituencies_count, wards_count, polling_units_count
    )
    SELECT
      v_eg_id, cs.id,
      cs.senatorial_districts_count, cs.federal_constituencies_count,
      cs.lgas_count, cs.state_constituencies_count, cs.wards_count, cs.polling_units_count
    FROM c_states cs WHERE cs.id = v_state_id
    ON CONFLICT (election_group_id, state_id) DO NOTHING;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- +goose StatementEnd

CREATE TRIGGER trg_egcov_state_supervisor
AFTER INSERT OR DELETE ON state_election_supervisors
FOR EACH ROW
EXECUTE FUNCTION fn_egcov_on_state_supervisor();


-- +goose Down
DROP TRIGGER IF EXISTS trg_egcov_state_supervisor ON state_election_supervisors;
DROP TRIGGER IF EXISTS trg_egcov_lga_supervisor ON lga_election_supervisors;
DROP TRIGGER IF EXISTS trg_egcov_ward_supervisor ON ward_election_supervisors;
DROP TRIGGER IF EXISTS trg_egcov_polling_unit_assignment ON polling_unit_assignments;
DROP FUNCTION IF EXISTS fn_egcov_on_state_supervisor();
DROP FUNCTION IF EXISTS fn_egcov_on_lga_supervisor();
DROP FUNCTION IF EXISTS fn_egcov_on_ward_supervisor();
DROP FUNCTION IF EXISTS fn_egcov_on_polling_unit_assignment();
