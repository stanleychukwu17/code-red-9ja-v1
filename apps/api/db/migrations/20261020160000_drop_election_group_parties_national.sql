-- +goose Up
DROP TABLE IF EXISTS election_group_parties_national;

-- +goose Down
CREATE TABLE IF NOT EXISTS election_group_parties_national (
  election_group_id                              INT NOT NULL REFERENCES election_groups(id) ON DELETE CASCADE,
  party_id                                       SMALLINT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,

  applications_count                             INT NOT NULL DEFAULT 0,
  accepted_applications_count                    INT NOT NULL DEFAULT 0,
  rejected_applications_count                    INT NOT NULL DEFAULT 0,
  ward_supervisor_applications_count             INT NOT NULL DEFAULT 0,
  ward_supervisor_accepted_applications_count    INT NOT NULL DEFAULT 0,
  ward_supervisor_rejected_applications_count    INT NOT NULL DEFAULT 0,
  lga_supervisor_applications_count              INT NOT NULL DEFAULT 0,
  lga_supervisor_accepted_applications_count     INT NOT NULL DEFAULT 0,
  lga_supervisor_rejected_applications_count     INT NOT NULL DEFAULT 0,
  state_supervisor_applications_count            INT NOT NULL DEFAULT 0,
  state_supervisor_accepted_applications_count   INT NOT NULL DEFAULT 0,
  state_supervisor_rejected_applications_count   INT NOT NULL DEFAULT 0,

  pu_agents_count                                INT NOT NULL DEFAULT 0,
  unique_pu_agents_count                         INT NOT NULL DEFAULT 0,
  pu_agents_in_attendance_count                  INT NOT NULL DEFAULT 0,
  pu_reports_count                               INT NOT NULL DEFAULT 0,
  pu_updates_count                               INT NOT NULL DEFAULT 0,
  pu_average_arrival_time                        TIMESTAMPTZ,
  pu_average_update_time_interval_in_seconds     FLOAT NOT NULL DEFAULT 0,
  pu_average_election_started_at                 TIMESTAMPTZ,
  pu_average_election_ended_at                   TIMESTAMPTZ,
  pu_election_practice_test_readiness_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  pu_final_results_uploaded_count                INT NOT NULL DEFAULT 0,
  unique_pu_final_results_uploaded_count         INT NOT NULL DEFAULT 0,
  pu_live_voters_referred_by_agent_count         INT NOT NULL DEFAULT 0,

  total_pu_with_reports                          INT NOT NULL DEFAULT 0,
  total_pu_with_updates                          INT NOT NULL DEFAULT 0,
  total_pu_with_agents_in_attendance             INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_started            INT NOT NULL DEFAULT 0,
  total_pu_where_election_has_ended              INT NOT NULL DEFAULT 0,
  total_pu_unique_final_results_uploaded         INT NOT NULL DEFAULT 0,
  total_pu_where_agents_referred_live_voters     INT NOT NULL DEFAULT 0,

  state_supervisors_count                        INT NOT NULL DEFAULT 0,
  unique_state_supervisors_count                 INT NOT NULL DEFAULT 0,
  lga_supervisors_count                          INT NOT NULL DEFAULT 0,
  unique_lga_supervisors_count                   INT NOT NULL DEFAULT 0,
  ward_supervisors_count                         INT NOT NULL DEFAULT 0,
  unique_ward_supervisors_count                  INT NOT NULL DEFAULT 0,

  created_at                                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                                     TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (election_group_id, party_id)
);

CREATE INDEX IF NOT EXISTS idx_egpnat_party_id ON election_group_parties_national(party_id);
