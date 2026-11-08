package electionstats

import (
	"context"
	"free9ja/api/internal/db/queries"
)

type ElectionStatsService interface {
	GetPollingUnitWardID(ctx context.Context, id int32) (int32, error)
	GetAgentCoveragePollingUnits(ctx context.Context, arg queries.GetAgentCoveragePollingUnitsParams) ([]queries.GetAgentCoveragePollingUnitsRow, error)
	GetAgentCoverageWards(ctx context.Context, arg queries.GetAgentCoverageWardsParams) ([]queries.GetAgentCoverageWardsRow, error)
	GetAgentCoverageLGAs(ctx context.Context, arg queries.GetAgentCoverageLGAsParams) ([]queries.GetAgentCoverageLGAsRow, error)
	GetAgentCoverageStates(ctx context.Context, arg queries.GetAgentCoverageStatesParams) ([]queries.GetAgentCoverageStatesRow, error)
	GetWardSupervisorCount(ctx context.Context, arg queries.GetWardSupervisorCountParams) (int32, error)
	GetLGASupervisorCount(ctx context.Context, arg queries.GetLGASupervisorCountParams) (int32, error)
	GetStateSupervisorCount(ctx context.Context, arg queries.GetStateSupervisorCountParams) (int32, error)
}

type Service struct {
	queries *queries.Queries
}

func NewElectionStatsService(q *queries.Queries) ElectionStatsService {
	return &Service{
		queries: q,
	}
}

func (s *Service) GetPollingUnitWardID(ctx context.Context, id int32) (int32, error) {
	return s.queries.GetPollingUnitWardID(ctx, id)
}

func (s *Service) GetAgentCoveragePollingUnits(ctx context.Context, arg queries.GetAgentCoveragePollingUnitsParams) ([]queries.GetAgentCoveragePollingUnitsRow, error) {
	return s.queries.GetAgentCoveragePollingUnits(ctx, arg)
}

func (s *Service) GetAgentCoverageWards(ctx context.Context, arg queries.GetAgentCoverageWardsParams) ([]queries.GetAgentCoverageWardsRow, error) {
	return s.queries.GetAgentCoverageWards(ctx, arg)
}

func (s *Service) GetAgentCoverageLGAs(ctx context.Context, arg queries.GetAgentCoverageLGAsParams) ([]queries.GetAgentCoverageLGAsRow, error) {
	return s.queries.GetAgentCoverageLGAs(ctx, arg)
}

func (s *Service) GetAgentCoverageStates(ctx context.Context, arg queries.GetAgentCoverageStatesParams) ([]queries.GetAgentCoverageStatesRow, error) {
	return s.queries.GetAgentCoverageStates(ctx, arg)
}

func (s *Service) GetWardSupervisorCount(ctx context.Context, arg queries.GetWardSupervisorCountParams) (int32, error) {
	return s.queries.GetWardSupervisorCount(ctx, arg)
}

func (s *Service) GetLGASupervisorCount(ctx context.Context, arg queries.GetLGASupervisorCountParams) (int32, error) {
	return s.queries.GetLGASupervisorCount(ctx, arg)
}

func (s *Service) GetStateSupervisorCount(ctx context.Context, arg queries.GetStateSupervisorCountParams) (int32, error) {
	return s.queries.GetStateSupervisorCount(ctx, arg)
}
