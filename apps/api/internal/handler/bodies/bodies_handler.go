package bodieshandler

import (
	"context"
	"encoding/json"
	"fmt"
	"free9ja/api/internal/constants"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	bodiesservice "free9ja/api/internal/service/bodies"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type BodiesService interface {
	GetOccupations(ctx context.Context) ([]queries.Occupation, error)
	GetAllCountries(ctx context.Context) ([]queries.ListCountriesRow, error)
	GetStatesByCountryID(ctx context.Context, countryID int16) ([]queries.CState, error)
	GetCitiesByStateID(ctx context.Context, stateID int16) ([]queries.GetCitiesByStateIDRow, error)
	GetLGAs(ctx context.Context, stateID int32) ([]queries.Lga, error)
	CreateLGA(ctx context.Context, name string, code string, stateID int32, stateName string, senatorialDistrictID int32, senatorialDistrictName string, federalConstituencyID int32, federalConstituencyName string) (queries.Lga, error)
	GetLGAByID(ctx context.Context, id int32) (queries.Lga, error)
	UpdateLGA(ctx context.Context, id int32, name string, code string, stateID int32, stateName string, senatorialDistrictID int32, senatorialDistrictName string, federalConstituencyID int32, federalConstituencyName string) (queries.Lga, error)
	DeleteLGA(ctx context.Context, id int32) error
	SyncElectoralUnits(ctx context.Context) (*bodiesservice.SyncReport, error)
	SyncElectoralUnitsStateFlow(ctx context.Context) (*bodiesservice.SyncReport, error)
	GetNationalMetrics(ctx context.Context) (queries.NationalMetric, error)
	CheckStateByID(ctx context.Context, stateID int16) (queries.CState, error)
}

type Handler struct {
	bodiesService BodiesService
	queries       *queries.Queries
	utils         *utils.Utils
	rdb           *redis.Client
	pool          *pgxpool.Pool
}

func NewHandler(bodiesService BodiesService, q *queries.Queries, utils *utils.Utils, rdb *redis.Client, pool *pgxpool.Pool) *Handler {
	return &Handler{
		bodiesService: bodiesService,
		queries:       q,
		utils:         utils,
		rdb:           rdb,
		pool:          pool,
	}
}

func parseOptionalQueryInt(r *http.Request, param string) int32 {
	valStr := r.URL.Query().Get(param)
	if valStr == "" {
		return 0
	}
	val, err := strconv.ParseInt(valStr, 10, 32)
	if err != nil {
		return 0
	}
	return int32(val)
}

// GetOccupations handles GET /api/v1/getOccupations (or similar)
func (h *Handler) GetOccupations(w http.ResponseWriter, r *http.Request) {
	occupations, err := h.bodiesService.GetOccupations(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to retrieve occupations: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Occupations retrieved successfully", map[string]interface{}{
		"occupations": occupations,
	})
}

// GetCountries godoc
// @Summary      Get all countries
// @Description  Fetches a list of all countries with their ISO2 codes, phone codes
// @Tags         Bodies
// @Accept       json
// @Produce      json
// @Success      200  {object} GetCountriesResponse
// @Failure      500  {string}  failed to fetch countries
// @Router       /countries [get]
func (h *Handler) GetCountries(w http.ResponseWriter, r *http.Request) {
	countries, err := h.bodiesService.GetAllCountries(r.Context())
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch countries: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Countries fetched successfully", map[string]interface{}{
		"countries": countries,
	})
}

