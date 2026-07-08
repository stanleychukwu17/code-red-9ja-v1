package bodieshandler

import (
	"context"
	"encoding/json"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
)

type BodiesService interface {
	GetAllCountries(ctx context.Context) ([]queries.ListCountriesRow, error)
	GetCitiesByStateID(ctx context.Context, stateID int16) ([]queries.GetCitiesByStateIDRow, error)
	GetLGAs(ctx context.Context, stateID int32) ([]queries.Lga, error)
	CreateLGA(ctx context.Context, name string, abbreviation string, stateID int32, stateName string, senatorialDistrictID int32, senatorialDistrictName string, federalConstituencyID int32, federalConstituencyName string) (queries.Lga, error)
	GetLGAByID(ctx context.Context, id int32) (queries.Lga, error)
	UpdateLGA(ctx context.Context, id int32, name string, abbreviation string, stateID int32, stateName string, senatorialDistrictID int32, senatorialDistrictName string, federalConstituencyID int32, federalConstituencyName string) (queries.Lga, error)
	DeleteLGA(ctx context.Context, id int32) error
}

type Handler struct {
	bodiesService BodiesService
	queries       *queries.Queries
	utils         *utils.Utils
}

func NewHandler(bodiesService BodiesService, q *queries.Queries, utils *utils.Utils) *Handler {
	return &Handler{
		bodiesService: bodiesService,
		queries:       q,
		utils:         utils,
	}
}


func parsePaginationParams(r *http.Request) (int, int64) {
	return parsePaginationParamsWithMax(r, 100)
}

func parsePaginationParamsWithMax(r *http.Request, maxLimit int) (int, int64) {
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			if l > maxLimit {
				limit = maxLimit
			} else {
				limit = l
			}
		}
	}

	var cursor int64
	if cursorStr := r.URL.Query().Get("cursor"); cursorStr != "" {
		if c, err := strconv.ParseInt(cursorStr, 10, 64); err == nil {
			cursor = c
		}
	}
	return limit, cursor
}

