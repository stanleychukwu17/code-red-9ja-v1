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
	GetElectionGroupFederalConstituencyStats(ctx context.Context, arg queries.GetElectionGroupFederalConstituencyStatsParams) (queries.ElectionGroupFederalConstituency, error)
	GetElectionGroupStateConstituencyStats(ctx context.Context, arg queries.GetElectionGroupStateConstituencyStatsParams) (queries.ElectionGroupStateConstituency, error)
	GetElectionGroupSenatorialDistrictStats(ctx context.Context, arg queries.GetElectionGroupSenatorialDistrictStatsParams) (queries.ElectionGroupSenatorialDistrict, error)
	GetElectionGroupByID(ctx context.Context, id int64) (queries.ElectionGroup, error)
	GetStateByID(ctx context.Context, id int16) (queries.CState, error)
	GetLGAByID(ctx context.Context, id int32) (queries.Lga, error)
	GetWardByID(ctx context.Context, id int32) (queries.Ward, error)
	GetSenatorialDistrictByID(ctx context.Context, id int32) (queries.SenatorialDistrict, error)
	GetFederalConstituencyByID(ctx context.Context, id int32) (queries.FederalConstituency, error)
	GetStateAssemblyConstituencyByID(ctx context.Context, id int32) (queries.StateAssemblyConstituency, error)
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

func (s *Service) GetElectionGroupFederalConstituencyStats(ctx context.Context, arg queries.GetElectionGroupFederalConstituencyStatsParams) (queries.ElectionGroupFederalConstituency, error) {
	return s.queries.GetElectionGroupFederalConstituencyStats(ctx, arg)
}

func (s *Service) GetElectionGroupStateConstituencyStats(ctx context.Context, arg queries.GetElectionGroupStateConstituencyStatsParams) (queries.ElectionGroupStateConstituency, error) {
	return s.queries.GetElectionGroupStateConstituencyStats(ctx, arg)
}

func (s *Service) GetElectionGroupSenatorialDistrictStats(ctx context.Context, arg queries.GetElectionGroupSenatorialDistrictStatsParams) (queries.ElectionGroupSenatorialDistrict, error) {
	return s.queries.GetElectionGroupSenatorialDistrictStats(ctx, arg)
}

func (s *Service) GetElectionGroupByID(ctx context.Context, id int64) (queries.ElectionGroup, error) {
	return s.queries.GetElectionGroupByID(ctx, id)
}

func (s *Service) GetStateByID(ctx context.Context, id int16) (queries.CState, error) {
	return s.queries.GetStateDetailsByID(ctx, id)
}

func (s *Service) GetLGAByID(ctx context.Context, id int32) (queries.Lga, error) {
	return s.queries.GetLGAByID(ctx, id)
}

func (s *Service) GetWardByID(ctx context.Context, id int32) (queries.Ward, error) {
	return s.queries.GetWardByID(ctx, id)
}

func (s *Service) GetSenatorialDistrictByID(ctx context.Context, id int32) (queries.SenatorialDistrict, error) {
	return s.queries.GetSenatorialDistrictByID(ctx, id)
}

func (s *Service) GetFederalConstituencyByID(ctx context.Context, id int32) (queries.FederalConstituency, error) {
	return s.queries.GetFederalConstituencyByID(ctx, id)
}

func (s *Service) GetStateAssemblyConstituencyByID(ctx context.Context, id int32) (queries.StateAssemblyConstituency, error) {
	return s.queries.GetStateAssemblyConstituencyByID(ctx, id)
}
