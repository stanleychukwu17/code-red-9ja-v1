package countrieshandler

import (
	"context"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/logger"
	"free9ja/api/internal/utils"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)

type CountryService interface {
	GetAllCountries(ctx context.Context) ([]queries.ListCountriesRow, error)
	GetStatesByCountryID(ctx context.Context, countryID int16) ([]queries.GetStatesByCountryIDRow, error)
	GetCitiesByStateID(ctx context.Context, stateID int16) ([]queries.GetCitiesByStateIDRow, error)
}

type Handler struct {
	countryService CountryService
	utils          *utils.Utils
}

func NewHandler(countryService CountryService, utils *utils.Utils) *Handler {
	return &Handler{
		countryService: countryService,
		utils:          utils,
	}
}

// GetCountries godoc
// @Summary      Get all countries
// @Description  Fetches a list of all countries with their ISO2 codes, phone codes
// @Tags         Countries
// @Accept       json
// @Produce      json
// @Success      200  {object} GetCountriesResponse
// @Failure      500  {string}  failed to fetch countries
// @Router       /countries [get]
func (h *Handler) GetCountries(w http.ResponseWriter, r *http.Request) {
	log := logger.FromContext(r.Context()).With("component", logger.ComponentCountriesHandler)

	countries, err := h.countryService.GetAllCountries(r.Context())
	if err != nil {
		log.Error(logger.EventFetchCountriesFailed, "error", err)
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch countries: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Countries fetched successfully", map[string]interface{}{
		"countries": countries,
	})
}

// GetStates godoc
// @Summary      Get states by country ID
// @Description  Fetches all states for a specific country by its ID
// @Tags         Countries
// @Accept       json
// @Produce      json
// @Param        countryID  path      int  true  "Country ID"
// @Success      200        {object}  GetStatesResponse
// @Failure      400        {string}  invalid country ID
// @Failure      500        {string}  failed to fetch states
// @Router       /countries/{countryID}/states [get]
func (h *Handler) GetStates(w http.ResponseWriter, r *http.Request) {
	log := logger.FromContext(r.Context()).With("component", logger.ComponentCountriesHandler)
	countryIDStr := chi.URLParam(r, "countryID")
	
	countryID, err := strconv.ParseInt(countryIDStr, 10, 16)
	if err != nil {
		log.Warn(logger.EventInvalidCountryID, "country_id", countryIDStr, "error", err)
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid country ID: "+err.Error())
		return
	}

	states, err := h.countryService.GetStatesByCountryID(r.Context(), int16(countryID))
	if err != nil {
		log.Error(logger.EventFetchStatesFailed, "country_id", countryID, "error", err)
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch states: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "States fetched successfully", map[string]interface{}{
		"states": states,
	})
}

// GetCities godoc
// @Summary      Get cities by state ID
// @Description  Fetches all cities for a specific state by its ID
// @Tags         Countries
// @Accept       json
// @Produce      json
// @Param        stateID  path      int  true  "State ID"
// @Success      200      {object}  GetCitiesResponse
// @Failure      400      {string}  invalid state ID
// @Failure      500      {string}  failed to fetch cities
// @Router       /states/{stateID}/cities [get]
func (h *Handler) GetCities(w http.ResponseWriter, r *http.Request) {
	log := logger.FromContext(r.Context()).With("component", logger.ComponentCountriesHandler)
	stateIDStr := chi.URLParam(r, "stateID")
	
	stateID, err := strconv.ParseInt(stateIDStr, 10, 16)
	if err != nil {
		log.Warn(logger.EventInvalidStateID, "state_id", stateIDStr, "error", err)
		h.utils.RespondError(w, http.StatusBadRequest, "Invalid state ID: "+err.Error())
		return
	}

	cities, err := h.countryService.GetCitiesByStateID(r.Context(), int16(stateID))
	if err != nil {
		log.Error(logger.EventFetchCitiesFailed, "state_id", stateID, "error", err)
		h.utils.RespondError(w, http.StatusInternalServerError, "Failed to fetch cities: "+err.Error())
		return
	}

	h.utils.RespondSuccess(w, http.StatusOK, "Cities fetched successfully", map[string]interface{}{
		"cities": cities,
	})
}
