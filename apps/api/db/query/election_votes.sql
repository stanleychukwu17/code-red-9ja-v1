-- name: GetEligibleElectionsForPollingUnit :many
SELECT e.*
FROM elections e
JOIN polling_units pu ON pu.id = $2
JOIN wards w ON w.id = pu.ward_id
JOIN lgas l ON l.id = pu.lga_id
WHERE e.election_group_id = $1
  AND (
    (e.scope = 'nationwide') OR
    (e.scope = 'state' AND e.state_id = pu.state_id) OR
    (e.scope = 'senatorial-district' AND e.senatorial_district_id = l.senatorial_district_id) OR
    (e.scope = 'federal-constituency' AND e.federal_constituency_id = l.federal_constituency_id) OR
    (e.scope = 'lga' AND e.lga_id = pu.lga_id) OR
    (e.scope = 'state-constituency' AND e.state_constituency_id = w.state_assembly_constituency_id) OR
    (e.scope = 'ward' AND e.ward_id = pu.ward_id)
  )
ORDER BY e.rank ASC, e.id ASC;

-- name: CreateElectionVote :one
INSERT INTO election_votes (
  state_id, senatorial_district_id, federal_constituency_id,
  lga_id, ward_id, polling_unit_id,
  user_id, election_group_id, election_id, party_id
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
)
RETURNING *;

-- name: CheckIfUserVotedInElection :one
SELECT EXISTS(
  SELECT 1 FROM election_votes
  WHERE user_id = $1 AND election_id = $2
);

-- name: GetUserVotesByElectionGroup :many
SELECT
    ev.id as vote_id,
    e.name as election_name,
    p.short_name as party_short_name,
    p.logo as party_logo,
    u.first_name as candidate_first_name,
    u.last_name as candidate_last_name,
    u.avatar as candidate_avatar
FROM election_votes ev
JOIN elections e ON e.id = ev.election_id
JOIN parties p ON p.id = ev.party_id
LEFT JOIN election_candidates ec ON ec.election_id = e.id AND ec.party_id = p.id
LEFT JOIN users u ON u.id = ec.candidate_id
WHERE ev.user_id = $1 AND ev.election_group_id = $2
ORDER BY e.rank ASC, e.id ASC;

-- name: DeleteUserVotesByElectionGroup :exec
DELETE FROM election_votes
WHERE user_id = $1 AND election_group_id = $2;