// GetStates godoc
// @Summary      Get states by country ID
// @Description  Fetches all states for a specific country by its ID with cursor pagination
// @Tags         Bodies
// @Accept       json
// @Produce      json
// @Param        countryID  path      int     true   "Country ID"
// @Success      200        {object}  GetStatesResponse
// @Failure      400        {string}  invalid country ID
// @Failure      500        {string}  failed to fetch states
// @Router       /countries/{countryID}/states [get]
func (h *Handler) GetStates(w http.ResponseWriter, r *http.Request) {
	countryIDStr := chi.URLParam(r, "countryID")
	countryID, err := strconv.ParseInt(countryIDStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid country ID: "+err.Error())
		return
	}

	states, err := h.bodiesService.GetStatesByCountryID(r.Context(), int16(countryID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch states: "+err.Error())
		return
	}

	search := strings.TrimSpace(r.URL.Query().Get("search"))
	if search != "" {
		searchLower := strings.ToLower(search)
		var filtered []queries.CState
		for _, s := range states {
			if strings.Contains(strings.ToLower(s.Name), searchLower) {
				filtered = append(filtered, s)
			}
		}
		states = filtered
	}

	h.utils.RespondSuccess(w, http.StatusOK, "States fetched successfully", map[string]interface{}{
		"states": states,
	})
}

// GetCities godoc
// @Summary      Get cities by state ID
// @Description  Fetches all cities for a specific state by its ID
// @Tags         Bodies
// @Accept       json
// @Produce      json
// @Param        stateID    path      int     true   "State ID"
// @Success      200        {object}  GetCitiesResponse
// @Failure      400        {string}  invalid state ID
// @Failure      500        {string}  failed to fetch cities
// @Router       /states/{stateID}/cities [get]
func (h *Handler) GetCities(w http.ResponseWriter, r *http.Request) {
	stateIDStr := chi.URLParam(r, "stateID")
	stateID, err := strconv.ParseInt(stateIDStr, 10, 16)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state ID: "+err.Error())
		return
	}

	cities, err := h.bodiesService.GetCitiesByStateID(r.Context(), int16(stateID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch cities: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Cities fetched successfully", map[string]interface{}{
		"cities": cities,
	})
}

// GetLGAs godoc
// @Summary      Get local government areas (LGAs)
// @Description  Fetches LGAs with optional state_id filtering
// @Tags         Bodies
// @Accept       json
// @Produce      json
// @Param        state_id   query     int     false  "State ID to filter by"
// @Success      200        {object}  GetLGAsResponse
// @Failure      500        {string}  failed to fetch lgas
// @Router       /lgas [get]
func (h *Handler) GetLGAs(w http.ResponseWriter, r *http.Request) {
	stateID := parseOptionalQueryInt(r, "state_id")

	lgas, err := h.bodiesService.GetLGAs(r.Context(), stateID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch LGAs: "+err.Error())
		return
	}

	search := strings.TrimSpace(r.URL.Query().Get("search"))
	if search != "" {
		searchLower := strings.ToLower(search)
		var filtered []queries.Lga
		for _, l := range lgas {
			if strings.Contains(strings.ToLower(l.Name), searchLower) ||
				strings.Contains(strings.ToLower(l.Code), searchLower) ||
				strings.Contains(strings.ToLower(l.StateName), searchLower) ||
				strings.Contains(strings.ToLower(l.SenatorialDistrictName.String), searchLower) ||
				strings.Contains(strings.ToLower(l.FederalConstituencyName.String), searchLower) {
				filtered = append(filtered, l)
			}
		}
		lgas = filtered
	}

	h.utils.RespondSuccess(w, http.StatusOK, "LGAs fetched successfully", map[string]interface{}{
		"lgas": lgas,
	})
}

type CreateLGARequest struct {
	Name                  string `json:"name"`
	Code                  string `json:"code"`
	StateID               int32  `json:"state_id"`
	SenatorialDistrictID  int32  `json:"senatorial_district_id"`
	FederalConstituencyID int32  `json:"federal_constituency_id"`
}

type UpdateLGARequest struct {
	Name                  string `json:"name"`
	Code                  string `json:"code"`
	StateID               int32  `json:"state_id"`
	SenatorialDistrictID  int32  `json:"senatorial_district_id"`
	FederalConstituencyID int32  `json:"federal_constituency_id"`
}

