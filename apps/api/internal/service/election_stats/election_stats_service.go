package electionstats

import (
	"context"
	"free9ja/api/internal/db/queries"
)

type ElectionStatsService interface {
	ListElectionPollingUnitStatsByGroup(ctx context.Context, arg queries.ListElectionPollingUnitStatsByGroupParams) ([]queries.ElectionPollingUnit, error)
	ListElectionWardStatsByGroup(ctx context.Context, arg queries.ListElectionWardStatsByGroupParams) ([]queries.ElectionWard, error)
	ListElectionLGAStatsByGroup(ctx context.Context, arg queries.ListElectionLGAStatsByGroupParams) ([]queries.ElectionLga, error)
	ListElectionStateConstituencyStatsByGroup(ctx context.Context, arg queries.ListElectionStateConstituencyStatsByGroupParams) ([]queries.ElectionStateConstituency, error)
	ListElectionFederalConstituencyStatsByGroup(ctx context.Context, arg queries.ListElectionFederalConstituencyStatsByGroupParams) ([]queries.ElectionFederalConstituency, error)
	ListElectionSenatorialDistrictStatsByGroup(ctx context.Context, arg queries.ListElectionSenatorialDistrictStatsByGroupParams) ([]queries.ElectionSenatorialDistrict, error)
	ListElectionStateStatsByGroup(ctx context.Context, electionGroupID int64) ([]queries.ElectionState, error)
}

type Service struct {
	queries *queries.Queries
}

func NewElectionStatsService(q *queries.Queries) ElectionStatsService {
	return &Service{
		queries: q,
	}
}

func (s *Service) ListElectionPollingUnitStatsByGroup(ctx context.Context, arg queries.ListElectionPollingUnitStatsByGroupParams) ([]queries.ElectionPollingUnit, error) {
	return s.queries.ListElectionPollingUnitStatsByGroup(ctx, arg)
}

func (s *Service) ListElectionWardStatsByGroup(ctx context.Context, arg queries.ListElectionWardStatsByGroupParams) ([]queries.ElectionWard, error) {
	return s.queries.ListElectionWardStatsByGroup(ctx, arg)
}

func (s *Service) ListElectionLGAStatsByGroup(ctx context.Context, arg queries.ListElectionLGAStatsByGroupParams) ([]queries.ElectionLga, error) {
	return s.queries.ListElectionLGAStatsByGroup(ctx, arg)
}

func (s *Service) ListElectionStateConstituencyStatsByGroup(ctx context.Context, arg queries.ListElectionStateConstituencyStatsByGroupParams) ([]queries.ElectionStateConstituency, error) {
	return s.queries.ListElectionStateConstituencyStatsByGroup(ctx, arg)
}

func (s *Service) ListElectionFederalConstituencyStatsByGroup(ctx context.Context, arg queries.ListElectionFederalConstituencyStatsByGroupParams) ([]queries.ElectionFederalConstituency, error) {
	return s.queries.ListElectionFederalConstituencyStatsByGroup(ctx, arg)
}

func (s *Service) ListElectionSenatorialDistrictStatsByGroup(ctx context.Context, arg queries.ListElectionSenatorialDistrictStatsByGroupParams) ([]queries.ElectionSenatorialDistrict, error) {
	return s.queries.ListElectionSenatorialDistrictStatsByGroup(ctx, arg)
}

func (s *Service) ListElectionStateStatsByGroup(ctx context.Context, electionGroupID int64) ([]queries.ElectionState, error) {
	return s.queries.ListElectionStateStatsByGroup(ctx, electionGroupID)
}
