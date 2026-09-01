package bodiesservice

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"free9ja/api/internal/db/queries"

	"github.com/jackc/pgx/v5/pgtype"
)

const inecBaseURL = "https://dolphin-app-sleqh.ondigitalocean.app/api/v1"

func cleanStr(s string) string {
	s = strings.TrimSpace(s)
	s = strings.Trim(s, `"'\`)
	return strings.TrimSpace(s)
}

type SyncReport struct {
	StatesProcessed                int     `json:"states_processed"`
	SenatorialDistrictsProcessed   int     `json:"senatorial_districts_processed"`
	SenatorialDistrictsDeactivated int     `json:"senatorial_districts_deactivated"`
	FederalConstituenciesProcessed int     `json:"federal_constituencies_processed"`
	FederalConstituenciesDeactivated int `json:"federal_constituencies_deactivated"`
	LGAsProcessed                  int     `json:"lgas_processed"`
	LGAsDeactivated                int     `json:"lgas_deactivated"`
	StateConstituenciesProcessed   int     `json:"state_constituencies_processed"`
	StateConstituenciesDeactivated int     `json:"state_constituencies_deactivated"`
	WardsProcessed                 int     `json:"wards_processed"`
	WardsDeactivated               int     `json:"wards_deactivated"`
	PollingUnitsProcessed          int     `json:"polling_units_processed"`
	PollingUnitsDeactivated        int     `json:"polling_units_deactivated"`
	DurationSeconds                float64 `json:"duration_seconds"`
}

type inecState struct {
	ID      int32  `json:"state_id"`
	Name    string `json:"name"`
	Code    string `json:"code"`
	Status  string `json:"status"`
	MongoID string `json:"_id"`
}

type inecSenatorialDomain struct {
	ID      int32  `json:"senatorial_district_id"`
	Name    string `json:"name"`
	Code    string `json:"code"`
	Status  string `json:"status"`
	StateID int32  `json:"state_id"`
}

type inecSenatorialItem struct {
	Domain inecSenatorialDomain `json:"domain"`
	State  inecState            `json:"state"`
}

type inecFederalDomain struct {
	ID                   int32  `json:"federal_constituency_id"`
	Name                 string `json:"name"`
	Code                 string `json:"code"`
	Status               string `json:"status"`
	StateID              int32  `json:"state_id"`
	SenatorialDistrictID int32  `json:"senatorial_district_id"`
}

type inecFederalItem struct {
	Domain inecFederalDomain `json:"domain"`
	State  inecState         `json:"state"`
}

type inecLGAInfo struct {
	ID      int32  `json:"lga_id"`
	Name    string `json:"name"`
	Code    string `json:"code"`
	Status  string `json:"status"`
	StateID int32  `json:"state_id"`
	MongoID string `json:"_id"`
}

type inecWardInfo struct {
	ID                    int32  `json:"ward_id"`
	MongoID               string `json:"_id"`
	Name                  string `json:"name"`
	Code                  string `json:"code"`
	Status                string `json:"status"`
	StateID               int32  `json:"state_id"`
	LGAID                 int32  `json:"lga_id"`
	SenatorialDistrictID  int32  `json:"senatorial_district_id"`
	FederalConstituencyID int32  `json:"federal_constituency_id"`
	StateConstituencyID   int32  `json:"state_constituency_id"`
}

type inecLGAItem struct {
	LGA   inecLGAInfo    `json:"lga"`
	Wards []inecWardInfo `json:"wards"`
}

type inecStateConstituencyDomain struct {
	ID                   int32  `json:"state_constituency_id"`
	Name                 string `json:"name"`
	Code                 string `json:"code"`
	Status               string `json:"status"`
	StateID              int32  `json:"state_id"`
	LGAID                int32  `json:"lga_id"`
	SenatorialDistrictID int32  `json:"senatorial_district_id"`
	FederalConstituencyID int32 `json:"federal_constituency_id"`
}

type inecStateConstituencyItem struct {
	Domain inecStateConstituencyDomain `json:"domain"`
	State  inecState                   `json:"state"`
}

type inecPUInfo struct {
	ID                    int32   `json:"polling_unit_id"`
	Name                  string  `json:"name"`
	Code                  string  `json:"code"`
	PUCode                string  `json:"pu_code"`
	Status                string  `json:"status"`
	StateID               int32   `json:"state_id"`
	LGAID                 int32   `json:"lga_id"`
	WardID                int32   `json:"ward_id"`
	SenatorialDistrictID  int32   `json:"senatorial_district_id"`
	FederalConstituencyID int32   `json:"federal_constituency_id"`
	StateConstituencyID   int32   `json:"state_constituency_id"`
	Lat                   float64 `json:"lat"`
	Long                  float64 `json:"long"`
}

type inecPUItem struct {
	PollingUnit inecPUInfo `json:"polling_unit"`
}

type scMeta struct {
	lgaID int32
	sdID  int32
	fcID  int32
}

type wardCache struct {
	info      inecWardInfo
	stateID   int32
	stateName string
}

// SyncElectoralUnits orchestrates fetching, updating, creating, and deactivating electoral units across all 6 levels.
func (s *BodiesService) SyncElectoralUnits(ctx context.Context) (*SyncReport, error) {
	syncCtx := context.WithoutCancel(ctx)
	startTime := time.Now()
	report := &SyncReport{}

	client := &http.Client{Timeout: 45 * time.Second}

	// Fetch all states for Nigeria (country_id = 161)
	states, err := s.queries.GetStatesByCountryID(syncCtx, 161)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch states from DB: %w", err)
	}

	report.StatesProcessed = len(states)
	slog.Info("Starting electoral units synchronization", "states_count", len(states))

	// In-memory maps for fast parent name and relation resolution
	sdNameMap := make(map[int32]string)
	fcNameMap := make(map[int32]string)
	lgaNameMap := make(map[int32]string)
	scNameMap := make(map[int32]string)
	wardNameMap := make(map[int32]string)
	wardMongoMap := make(map[int32]string)

	scMetaMap := make(map[int32]scMeta)

	// Pre-populate lookup maps from existing DB tables
	existingSDs, _ := s.queries.GetSenatorialDistricts(syncCtx, 0)
	for _, item := range existingSDs {
		sdNameMap[item.ID] = item.Name
	}
	existingFCs, _ := s.queries.GetFederalConstituencies(syncCtx, queries.GetFederalConstituenciesParams{StateID: 0, SenatorialDistrictID: 0})
	for _, item := range existingFCs {
		fcNameMap[item.ID] = item.Name
	}
	existingLGAs, _ := s.queries.GetLGAs(syncCtx, 0)
	for _, item := range existingLGAs {
		lgaNameMap[item.ID] = item.Name
	}
	existingSCs, _ := s.queries.GetStateConstituencies(syncCtx, queries.GetStateConstituenciesParams{StateID: 0, FederalConstituencyID: 0})
	for _, item := range existingSCs {
		scNameMap[item.ID] = item.Name
	}
	existingWards, _ := s.queries.GetWards(syncCtx, queries.GetWardsParams{LgaID: 0, StateID: 0})
	for _, item := range existingWards {
		wardNameMap[item.ID] = item.Name
	}

	// LEVEL 1: Senatorial Districts
	slog.Info("Syncing Level 1: Senatorial Districts...")
	for _, state := range states {
		urlStr := fmt.Sprintf("%s/elections?election_type=5f129a04df41d910dcdc1d52&state_id=%d", inecBaseURL, state.ID)
		body, err := fetchINECData(syncCtx, client, urlStr)
		if err != nil {
			slog.Warn("Failed to fetch senatorial districts for state", "state_id", state.ID, "error", err)
			continue
		}

		var resp struct {
			Success bool                 `json:"success"`
			Data    []inecSenatorialItem `json:"data"`
		}
		if err := json.Unmarshal(body, &resp); err != nil {
			slog.Warn("Failed to parse senatorial districts JSON", "state_id", state.ID, "error", err)
			continue
		}

		activeIDs := make([]int32, 0)
		for _, item := range resp.Data {
			domain := item.Domain
			if domain.ID == 0 {
				continue
			}

			status := "active"
			if !strings.EqualFold(domain.Status, "ACTIVE") {
				status = "inactive"
			} else {
				activeIDs = append(activeIDs, domain.ID)
			}

			sd, err := s.queries.UpsertSenatorialDistrict(syncCtx, queries.UpsertSenatorialDistrictParams{
				ID:        domain.ID,
				Name:      cleanStr(domain.Name),
				Code:      pgtype.Text{String: domain.Code, Valid: domain.Code != ""},
				StateID:   int32(state.ID),
				StateName: state.Name,
				Status:    pgtype.Text{String: status, Valid: true},
			})
			if err == nil {
				sdNameMap[sd.ID] = sd.Name
				report.SenatorialDistrictsProcessed++
			} else {
				slog.Warn("Failed to upsert senatorial district", "id", domain.ID, "error", err)
			}
		}

		if err := s.queries.DeactivateMissingSenatorialDistricts(syncCtx, queries.DeactivateMissingSenatorialDistrictsParams{
			StateID: int32(state.ID),
			Column2: activeIDs,
		}); err != nil {
			slog.Warn("Failed to deactivate missing senatorial districts", "state_id", state.ID, "error", err)
		}
	}

	// LEVEL 2: Federal Constituencies
	slog.Info("Syncing Level 2: Federal Constituencies...")
	for _, state := range states {
		urlStr := fmt.Sprintf("%s/elections?election_type=5f129a04df41d910dcdc1d53&state_id=%d", inecBaseURL, state.ID)
		body, err := fetchINECData(syncCtx, client, urlStr)
		if err != nil {
			slog.Warn("Failed to fetch federal constituencies for state", "state_id", state.ID, "error", err)
			continue
		}

		var resp struct {
			Success bool              `json:"success"`
			Data    []inecFederalItem `json:"data"`
		}
		if err := json.Unmarshal(body, &resp); err != nil {
			slog.Warn("Failed to parse federal constituencies JSON", "state_id", state.ID, "error", err)
			continue
		}

		activeIDs := make([]int32, 0)
		for _, item := range resp.Data {
			domain := item.Domain
			if domain.ID == 0 {
				continue
			}

			status := "active"
			if !strings.EqualFold(domain.Status, "ACTIVE") {
				status = "inactive"
			} else {
				activeIDs = append(activeIDs, domain.ID)
			}

			sdName := sdNameMap[domain.SenatorialDistrictID]

			fc, err := s.queries.UpsertFederalConstituency(syncCtx, queries.UpsertFederalConstituencyParams{
				ID:                     domain.ID,
				Name:                   cleanStr(domain.Name),
				Code:                   pgtype.Text{String: domain.Code, Valid: domain.Code != ""},
				StateID:                int32(state.ID),
				StateName:              state.Name,
				SenatorialDistrictID:   pgtype.Int4{Int32: domain.SenatorialDistrictID, Valid: domain.SenatorialDistrictID > 0},
				SenatorialDistrictName: pgtype.Text{String: sdName, Valid: sdName != ""},
				Status:                 pgtype.Text{String: status, Valid: true},
			})
			if err == nil {
				fcNameMap[fc.ID] = fc.Name
				report.FederalConstituenciesProcessed++
			} else {
				slog.Warn("Failed to upsert federal constituency", "id", domain.ID, "error", err)
			}
		}

		if err := s.queries.DeactivateMissingFederalConstituencies(syncCtx, queries.DeactivateMissingFederalConstituenciesParams{
			StateID: int32(state.ID),
			Column2: activeIDs,
		}); err != nil {
			slog.Warn("Failed to deactivate missing federal constituencies", "state_id", state.ID, "error", err)
		}
	}

	// LEVEL 3: LGAs
	slog.Info("Syncing Level 3: LGAs...")
	var pendingWards []wardCache

	for _, state := range states {
		urlStr := fmt.Sprintf("%s/elections/63f8f25b594e164f8146a213/lga/state/%d", inecBaseURL, state.ID)
		body, err := fetchINECData(syncCtx, client, urlStr)
		if err != nil {
			slog.Warn("Failed to fetch LGAs for state", "state_id", state.ID, "error", err)
			continue
		}

		var resp struct {
			Success bool          `json:"success"`
			Data    []inecLGAItem `json:"data"`
		}
		if err := json.Unmarshal(body, &resp); err != nil {
			slog.Warn("Failed to parse LGAs JSON", "state_id", state.ID, "error", err)
			continue
		}

		activeLGAIDs := make([]int32, 0)
		for _, item := range resp.Data {
			lgaInfo := item.LGA
			if lgaInfo.ID == 0 {
				continue
			}

			lgaStatus := "active"
			if !strings.EqualFold(lgaInfo.Status, "ACTIVE") {
				lgaStatus = "inactive"
			} else {
				activeLGAIDs = append(activeLGAIDs, lgaInfo.ID)
			}

			var sdID, fcID int32
			for _, ward := range item.Wards {
				if ward.SenatorialDistrictID > 0 && sdID == 0 {
					sdID = ward.SenatorialDistrictID
				}
				if ward.FederalConstituencyID > 0 && fcID == 0 {
					fcID = ward.FederalConstituencyID
				}

				if ward.StateConstituencyID > 0 {
					scMetaMap[ward.StateConstituencyID] = scMeta{
						lgaID: lgaInfo.ID,
						sdID:  ward.SenatorialDistrictID,
						fcID:  ward.FederalConstituencyID,
					}
				}

				if ward.ID > 0 && ward.MongoID != "" {
					wardMongoMap[ward.ID] = ward.MongoID
				}

				pendingWards = append(pendingWards, wardCache{
					info:      ward,
					stateID:   int32(state.ID),
					stateName: state.Name,
				})
			}

			sdName := sdNameMap[sdID]
			fcName := fcNameMap[fcID]

			lga, err := s.queries.UpsertLGA(syncCtx, queries.UpsertLGAParams{
				ID:                      lgaInfo.ID,
				Name:                    cleanStr(lgaInfo.Name),
				Code:                    lgaInfo.Code,
				StateID:                 int32(state.ID),
				StateName:               state.Name,
				SenatorialDistrictID:    pgtype.Int4{Int32: sdID, Valid: sdID > 0},
				SenatorialDistrictName:  pgtype.Text{String: sdName, Valid: sdName != ""},
				FederalConstituencyID:   pgtype.Int4{Int32: fcID, Valid: fcID > 0},
				FederalConstituencyName: pgtype.Text{String: fcName, Valid: fcName != ""},
				Status:                  pgtype.Text{String: lgaStatus, Valid: true},
			})
			if err == nil {
				lgaNameMap[lga.ID] = lga.Name
				report.LGAsProcessed++
			} else {
				slog.Warn("Failed to upsert LGA", "lga_id", lgaInfo.ID, "error", err)
			}
		}

		if err := s.queries.DeactivateMissingLGAs(syncCtx, queries.DeactivateMissingLGAsParams{
			StateID: int32(state.ID),
			Column2: activeLGAIDs,
		}); err != nil {
			slog.Warn("Failed to deactivate missing LGAs", "state_id", state.ID, "error", err)
		}
	}

	// Backfill missing Senatorial District references on Federal Constituencies using LGA mapping
	slog.Info("Backfilling missing Senatorial District references for Federal Constituencies...")
	if err := s.queries.UpdateMissingFederalConstituencySenatorialDistricts(syncCtx); err != nil {
		slog.Warn("Failed to backfill missing senatorial district references on federal constituencies", "error", err)
	}

	// LEVEL 4: State Constituencies
	slog.Info("Syncing Level 4: State Constituencies...")
	for _, state := range states {
		urlStr := fmt.Sprintf("%s/elections?election_type=5f129a04df41d910dcdc1d54&state_id=%d", inecBaseURL, state.ID)
		body, err := fetchINECData(syncCtx, client, urlStr)
		if err != nil {
			slog.Warn("Failed to fetch state constituencies for state", "state_id", state.ID, "error", err)
			continue
		}

		var resp struct {
			Success bool                        `json:"success"`
			Data    []inecStateConstituencyItem `json:"data"`
		}
		if err := json.Unmarshal(body, &resp); err != nil {
			slog.Warn("Failed to parse state constituencies JSON", "state_id", state.ID, "error", err)
			continue
		}

		activeIDs := make([]int32, 0)
		for _, item := range resp.Data {
			domain := item.Domain
			if domain.ID == 0 {
				continue
			}

			status := "active"
			if !strings.EqualFold(domain.Status, "ACTIVE") {
				status = "inactive"
			} else {
				activeIDs = append(activeIDs, domain.ID)
			}

			meta := scMetaMap[domain.ID]
			lgaID := meta.lgaID

			// Fallback: If lgaID wasn't mapped via Wards, pick an LGA from the state to avoid NOT NULL FK violation
			if lgaID == 0 {
				for lID, lName := range lgaNameMap {
					if lID > 0 && lName != "" {
						lgaID = lID
						break
					}
				}
			}

			lgaName := lgaNameMap[lgaID]
			sdID := meta.sdID
			if sdID == 0 {
				sdID = domain.SenatorialDistrictID
			}
			sdName := sdNameMap[sdID]

			fcID := meta.fcID
			if fcID == 0 {
				fcID = domain.FederalConstituencyID
			}
			fcName := fcNameMap[fcID]

			sc, err := s.queries.UpsertStateConstituency(syncCtx, queries.UpsertStateConstituencyParams{
				ID:                      domain.ID,
				Name:                    cleanStr(domain.Name),
				Code:                    pgtype.Text{String: domain.Code, Valid: domain.Code != ""},
				LgaID:                   lgaID,
				LgaName:                 lgaName,
				StateID:                 int32(state.ID),
				StateName:               state.Name,
				SenatorialDistrictID:    pgtype.Int4{Int32: sdID, Valid: sdID > 0},
				SenatorialDistrictName:  pgtype.Text{String: sdName, Valid: sdName != ""},
				FederalConstituencyID:   pgtype.Int4{Int32: fcID, Valid: fcID > 0},
				FederalConstituencyName: pgtype.Text{String: fcName, Valid: fcName != ""},
				Status:                  pgtype.Text{String: status, Valid: true},
			})
			if err == nil {
				scNameMap[sc.ID] = sc.Name
				report.StateConstituenciesProcessed++
			} else {
				slog.Warn("Failed to upsert state constituency", "id", domain.ID, "state_id", state.ID, "lga_id", lgaID, "error", err)
			}
		}

		if err := s.queries.DeactivateMissingStateConstituencies(syncCtx, queries.DeactivateMissingStateConstituenciesParams{
			StateID: int32(state.ID),
			Column2: activeIDs,
		}); err != nil {
			slog.Warn("Failed to deactivate missing state constituencies", "state_id", state.ID, "error", err)
		}
	}

	// LEVEL 5: Wards
	slog.Info("Syncing Level 5: Wards...")
	activeWardIDsByLGA := make(map[int32][]int32)

	for _, wItem := range pendingWards {
		wardInfo := wItem.info
		if wardInfo.ID == 0 {
			continue
		}

		wardStatus := "active"
		if !strings.EqualFold(wardInfo.Status, "ACTIVE") {
			wardStatus = "inactive"
		} else {
			activeWardIDsByLGA[wardInfo.LGAID] = append(activeWardIDsByLGA[wardInfo.LGAID], wardInfo.ID)
		}

		wLgaName := lgaNameMap[wardInfo.LGAID]
		wSdName := sdNameMap[wardInfo.SenatorialDistrictID]
		wFcName := fcNameMap[wardInfo.FederalConstituencyID]
		wScName := scNameMap[wardInfo.StateConstituencyID]

		ward, err := s.queries.UpsertWard(syncCtx, queries.UpsertWardParams{
			ID:                      wardInfo.ID,
			Name:                    cleanStr(wardInfo.Name),
			Code:                    wardInfo.Code,
			LgaID:                   wardInfo.LGAID,
			LgaName:                 wLgaName,
			SenatorialDistrictID:    pgtype.Int4{Int32: wardInfo.SenatorialDistrictID, Valid: wardInfo.SenatorialDistrictID > 0 && wSdName != ""},
			SenatorialDistrictName:  pgtype.Text{String: wSdName, Valid: wSdName != ""},
			FederalConstituencyID:   pgtype.Int4{Int32: wardInfo.FederalConstituencyID, Valid: wardInfo.FederalConstituencyID > 0 && wFcName != ""},
			FederalConstituencyName: pgtype.Text{String: wFcName, Valid: wFcName != ""},
			StateConstituencyID:     pgtype.Int4{Int32: wardInfo.StateConstituencyID, Valid: wardInfo.StateConstituencyID > 0 && wScName != ""},
			StateConstituencyName:   pgtype.Text{String: wScName, Valid: wScName != ""},
			StateID:                 wItem.stateID,
			StateName:               wItem.stateName,
			Status:                  pgtype.Text{String: wardStatus, Valid: true},
			MongoID:                 pgtype.Text{String: wardInfo.MongoID, Valid: wardInfo.MongoID != ""},
		})
		if err == nil {
			wardNameMap[ward.ID] = ward.Name
			report.WardsProcessed++
		} else {
			slog.Warn("Failed to upsert ward", "ward_id", wardInfo.ID, "error", err)
		}
	}

	for lgaID, activeWards := range activeWardIDsByLGA {
		if err := s.queries.DeactivateMissingWards(syncCtx, queries.DeactivateMissingWardsParams{
			LgaID:   lgaID,
			Column2: activeWards,
		}); err != nil {
			slog.Warn("Failed to deactivate missing wards for LGA", "lga_id", lgaID, "error", err)
		}
	}

	// LEVEL 6: Polling Units
	slog.Info("Syncing Level 6: Polling Units...")
	allDBWards, err := s.queries.GetWards(syncCtx, queries.GetWardsParams{LgaID: 0, StateID: 0})
	if err != nil {
		slog.Warn("Failed to fetch DB wards for polling unit sync", "error", err)
	} else {
		var wg sync.WaitGroup
		wardChan := make(chan queries.Ward, len(allDBWards))
		for _, w := range allDBWards {
			wardChan <- w
		}
		close(wardChan)

		workers := 8
		var mu sync.Mutex

		for i := 0; i < workers; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for ward := range wardChan {
					wardMongoID := wardMongoMap[ward.ID]
					if wardMongoID == "" && ward.MongoID.Valid {
						wardMongoID = ward.MongoID.String
					}
					if wardMongoID == "" {
						slog.Warn("Skipping PUs fetch: missing mongo_id for ward", "ward_id", ward.ID)
						continue
					}
					urlStr := fmt.Sprintf("%s/elections/63f8f25b594e164f8146a213/pus?ward=%s", inecBaseURL, wardMongoID)
					body, err := fetchINECData(syncCtx, client, urlStr)
					if err != nil {
						slog.Warn("Failed to fetch PUs for ward", "ward_id", ward.ID, "mongo_id", wardMongoID, "error", err)
						continue
					}

					var resp struct {
						Success bool         `json:"success"`
						Data    []inecPUItem `json:"data"`
					}
					if err := json.Unmarshal(body, &resp); err != nil {
						slog.Warn("Failed to parse PUs JSON", "ward_id", ward.ID, "error", err)
						continue
					}

					activePUIDs := make([]int32, 0)
					puCount := 0

					for _, item := range resp.Data {
						pu := item.PollingUnit
						if pu.ID == 0 {
							continue
						}

						status := "active"
						if !strings.EqualFold(pu.Status, "ACTIVE") {
							status = "inactive"
						} else {
							activePUIDs = append(activePUIDs, pu.ID)
						}

						wName := ward.Name
						lName := lgaNameMap[pu.LGAID]
						if lName == "" {
							lName = ward.LgaName
						}
						sName := ward.StateName

						sdID := pu.SenatorialDistrictID
						if sdID == 0 && ward.SenatorialDistrictID.Valid {
							sdID = ward.SenatorialDistrictID.Int32
						}
						sdName := sdNameMap[sdID]
						if sdName == "" {
							sdName = ward.SenatorialDistrictName.String
						}

						fcID := pu.FederalConstituencyID
						if fcID == 0 && ward.FederalConstituencyID.Valid {
							fcID = ward.FederalConstituencyID.Int32
						}
						fcName := fcNameMap[fcID]
						if fcName == "" {
							fcName = ward.FederalConstituencyName.String
						}

						scID := pu.StateConstituencyID
						if scID == 0 && ward.StateConstituencyID.Valid {
							scID = ward.StateConstituencyID.Int32
						}
						scName := scNameMap[scID]
						if scName == "" {
							scName = ward.StateConstituencyName.String
						}

						lgaID := pu.LGAID
						if lgaID == 0 {
							lgaID = ward.LgaID
						}

						_, err := s.queries.UpsertPollingUnit(syncCtx, queries.UpsertPollingUnitParams{
							ID:                      pu.ID,
							Name:                    cleanStr(pu.Name),
							Code:                    pgtype.Text{String: pu.Code, Valid: pu.Code != ""},
							PuCode:                  pgtype.Text{String: pu.PUCode, Valid: pu.PUCode != ""},
							WardID:                  ward.ID,
							WardName:                wName,
							LgaID:                   lgaID,
							LgaName:                 lName,
							SenatorialDistrictID:    pgtype.Int4{Int32: sdID, Valid: sdID > 0 && sdName != ""},
							SenatorialDistrictName:  pgtype.Text{String: sdName, Valid: sdName != ""},
							FederalConstituencyID:   pgtype.Int4{Int32: fcID, Valid: fcID > 0 && fcName != ""},
							FederalConstituencyName: pgtype.Text{String: fcName, Valid: fcName != ""},
							StateConstituencyID:     pgtype.Int4{Int32: scID, Valid: scID > 0 && scName != ""},
							StateConstituencyName:   pgtype.Text{String: scName, Valid: scName != ""},
							StateID:                 ward.StateID,
							StateName:               sName,
							Latitude:                pgtype.Float8{Float64: pu.Lat, Valid: pu.Lat != 0},
							Longitude:               pgtype.Float8{Float64: pu.Long, Valid: pu.Long != 0},
							Status:                  pgtype.Text{String: status, Valid: true},
						})
						if err == nil {
							puCount++
						} else {
							slog.Warn("Failed to upsert PU", "pu_id", pu.ID, "ward_id", ward.ID, "error", err)
						}
					}

					if err := s.queries.DeactivateMissingPollingUnits(syncCtx, queries.DeactivateMissingPollingUnitsParams{
						WardID:  ward.ID,
						Column2: activePUIDs,
					}); err != nil {
						slog.Warn("Failed to deactivate missing polling units", "ward_id", ward.ID, "error", err)
					}

					mu.Lock()
					report.PollingUnitsProcessed += puCount
					mu.Unlock()
				}
			}()
		}
		wg.Wait()
	}

	// STEP 7: Recalculate Metrics across all levels
	slog.Info("Recalculating metrics across all administrative levels...")
	_ = s.queries.RecalculateWardMetrics(syncCtx)
	_ = s.queries.RecalculateStateConstituencyMetrics(syncCtx)
	_ = s.queries.RecalculateLGAMetrics(syncCtx)
	_ = s.queries.RecalculateFederalConstituencyMetrics(syncCtx)
	_ = s.queries.RecalculateSenatorialDistrictMetrics(syncCtx)
	_ = s.queries.RecalculateStateMetrics(syncCtx)
	_ = s.queries.RecalculateNationalMetrics(syncCtx)

	s.invalidateCache(syncCtx, 0)

	report.DurationSeconds = time.Since(startTime).Seconds()
	slog.Info("Electoral units synchronization completed", "duration_seconds", report.DurationSeconds)

	return report, nil
}

func fetchINECData(ctx context.Context, client *http.Client, rawURL string) ([]byte, error) {
	maxRetries := 4
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(500*(1<<(attempt-1))) * time.Millisecond
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(backoff):
			}
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Accept", "application/json")
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")

		resp, err := client.Do(req)
		if err != nil {
			lastErr = err
			slog.Debug("INEC fetch attempt failed, retrying", "url", rawURL, "attempt", attempt+1, "error", err)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = err
			continue
		}

		if resp.StatusCode == http.StatusOK {
			return body, nil
		}

		if resp.StatusCode == http.StatusGatewayTimeout ||
			resp.StatusCode == http.StatusBadGateway ||
			resp.StatusCode == http.StatusServiceUnavailable ||
			resp.StatusCode == http.StatusTooManyRequests ||
			resp.StatusCode >= 500 {
			lastErr = fmt.Errorf("unexpected status code: %d", resp.StatusCode)
			slog.Debug("INEC fetch server error, retrying", "url", rawURL, "status", resp.StatusCode, "attempt", attempt+1)
			continue
		}

		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	return nil, fmt.Errorf("failed after %d attempts: %w", maxRetries, lastErr)
}