func (h *Handler) CreateLGA(w http.ResponseWriter, r *http.Request) {
	var req CreateLGARequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.Code == "" || req.StateID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, code, and state_id are required")
		return
	}

	state, err := h.bodiesService.CheckStateByID(r.Context(), int16(req.StateID))
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state ID: "+err.Error())
		return
	}

	sdName := ""
	if req.SenatorialDistrictID > 0 {
		sd, err := h.queries.GetSenatorialDistrictByID(r.Context(), req.SenatorialDistrictID)
		if err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid senatorial district ID: "+err.Error())
			return
		}
		sdName = sd.Name
	}

	fcName := ""
	if req.FederalConstituencyID > 0 {
		fc, err := h.queries.GetFederalConstituencyByID(r.Context(), req.FederalConstituencyID)
		if err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid federal constituency ID: "+err.Error())
			return
		}
		fcName = fc.Name
	}

	lga, err := h.bodiesService.CreateLGA(r.Context(), req.Name, req.Code, req.StateID, state.Name, req.SenatorialDistrictID, sdName, req.FederalConstituencyID, fcName)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to create LGA: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusCreated, "LGA created successfully", map[string]interface{}{
		"lga": lga,
	})
}

func (h *Handler) UpdateLGA(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid LGA ID")
		return
	}

	var req UpdateLGARequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.Name == "" || req.Code == "" || req.StateID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, code, and state_id are required")
		return
	}

	_, err = h.bodiesService.GetLGAByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "LGA not found")
		return
	}

	state, err := h.bodiesService.CheckStateByID(r.Context(), int16(req.StateID))
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state ID: "+err.Error())
		return
	}

	sdName := ""
	if req.SenatorialDistrictID > 0 {
		sd, err := h.queries.GetSenatorialDistrictByID(r.Context(), req.SenatorialDistrictID)
		if err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid senatorial district ID: "+err.Error())
			return
		}
		sdName = sd.Name
	}

	fcName := ""
	if req.FederalConstituencyID > 0 {
		fc, err := h.queries.GetFederalConstituencyByID(r.Context(), req.FederalConstituencyID)
		if err != nil {
			h.utils.RespondError(w, http.StatusBadRequest, "Invalid federal constituency ID: "+err.Error())
			return
		}
		fcName = fc.Name
	}

	lga, err := h.bodiesService.UpdateLGA(r.Context(), int32(id), req.Name, req.Code, req.StateID, state.Name, req.SenatorialDistrictID, sdName, req.FederalConstituencyID, fcName)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to update LGA: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "LGA updated successfully", map[string]interface{}{
		"lga": lga,
	})
}

func (h *Handler) DeleteLGA(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid LGA ID")
		return
	}

	_, err = h.bodiesService.GetLGAByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "LGA not found")
		return
	}

	if err := h.bodiesService.DeleteLGA(r.Context(), int32(id)); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to delete LGA: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "LGA deleted successfully", nil)
}

