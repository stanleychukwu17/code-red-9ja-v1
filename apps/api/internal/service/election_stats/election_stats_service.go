package electionstats

import (
	"context"
	"free9ja/api/internal/db/queries"
)

type ElectionStatsService interface {
	ListElectionGroupPollingUnitStatsByGroup(ctx context.Context, arg queries.ListElectionGroupPollingUnitStatsByGroupParams) ([]queries.ElectionGroupPollingUnit, error)
	ListElectionGroupWardStatsByGroup(ctx context.Context, arg queries.ListElectionGroupWardStatsByGroupParams) ([]queries.ListElectionGroupWardStatsByGroupRow, error)
	ListElectionGroupLGAStatsByGroup(ctx context.Context, arg queries.ListElectionGroupLGAStatsByGroupParams) ([]queries.ListElectionGroupLGAStatsByGroupRow, error)
	ListElectionGroupStateStatsByGroup(ctx context.Context, electionGroupID int32) ([]queries.ListElectionGroupStateStatsByGroupRow, error)
	GetElectionGroupStateStats(ctx context.Context, arg queries.GetElectionGroupStateStatsParams) (queries.GetElectionGroupStateStatsRow, error)
	GetElectionGroupLGAStats(ctx context.Context, arg queries.GetElectionGroupLGAStatsParams) (queries.GetElectionGroupLGAStatsRow, error)
	GetElectionGroupWardStats(ctx context.Context, arg queries.GetElectionGroupWardStatsParams) (queries.GetElectionGroupWardStatsRow, error)
	GetElectionGroupPartyStateStats(ctx context.Context, arg queries.GetElectionGroupPartyStateStatsParams) (queries.GetElectionGroupPartyStateStatsRow, error)
	GetElectionGroupPartyLGAStats(ctx context.Context, arg queries.GetElectionGroupPartyLGAStatsParams) (queries.GetElectionGroupPartyLGAStatsRow, error)
	GetElectionGroupPartyWardStats(ctx context.Context, arg queries.GetElectionGroupPartyWardStatsParams) (queries.GetElectionGroupPartyWardStatsRow, error)
	GetElectionGroupPartyNationalStats(ctx context.Context, arg queries.GetElectionGroupPartyNationalStatsParams) (queries.GetElectionGroupPartyNationalStatsRow, error)
	GetPollingUnitWardID(ctx context.Context, id int32) (int32, error)
	GetAgentCoveragePollingUnits(ctx context.Context, arg queries.GetAgentCoveragePollingUnitsParams) ([]queries.GetAgentCoveragePollingUnitsRow, error)
	GetAgentCoverageWards(ctx context.Context, arg queries.GetAgentCoverageWardsParams) ([]queries.GetAgentCoverageWardsRow, error)
	GetAgentCoverageLGAs(ctx context.Context, arg queries.GetAgentCoverageLGAsParams) ([]queries.GetAgentCoverageLGAsRow, error)
	GetAgentCoverageStates(ctx context.Context, arg queries.GetAgentCoverageStatesParams) ([]queries.GetAgentCoverageStatesRow, error)
}

type Service struct {
	queries *queries.Queries
}

func NewElectionStatsService(q *queries.Queries) ElectionStatsService {
	return &Service{
		queries: q,
	}
}

func (s *Service) ListElectionGroupPollingUnitStatsByGroup(ctx context.Context, arg queries.ListElectionGroupPollingUnitStatsByGroupParams) ([]queries.ElectionGroupPollingUnit, error) {
	return s.queries.ListElectionGroupPollingUnitStatsByGroup(ctx, arg)
}

func (s *Service) ListElectionGroupWardStatsByGroup(ctx context.Context, arg queries.ListElectionGroupWardStatsByGroupParams) ([]queries.ListElectionGroupWardStatsByGroupRow, error) {
	return s.queries.ListElectionGroupWardStatsByGroup(ctx, arg)
}

func (s *Service) ListElectionGroupLGAStatsByGroup(ctx context.Context, arg queries.ListElectionGroupLGAStatsByGroupParams) ([]queries.ListElectionGroupLGAStatsByGroupRow, error) {
	return s.queries.ListElectionGroupLGAStatsByGroup(ctx, arg)
}

func (s *Service) ListElectionGroupStateStatsByGroup(ctx context.Context, electionGroupID int32) ([]queries.ListElectionGroupStateStatsByGroupRow, error) {
	return s.queries.ListElectionGroupStateStatsByGroup(ctx, electionGroupID)
}

func (s *Service) GetElectionGroupStateStats(ctx context.Context, arg queries.GetElectionGroupStateStatsParams) (queries.GetElectionGroupStateStatsRow, error) {
	return s.queries.GetElectionGroupStateStats(ctx, arg)
}

func (s *Service) GetElectionGroupLGAStats(ctx context.Context, arg queries.GetElectionGroupLGAStatsParams) (queries.GetElectionGroupLGAStatsRow, error) {
	return s.queries.GetElectionGroupLGAStats(ctx, arg)
}

func (s *Service) GetElectionGroupWardStats(ctx context.Context, arg queries.GetElectionGroupWardStatsParams) (queries.GetElectionGroupWardStatsRow, error) {
	return s.queries.GetElectionGroupWardStats(ctx, arg)
}

func (s *Service) GetElectionGroupPartyStateStats(ctx context.Context, arg queries.GetElectionGroupPartyStateStatsParams) (queries.GetElectionGroupPartyStateStatsRow, error) {
	return s.queries.GetElectionGroupPartyStateStats(ctx, arg)
}

func (s *Service) GetElectionGroupPartyLGAStats(ctx context.Context, arg queries.GetElectionGroupPartyLGAStatsParams) (queries.GetElectionGroupPartyLGAStatsRow, error) {
	return s.queries.GetElectionGroupPartyLGAStats(ctx, arg)
}

func (s *Service) GetElectionGroupPartyWardStats(ctx context.Context, arg queries.GetElectionGroupPartyWardStatsParams) (queries.GetElectionGroupPartyWardStatsRow, error) {
	return s.queries.GetElectionGroupPartyWardStats(ctx, arg)
}

func (s *Service) GetElectionGroupPartyNationalStats(ctx context.Context, arg queries.GetElectionGroupPartyNationalStatsParams) (queries.GetElectionGroupPartyNationalStatsRow, error) {
	return s.queries.GetElectionGroupPartyNationalStats(ctx, arg)
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
