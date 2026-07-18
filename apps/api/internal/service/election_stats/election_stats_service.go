package electionstats

import (
	"context"
	"free9ja/api/internal/db/queries"
)

type ElectionStatsService interface {
	ListElectionGroupPollingUnitStatsByGroup(ctx context.Context, arg queries.ListElectionGroupPollingUnitStatsByGroupParams) ([]queries.ElectionGroupPollingUnit, error)
	ListElectionGroupWardStatsByGroup(ctx context.Context, arg queries.ListElectionGroupWardStatsByGroupParams) ([]queries.ElectionGroupWard, error)
	ListElectionGroupLGAStatsByGroup(ctx context.Context, arg queries.ListElectionGroupLGAStatsByGroupParams) ([]queries.ElectionGroupLga, error)
	ListElectionGroupStateConstituencyStatsByGroup(ctx context.Context, arg queries.ListElectionGroupStateConstituencyStatsByGroupParams) ([]queries.ElectionGroupStateConstituency, error)
	ListElectionGroupFederalConstituencyStatsByGroup(ctx context.Context, arg queries.ListElectionGroupFederalConstituencyStatsByGroupParams) ([]queries.ElectionGroupFederalConstituency, error)
	ListElectionGroupSenatorialDistrictStatsByGroup(ctx context.Context, arg queries.ListElectionGroupSenatorialDistrictStatsByGroupParams) ([]queries.ElectionGroupSenatorialDistrict, error)
	ListElectionGroupStateStatsByGroup(ctx context.Context, electionGroupID int64) ([]queries.ElectionGroupState, error)
	GetElectionGroupStateStats(ctx context.Context, arg queries.GetElectionGroupStateStatsParams) (queries.ElectionGroupState, error)
	GetElectionGroupLGAStats(ctx context.Context, arg queries.GetElectionGroupLGAStatsParams) (queries.ElectionGroupLga, error)
	GetElectionGroupWardStats(ctx context.Context, arg queries.GetElectionGroupWardStatsParams) (queries.ElectionGroupWard, error)
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

func (s *Service) ListElectionGroupWardStatsByGroup(ctx context.Context, arg queries.ListElectionGroupWardStatsByGroupParams) ([]queries.ElectionGroupWard, error) {
	return s.queries.ListElectionGroupWardStatsByGroup(ctx, arg)
}

func (s *Service) ListElectionGroupLGAStatsByGroup(ctx context.Context, arg queries.ListElectionGroupLGAStatsByGroupParams) ([]queries.ElectionGroupLga, error) {
	return s.queries.ListElectionGroupLGAStatsByGroup(ctx, arg)
}

func (s *Service) ListElectionGroupStateConstituencyStatsByGroup(ctx context.Context, arg queries.ListElectionGroupStateConstituencyStatsByGroupParams) ([]queries.ElectionGroupStateConstituency, error) {
	return s.queries.ListElectionGroupStateConstituencyStatsByGroup(ctx, arg)
}

func (s *Service) ListElectionGroupFederalConstituencyStatsByGroup(ctx context.Context, arg queries.ListElectionGroupFederalConstituencyStatsByGroupParams) ([]queries.ElectionGroupFederalConstituency, error) {
	return s.queries.ListElectionGroupFederalConstituencyStatsByGroup(ctx, arg)
}

func (s *Service) ListElectionGroupSenatorialDistrictStatsByGroup(ctx context.Context, arg queries.ListElectionGroupSenatorialDistrictStatsByGroupParams) ([]queries.ElectionGroupSenatorialDistrict, error) {
	return s.queries.ListElectionGroupSenatorialDistrictStatsByGroup(ctx, arg)
}

func (s *Service) ListElectionGroupStateStatsByGroup(ctx context.Context, electionGroupID int64) ([]queries.ElectionGroupState, error) {
	return s.queries.ListElectionGroupStateStatsByGroup(ctx, electionGroupID)
}

func (s *Service) GetElectionGroupStateStats(ctx context.Context, arg queries.GetElectionGroupStateStatsParams) (queries.ElectionGroupState, error) {
	return s.queries.GetElectionGroupStateStats(ctx, arg)
}

func (s *Service) GetElectionGroupLGAStats(ctx context.Context, arg queries.GetElectionGroupLGAStatsParams) (queries.ElectionGroupLga, error) {
	return s.queries.GetElectionGroupLGAStats(ctx, arg)
}

func (s *Service) GetElectionGroupWardStats(ctx context.Context, arg queries.GetElectionGroupWardStatsParams) (queries.ElectionGroupWard, error) {
	return s.queries.GetElectionGroupWardStats(ctx, arg)
}