func parseSortParams(r *http.Request, defaultOrderBy string, defaultOrderDir string) (string, string) {
	orderBy := r.URL.Query().Get("order_by")
	if orderBy == "" {
		orderBy = defaultOrderBy
	}

	orderDir := strings.ToUpper(r.URL.Query().Get("order"))
	if orderDir != "ASC" && orderDir != "DESC" {
		orderDir = defaultOrderDir
	}

	return orderBy, orderDir
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

// GetCities godoc
// @Summary      Get cities by state ID
// @Description  Fetches all cities for a specific state by its ID with cursor pagination
// @Tags         Bodies
// @Accept       json
// @Produce      json
// @Param        stateID    path      int     true   "State ID"
// @Param        limit      query     int     false  "Limit (default 20, max 100)"
// @Param        cursor     query     string  false  "Cursor (ID of last record)"
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

	limit, cursor := parsePaginationParams(r)

	cities, err := h.bodiesService.GetCitiesByStateID(r.Context(), int16(stateID))
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch cities: "+err.Error())
		return
	}

	startIndex := 0
	if cursor > 0 {
		for i, c := range cities {
			if int64(c.ID) == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	var paginatedCities []queries.GetCitiesByStateIDRow
	hasMore := false
	nextCursor := ""

	if startIndex < len(cities) {
		endIndex := startIndex + limit
		if endIndex >= len(cities) {
			endIndex = len(cities)
			paginatedCities = cities[startIndex:endIndex]
		} else {
			paginatedCities = cities[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(int64(paginatedCities[len(paginatedCities)-1].ID), 10)
		}
	} else {
		paginatedCities = []queries.GetCitiesByStateIDRow{}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Cities fetched successfully", map[string]interface{}{
		"cities": paginatedCities,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

// GetLGAs godoc
// @Summary      Get local government areas (LGAs)
// @Description  Fetches LGAs with optional state_id filtering and cursor pagination
// @Tags         Bodies
// @Accept       json
// @Produce      json
// @Param        state_id   query     int     false  "State ID to filter by"
// @Param        limit      query     int     false  "Limit (default 20, max 100)"
// @Param        cursor     query     string  false  "Cursor (ID of last record)"
// @Success      200        {object}  GetLGAsResponse
// @Failure      500        {string}  failed to fetch lgas
// @Router       /lgas [get]
func (h *Handler) GetLGAs(w http.ResponseWriter, r *http.Request) {
	stateID := parseOptionalQueryInt(r, "state_id")
	limit, cursor := parsePaginationParamsWithMax(r, 1000)

	lgas, err := h.bodiesService.GetLGAs(r.Context(), stateID)
	if err != nil {
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch LGAs: "+err.Error())
		return
	}

	orderBy, orderDir := parseSortParams(r, "name", "ASC")

	sort.SliceStable(lgas, func(i, j int) bool {
		var less bool
		if orderBy == "name" {
			less = lgas[i].Name < lgas[j].Name
		} else {
			less = lgas[i].ID < lgas[j].ID
		}
		if orderDir == "DESC" {
			return !less
		}
		return less
	})

	startIndex := 0
	if cursor > 0 {
		for i, l := range lgas {
			if int64(l.ID) == cursor {
				startIndex = i + 1
				break
			}
		}
	}

	var paginated []queries.Lga
	hasMore := false
	nextCursor := ""

	if startIndex < len(lgas) {
		endIndex := startIndex + limit
		if endIndex >= len(lgas) {
			endIndex = len(lgas)
			paginated = lgas[startIndex:endIndex]
		} else {
			paginated = lgas[startIndex:endIndex]
			hasMore = true
			nextCursor = strconv.FormatInt(int64(paginated[len(paginated)-1].ID), 10)
		}
	} else {
		paginated = []queries.Lga{}
	}

	h.utils.RespondSuccess(w, http.StatusOK, "LGAs fetched successfully", map[string]interface{}{
		"lgas": paginated,
		"meta": map[string]interface{}{
			"next_cursor": nextCursor,
			"has_more":    hasMore,
		},
	})
}

type CreateLGARequest struct {
	Name                  string `json:"name"`
	Abbreviation          string `json:"abbreviation"`
	StateID               int32  `json:"state_id"`
	SenatorialDistrictID  int32  `json:"senatorial_district_id"`
	FederalConstituencyID int32  `json:"federal_constituency_id"`
}

type UpdateLGARequest struct {
	Name                  string `json:"name"`
	Abbreviation          string `json:"abbreviation"`
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

	if req.Name == "" || req.Abbreviation == "" || req.StateID == 0 || req.SenatorialDistrictID == 0 || req.FederalConstituencyID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, abbreviation, state_id, senatorial_district_id, and federal_constituency_id are required")
		return
	}

	state, err := h.queries.GetStateByID(r.Context(), queries.GetStateByIDParams{
		ID:        int16(req.StateID),
		CountryID: 161,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state ID: "+err.Error())
		return
	}

	sd, err := h.queries.GetSenatorialDistrictByID(r.Context(), req.SenatorialDistrictID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid senatorial district ID: "+err.Error())
		return
	}

	fc, err := h.queries.GetFederalConstituencyByID(r.Context(), req.FederalConstituencyID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid federal constituency ID: "+err.Error())
		return
	}

	lga, err := h.bodiesService.CreateLGA(r.Context(), req.Name, req.Abbreviation, req.StateID, state.Name, req.SenatorialDistrictID, sd.Name, req.FederalConstituencyID, fc.Name)
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

	if req.Name == "" || req.Abbreviation == "" || req.StateID == 0 || req.SenatorialDistrictID == 0 || req.FederalConstituencyID == 0 {
		h.utils.RespondError(w, http.StatusBadRequest, "name, abbreviation, state_id, senatorial_district_id, and federal_constituency_id are required")
		return
	}

	_, err = h.bodiesService.GetLGAByID(r.Context(), int32(id))
	if err != nil {
		h.utils.RespondError(w, http.StatusNotFound, "LGA not found")
		return
	}

	state, err := h.queries.GetStateByID(r.Context(), queries.GetStateByIDParams{
		ID:        int16(req.StateID),
		CountryID: 161,
	})
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state ID: "+err.Error())
		return
	}

	sd, err := h.queries.GetSenatorialDistrictByID(r.Context(), req.SenatorialDistrictID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid senatorial district ID: "+err.Error())
		return
	}

	fc, err := h.queries.GetFederalConstituencyByID(r.Context(), req.FederalConstituencyID)
	if err != nil {
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid federal constituency ID: "+err.Error())
		return
	}

	lga, err := h.bodiesService.UpdateLGA(r.Context(), int32(id), req.Name, req.Abbreviation, req.StateID, state.Name, req.SenatorialDistrictID, sd.Name, req.FederalConstituencyID, fc.Name)
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

