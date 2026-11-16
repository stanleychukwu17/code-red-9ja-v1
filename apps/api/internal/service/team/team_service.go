package teamservice

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"

	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
)

const teamCacheTTL = db.RedisOneHourTTL

// Team member representation for directory listings
type TeamMemberItem struct {
	ID              int64  `json:"id"`
	UserID          int64  `json:"user_id"`
	UserName        string `json:"user_name"`
	AvatarUrl       string `json:"avatar_url"`
	RoleType        string `json:"role_type"`
	StateName       string `json:"state_name"`
	LgaName         string `json:"lga_name"`
	WardName        string `json:"ward_name"`
	PollingUnitName string `json:"polling_unit_name"`
	PollingUnitCode string `json:"polling_unit_code"`
	StateID         int16  `json:"state_id"`
	LgaID           int32  `json:"lga_id"`
	WardID          int32  `json:"ward_id"`
	PollingUnitID   int32  `json:"polling_unit_id"`
}

// Team service managing team roster retrieval
type Service struct {
	queries *queries.Queries
	rdb     *redis.Client
}

// Instantiates a new team service
func NewService(q *queries.Queries, rdb *redis.Client) *Service {
	return &Service{queries: q, rdb: rdb}
}

// Query polling unit agents with territory boundaries
func (s *Service) GetPollingAgents(ctx context.Context, partyID int16, electionGroupID int32, stateID int16, lgaID int32, wardID int32, pollingUnitID int32) ([]TeamMemberItem, error) {
	if pollingUnitID > 0 {
		// Check cache
		cacheKey := fmt.Sprintf("%s%d:%d:pu:%d", db.RedisTeamAgents, electionGroupID, partyID, pollingUnitID)
		if cached, ok := utils.GetCachedJSON[[]TeamMemberItem](ctx, s.rdb, cacheKey); ok {
			return cached, nil
		}

		// Fetch agents by polling unit
		rows, err := s.queries.GetTeamPollingAgentsByPollingUnit(ctx, queries.GetTeamPollingAgentsByPollingUnitParams{
			ElectionGroupID: electionGroupID,
			PartyID:         partyID,
			PollingUnitID:   pollingUnitID,
		})
		if err != nil {
			return nil, err
		}

		// Map database rows to response items
		items := make([]TeamMemberItem, 0, len(rows))
		for _, r := range rows {
			items = append(items, TeamMemberItem{
				ID:              r.ID,
				UserID:          r.UserID,
				UserName:        r.UserName,
				AvatarUrl:       r.AvatarUrl,
				RoleType:        r.RoleType.String,
				StateName:       r.StateName,
				LgaName:         r.LgaName,
				WardName:        r.WardName,
				PollingUnitName: r.PollingUnitName,
				PollingUnitCode: r.PollingUnitCode,
				StateID:         r.StateID,
				LgaID:           r.LgaID,
				WardID:          r.WardID,
				PollingUnitID:   r.PollingUnitID,
			})
		}

		// Cache results
		_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, items, teamCacheTTL)
		return items, nil
	}

	if wardID > 0 {
		// Check cache
		cacheKey := fmt.Sprintf("%s%d:%d:ward:%d", db.RedisTeamAgents, electionGroupID, partyID, wardID)
		if cached, ok := utils.GetCachedJSON[[]TeamMemberItem](ctx, s.rdb, cacheKey); ok {
			return cached, nil
		}

		// Fetch agents by ward
		rows, err := s.queries.GetTeamPollingAgentsByWard(ctx, queries.GetTeamPollingAgentsByWardParams{
			ElectionGroupID: electionGroupID,
			PartyID:         partyID,
			StateID:         stateID,
			LgaID:           lgaID,
			WardID:          wardID,
		})
		if err != nil {
			return nil, err
		}

		// Map database rows to response items
		items := make([]TeamMemberItem, 0, len(rows))
		for _, r := range rows {
			items = append(items, TeamMemberItem{
				ID:              r.ID,
				UserID:          r.UserID,
				UserName:        r.UserName,
				AvatarUrl:       r.AvatarUrl,
				RoleType:        r.RoleType.String,
				StateName:       r.StateName,
				LgaName:         r.LgaName,
				WardName:        r.WardName,
				PollingUnitName: r.PollingUnitName,
				PollingUnitCode: r.PollingUnitCode,
				StateID:         r.StateID,
				LgaID:           r.LgaID,
				WardID:          r.WardID,
				PollingUnitID:   r.PollingUnitID,
			})
		}

		// Cache results
		_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, items, teamCacheTTL)
		return items, nil
	}

	// Polling agents are restricted to ward or polling unit scope
	return []TeamMemberItem{}, nil
}

