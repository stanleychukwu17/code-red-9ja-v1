-- +goose Up
-- +goose StatementBegin

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

-- +goose Down
-- +goose StatementBegin
-- Revert the trigger function to have total_agents_count (the broken state)
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
      total_agents_count
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
