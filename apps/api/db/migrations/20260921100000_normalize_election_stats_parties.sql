-- +goose Up

-- ============================================================
-- 1. election_group_parties_polling_units
-- ============================================================
CREATE TABLE IF NOT EXISTS election_group_parties_polling_units (
  election_group_id                              INT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  polling_unit_id                                INT NOT NULL REFERENCES polling_units(id) ON DELETE CASCADE,
  party_id                                       SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,

  state_id                                       SMALLINT REFERENCES c_states(id) ON DELETE SET NULL,
  lga_id                                         INT REFERENCES lgas(id) ON DELETE SET NULL,
  ward_id                                        INT REFERENCES wards(id) ON DELETE SET NULL,
  state_constituency_id                          INT REFERENCES state_constituencies(id) ON DELETE SET NULL,
  federal_constituency_id                        INT REFERENCES federal_constituencies(id) ON DELETE SET NULL,
  senatorial_district_id                         INT REFERENCES senatorial_districts(id) ON DELETE SET NULL,

  pu_agents_count                                INT NOT NULL DEFAULT 0,
  pu_agents_in_attendance_count                  INT NOT NULL DEFAULT 0,
  pu_reports_count                               INT NOT NULL DEFAULT 0,
  pu_updates_count                               INT NOT NULL DEFAULT 0,
  pu_final_results_uploaded_count                INT NOT NULL DEFAULT 0,
  unique_pu_final_results_uploaded_count         INT NOT NULL DEFAULT 0,
  last_update_given_at                           TIMESTAMPTZ,

  created_at                                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                                     TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (election_group_id, polling_unit_id, party_id)
);

CREATE INDEX idx_egppu_party_id ON election_group_parties_polling_units(party_id);
CREATE INDEX idx_egppu_ward_id  ON election_group_parties_polling_units(ward_id);
CREATE INDEX idx_egppu_lga_id   ON election_group_parties_polling_units(lga_id);
CREATE INDEX idx_egppu_state_id ON election_group_parties_polling_units(state_id);
CREATE INDEX idx_egppu_group_party_ward ON election_group_parties_polling_units(election_group_id, party_id, ward_id);
CREATE INDEX idx_egppu_group_party_lga ON election_group_parties_polling_units(election_group_id, party_id, lga_id);
CREATE INDEX idx_egppu_group_party_state ON election_group_parties_polling_units(election_group_id, party_id, state_id);

-- +goose Down
DROP TABLE IF EXISTS election_group_parties_polling_units;