// Query ward election supervisors with territory boundaries
func (s *Service) GetWardSupervisors(ctx context.Context, partyID int16, electionGroupID int32, stateID int16, lgaID int32, wardID int32) ([]TeamMemberItem, error) {
	if wardID > 0 {
		cacheKey := fmt.Sprintf("%s%d:%d:ward:%d", db.RedisTeamWardSupervisor, electionGroupID, partyID, wardID)
		if cached, ok := utils.GetCachedJSON[[]TeamMemberItem](ctx, s.rdb, cacheKey); ok {
			return cached, nil
		}

		rows, err := s.queries.GetTeamWardSupervisorsByWard(ctx, queries.GetTeamWardSupervisorsByWardParams{
			ElectionGroupID: electionGroupID,
			PartyID:         partyID,
			WardID:          wardID,
		})
		if err != nil {
			return nil, err
		}

		items := make([]TeamMemberItem, 0, len(rows))
		for _, r := range rows {
			items = append(items, TeamMemberItem{
				ID:              r.ID,
				UserID:          r.UserID,
				UserName:        r.UserName,
				AvatarUrl:       r.AvatarUrl,
				RoleType:        r.RoleType.String,
				StateName:       r.StateName,
				LgaName:         r.LgaName,
				WardName:        r.WardName,
				PollingUnitName: r.PollingUnitName,
				PollingUnitCode: r.PollingUnitCode,
				StateID:         r.StateID,
				LgaID:           r.LgaID,
				WardID:          r.WardID,
				PollingUnitID:   r.PollingUnitID,
			})
		}

		_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, items, teamCacheTTL)
		return items, nil
	}

	if lgaID > 0 {
		cacheKey := fmt.Sprintf("%s%d:%d:lga:%d", db.RedisTeamWardSupervisor, electionGroupID, partyID, lgaID)
		if cached, ok := utils.GetCachedJSON[[]TeamMemberItem](ctx, s.rdb, cacheKey); ok {
			return cached, nil
		}

		rows, err := s.queries.GetTeamWardSupervisorsByLga(ctx, queries.GetTeamWardSupervisorsByLgaParams{
			ElectionGroupID: electionGroupID,
			PartyID:         partyID,
			StateID:         stateID,
			LgaID:           lgaID,
		})
		if err != nil {
			return nil, err
		}

		items := make([]TeamMemberItem, 0, len(rows))
		for _, r := range rows {
			items = append(items, TeamMemberItem{
				ID:              r.ID,
				UserID:          r.UserID,
				UserName:        r.UserName,
				AvatarUrl:       r.AvatarUrl,
				RoleType:        r.RoleType.String,
				StateName:       r.StateName,
				LgaName:         r.LgaName,
				WardName:        r.WardName,
				PollingUnitName: r.PollingUnitName,
				PollingUnitCode: r.PollingUnitCode,
				StateID:         r.StateID,
				LgaID:           r.LgaID,
				WardID:          r.WardID,
				PollingUnitID:   r.PollingUnitID,
			})
		}

		_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, items, teamCacheTTL)
		return items, nil
	}

	cacheKey := fmt.Sprintf("%s%d:%d:state:%d", db.RedisTeamWardSupervisor, electionGroupID, partyID, stateID)
	if cached, ok := utils.GetCachedJSON[[]TeamMemberItem](ctx, s.rdb, cacheKey); ok {
		return cached, nil
	}

	rows, err := s.queries.GetTeamWardSupervisorsByState(ctx, queries.GetTeamWardSupervisorsByStateParams{
		ElectionGroupID: electionGroupID,
		PartyID:         partyID,
		StateID:         stateID,
	})
	if err != nil {
		return nil, err
	}
	items := make([]TeamMemberItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, TeamMemberItem{
			ID:              r.ID,
			UserID:          r.UserID,
			UserName:        r.UserName,
			AvatarUrl:       r.AvatarUrl,
			RoleType:        r.RoleType.String,
			StateName:       r.StateName,
			LgaName:         r.LgaName,
			WardName:        r.WardName,
			PollingUnitName: r.PollingUnitName,
			PollingUnitCode: r.PollingUnitCode,
			StateID:         r.StateID,
			LgaID:           r.LgaID,
			WardID:          r.WardID,
			PollingUnitID:   r.PollingUnitID,
		})
	}
	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, items, teamCacheTTL)
	return items, nil
}

