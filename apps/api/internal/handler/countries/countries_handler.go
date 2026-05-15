package countrieshandler

import (
	"context"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/utils"
	"net/http"
)

type CountryService interface {
	GetAllCountries(ctx context.Context) ([]queries.ListCountriesRow, error)
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
	countries, err := h.countryService.GetAllCountries(r.Context())
	if err != nil {
		h.utils.RespondJSON(w, http.StatusInternalServerError, map[string]interface{}{
			"status": "error",
			"error":  "Failed to fetch countries: " + err.Error(),
		})
		return
	}

	h.utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "success",
		"countries": countries,
	})
}