// RecalculateBodyMetrics recalculates counts across all electoral hierarchy levels
// (wards -> constituencies/LGAs -> senatorial districts -> states -> national)
// in a single atomic database transaction and invalidates corresponding Redis caches.
func (h *Handler) RecalculateBodyMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// 1. Begin an atomic database transaction.
	// If any recalculation step fails, Rollback ensures the database is not left in a partial/corrupted count state.
	tx, err := h.pool.Begin(ctx)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to start transaction: "+err.Error())
		return
	}
	defer tx.Rollback(ctx) // Safe: a no-op once tx.Commit() succeeds

	// Bind the sqlc queries to this transaction
	qtx := h.queries.WithTx(tx)

	// 2. Perform bottom-up recalculation (from base electoral units up to national totals)

	// Recalculate polling unit counts on wards
	if err := qtx.RecalculateWardMetrics(ctx); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to recalculate ward metrics: "+err.Error())
		return
	}

	// Recalculate ward & polling unit counts on state constituencies
	if err := qtx.RecalculateStateConstituencyMetrics(ctx); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to recalculate state constituency metrics: "+err.Error())
		return
	}

	// Recalculate constituency, ward & polling unit counts on LGAs
	if err := qtx.RecalculateLGAMetrics(ctx); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to recalculate LGA metrics: "+err.Error())
		return
	}

	// Recalculate LGA, constituency, ward & polling unit counts on federal constituencies
	if err := qtx.RecalculateFederalConstituencyMetrics(ctx); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to recalculate federal constituency metrics: "+err.Error())
		return
	}

	// Recalculate constituency, LGA, ward & polling unit counts on senatorial districts
	if err := qtx.RecalculateSenatorialDistrictMetrics(ctx); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to recalculate senatorial district metrics: "+err.Error())
		return
	}

	// Recalculate aggregated electoral body counts on states (c_states)
	if err := qtx.RecalculateStateMetrics(ctx); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to recalculate state metrics: "+err.Error())
		return
	}

	// Recalculate country-wide aggregated counts (national_metrics)
	if err := qtx.RecalculateNationalMetrics(ctx); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to recalculate national metrics: "+err.Error())
		return
	}

	// 3. Commit the transaction after all recalculations succeed
	if err := tx.Commit(ctx); err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to commit metrics recalculation: "+err.Error())
		return
	}

	// 4. Redis Cache Invalidation:
	// Invalidate national metrics and Nigeria states cache ("countries:states:161")
	// so the admin tables and public pages fetch fresh counts immediately.
	nigeriaStatesKey := fmt.Sprintf("%s%d", db.RedisStatesByCountry, constants.NigeriaCountryID)
	h.rdb.Del(ctx, db.RedisNationalMetrics, nigeriaStatesKey)

	// Non-blocking cursor scan to invalidate any cached electoral body lists
	// (e.g. bodies:senatorial_districts:*, bodies:lgas:*, bodies:wards:*, etc.)
	var bodyKeys []string
	iter := h.rdb.Scan(ctx, 0, "bodies:*", 500).Iterator()
	for iter.Next(ctx) {
		bodyKeys = append(bodyKeys, iter.Val())
	}
	if len(bodyKeys) > 0 {
		h.rdb.Del(ctx, bodyKeys...)
	}

	// 5. Return success response
	h.utils.RespondSuccess(w, http.StatusOK, "Successfully recalculated all body metrics", nil)
}

// GetNationalMetrics godoc
// @Summary      Get national body metrics
// @Description  Fetches aggregated metrics for electoral bodies nationwide
// @Tags         Bodies
// @Accept       json
// @Produce      json
// @Success      200  {object} map[string]interface{}
// @Failure      500  {string} string
// @Router       /bodies/metrics [get]
func (h *Handler) GetNationalMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	metrics, err := h.bodiesService.GetNationalMetrics(ctx)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch national metrics: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Successfully fetched national metrics", map[string]interface{}{
		"metrics": metrics,
	})
}

// SyncElectoralUnits godoc
// @Summary      Synchronize electoral units from INEC API
// @Description  Fetches and synchronizes all electoral units from INEC API (admin only)
// @Tags         Bodies
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object} map[string]interface{}
// @Failure      401  {string} string "Unauthorized"
// @Failure      403  {string} string "Forbidden"
// @Failure      500  {string} string
// @Router       /bodies/sync-electoral-units [post]
func (h *Handler) SyncElectoralUnits(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	report, err := h.bodiesService.SyncElectoralUnits(ctx)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to synchronize electoral units: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Successfully synchronized electoral units from INEC API", map[string]interface{}{
		"report": report,
	})
}

// SyncElectoralUnitsStateFlow godoc
// @Summary      Synchronize electoral units from INEC API using State (Governorship) Flow
// @Description  Fetches and synchronizes all electoral units from INEC API using Governorship election state flow (admin only)
// @Tags         Bodies
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object} map[string]interface{}
// @Failure      401  {string} string "Unauthorized"
// @Failure      403  {string} string "Forbidden"
// @Failure      500  {string} string
// @Router       /bodies/sync-electoral-units-state-flow [post]
func (h *Handler) SyncElectoralUnitsStateFlow(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	report, err := h.bodiesService.SyncElectoralUnitsStateFlow(ctx)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to synchronize electoral units (State Flow): "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Successfully synchronized electoral units from INEC API (State Flow)", map[string]interface{}{
		"report": report,
	})
}