// Query LGA election supervisors with territory boundaries
func (s *Service) GetLgaSupervisors(ctx context.Context, partyID int16, electionGroupID int32, stateID int16, lgaID int32) ([]TeamMemberItem, error) {
	if lgaID > 0 {
		cacheKey := fmt.Sprintf("%s%d:%d:lga:%d", db.RedisTeamLgaSupervisor, electionGroupID, partyID, lgaID)
		if cached, ok := utils.GetCachedJSON[[]TeamMemberItem](ctx, s.rdb, cacheKey); ok {
			return cached, nil
		}

		rows, err := s.queries.GetTeamLgaSupervisorsByLga(ctx, queries.GetTeamLgaSupervisorsByLgaParams{
			ElectionGroupID: electionGroupID,
			PartyID:         partyID,
			LgaID:           lgaID,
		})
		if err != nil {
			return nil, err
		}

		items := make([]TeamMemberItem, 0, len(rows))
		for _, r := range rows {
			items = append(items, TeamMemberItem{
				ID:              r.ID,
				UserID:          r.UserID,
				UserName:        r.UserName,
				AvatarUrl:       r.AvatarUrl,
				RoleType:        r.RoleType.String,
				StateName:       r.StateName,
				LgaName:         r.LgaName,
				WardName:        r.WardName,
				PollingUnitName: r.PollingUnitName,
				PollingUnitCode: r.PollingUnitCode,
				StateID:         r.StateID,
				LgaID:           r.LgaID,
				WardID:          r.WardID,
				PollingUnitID:   r.PollingUnitID,
			})
		}
		_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, items, teamCacheTTL)
		return items, nil
	}

	cacheKey := fmt.Sprintf("%s%d:%d:state:%d", db.RedisTeamLgaSupervisor, electionGroupID, partyID, stateID)
	if cached, ok := utils.GetCachedJSON[[]TeamMemberItem](ctx, s.rdb, cacheKey); ok {
		return cached, nil
	}

	rows, err := s.queries.GetTeamLgaSupervisorsByState(ctx, queries.GetTeamLgaSupervisorsByStateParams{
		ElectionGroupID: electionGroupID,
		PartyID:         partyID,
		StateID:         stateID,
	})
	if err != nil {
		return nil, err
	}

	items := make([]TeamMemberItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, TeamMemberItem{
			ID:              r.ID,
			UserID:          r.UserID,
			UserName:        r.UserName,
			AvatarUrl:       r.AvatarUrl,
			RoleType:        r.RoleType.String,
			StateName:       r.StateName,
			LgaName:         r.LgaName,
			WardName:        r.WardName,
			PollingUnitName: r.PollingUnitName,
			PollingUnitCode: r.PollingUnitCode,
			StateID:         r.StateID,
			LgaID:           r.LgaID,
			WardID:          r.WardID,
			PollingUnitID:   r.PollingUnitID,
		})
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, items, teamCacheTTL)
	return items, nil
}

// Query state election supervisors with territory boundaries
func (s *Service) GetStateSupervisors(ctx context.Context, partyID int16, electionGroupID int32, stateID int16) ([]TeamMemberItem, error) {
	cacheKey := fmt.Sprintf("%s%d:%d:state:%d", db.RedisTeamStateSupervisor, electionGroupID, partyID, stateID)
	if cached, ok := utils.GetCachedJSON[[]TeamMemberItem](ctx, s.rdb, cacheKey); ok {
		return cached, nil
	}

	rows, err := s.queries.GetTeamStateSupervisorsByState(ctx, queries.GetTeamStateSupervisorsByStateParams{
		ElectionGroupID: electionGroupID,
		PartyID:         partyID,
		StateID:         stateID,
	})
	if err != nil {
		return nil, err
	}

	items := make([]TeamMemberItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, TeamMemberItem{
			ID:              r.ID,
			UserID:          r.UserID,
			UserName:        r.UserName,
			AvatarUrl:       r.AvatarUrl,
			RoleType:        r.RoleType.String,
			StateName:       r.StateName,
			LgaName:         r.LgaName,
			WardName:        r.WardName,
			PollingUnitName: r.PollingUnitName,
			PollingUnitCode: r.PollingUnitCode,
			StateID:         r.StateID,
			LgaID:           r.LgaID,
			WardID:          r.WardID,
			PollingUnitID:   r.PollingUnitID,
		})
	}

	_ = utils.SetCachedJSON(ctx, s.rdb, cacheKey, items, teamCacheTTL)
	return items, nil
}
