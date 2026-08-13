package supervisorassignments

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"free9ja/api/internal/db/queries"
)

type Service struct {
	q *queries.Queries
}

func NewService(q *queries.Queries) *Service {
	return &Service{
		q: q,
	}
}

type SupervisorAssignmentsResponse struct {
	StateSupervisor *queries.StateElectionSupervisor `json:"state_supervisor"`
	LgaSupervisor   *queries.LgaElectionSupervisor   `json:"lga_supervisor"`
	WardSupervisor  *queries.WardElectionSupervisor  `json:"ward_supervisor"`
}

func (s *Service) GetUserSupervisorAssignments(ctx context.Context, userID int64, electionGroupID int64) (*SupervisorAssignmentsResponse, error) {
	resp := &SupervisorAssignmentsResponse{}

	// State
	stateSup, err := s.q.GetStateSupervisorByElectionGroup(ctx, queries.GetStateSupervisorByElectionGroupParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
	})
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
	} else {
		resp.StateSupervisor = &stateSup
	}

	// LGA
	lgaSup, err := s.q.GetLgaSupervisorByElectionGroup(ctx, queries.GetLgaSupervisorByElectionGroupParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
	})
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
	} else {
		resp.LgaSupervisor = &lgaSup
	}

	// Ward
	wardSup, err := s.q.GetWardSupervisorByElectionGroup(ctx, queries.GetWardSupervisorByElectionGroupParams{
		UserID:          userID,
		ElectionGroupID: electionGroupID,
	})
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
	} else {
		resp.WardSupervisor = &wardSup
	}

	return resp, nil
}
