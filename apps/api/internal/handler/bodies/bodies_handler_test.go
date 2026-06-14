package bodieshandler_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"free9ja/api/internal/db/queries"
	bodieshandler "free9ja/api/internal/handler/bodies"
	"free9ja/api/internal/utils"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

type MockBodiesService struct {
	mock.Mock
}

func (m *MockBodiesService) GetAllCountries(ctx context.Context) ([]queries.ListCountriesRow, error) {
	args := m.Called(ctx)
	return args.Get(0).([]queries.ListCountriesRow), args.Error(1)
}

func (m *MockBodiesService) GetStatesByCountryID(ctx context.Context, countryID int16) ([]queries.GetStatesByCountryIDRow, error) {
	args := m.Called(ctx, countryID)
	return args.Get(0).([]queries.GetStatesByCountryIDRow), args.Error(1)
}

func (m *MockBodiesService) GetCitiesByStateID(ctx context.Context, stateID int16) ([]queries.GetCitiesByStateIDRow, error) {
	args := m.Called(ctx, stateID)
	return args.Get(0).([]queries.GetCitiesByStateIDRow), args.Error(1)
}

func (m *MockBodiesService) GetSenatorialDistricts(ctx context.Context, stateID int32) ([]queries.SenatorialDistrict, error) {
	args := m.Called(ctx, stateID)
	return args.Get(0).([]queries.SenatorialDistrict), args.Error(1)
}

func (m *MockBodiesService) GetFederalConstituencies(ctx context.Context, stateID, senatorialDistrictID int32) ([]queries.FederalConstituency, error) {
	args := m.Called(ctx, stateID, senatorialDistrictID)
	return args.Get(0).([]queries.FederalConstituency), args.Error(1)
}

func (m *MockBodiesService) GetStateAssemblyConstituencies(ctx context.Context, stateID, federalConstituencyID int32) ([]queries.StateAssemblyConstituency, error) {
	args := m.Called(ctx, stateID, federalConstituencyID)
	return args.Get(0).([]queries.StateAssemblyConstituency), args.Error(1)
}

func (m *MockBodiesService) GetLGAs(ctx context.Context, stateID int32) ([]queries.Lga, error) {
	args := m.Called(ctx, stateID)
	return args.Get(0).([]queries.Lga), args.Error(1)
}

func (m *MockBodiesService) GetWards(ctx context.Context, localGovernmentID, stateID int32) ([]queries.GetWardsRow, error) {
	args := m.Called(ctx, localGovernmentID, stateID)
	return args.Get(0).([]queries.GetWardsRow), args.Error(1)
}

func (m *MockBodiesService) GetPollingUnits(ctx context.Context, wardID, localGovernmentID, stateID int32) ([]queries.PollingUnit, error) {
	args := m.Called(ctx, wardID, localGovernmentID, stateID)
	return args.Get(0).([]queries.PollingUnit), args.Error(1)
}

func TestGetSenatorialDistricts(t *testing.T) {
	utilsInstance := utils.NewUtils(nil)

	t.Run("GetSenatorialDistricts with pagination - first page", func(t *testing.T) {
		mockService := new(MockBodiesService)
		handler := bodieshandler.NewHandler(mockService, utilsInstance)

		mockData := []queries.SenatorialDistrict{
			{ID: 1, Name: "Abia North", Description: pgtype.Text{String: "Comprising...", Valid: true}, CoalitionCenter: pgtype.Text{String: "Ohafia", Valid: true}, StateID: 1, StateName: "Abia"},
			{ID: 2, Name: "Abia Central", Description: pgtype.Text{String: "Comprising...", Valid: true}, CoalitionCenter: pgtype.Text{String: "Umuahia", Valid: true}, StateID: 1, StateName: "Abia"},
			{ID: 3, Name: "Abia South", Description: pgtype.Text{String: "Comprising...", Valid: true}, CoalitionCenter: pgtype.Text{String: "Aba", Valid: true}, StateID: 1, StateName: "Abia"},
		}

		mockService.On("GetSenatorialDistricts", mock.Anything, int32(1)).Return(mockData, nil)

		req, _ := http.NewRequest("GET", "/senatorial-districts?state_id=1&limit=2", nil)
		rr := httptest.NewRecorder()
		handler.GetSenatorialDistricts(rr, req)

		require.Equal(t, http.StatusOK, rr.Code)

		var response map[string]any
		err := json.Unmarshal(rr.Body.Bytes(), &response)
		require.NoError(t, err)

		require.True(t, response["success"].(bool))
		data := response["data"].(map[string]any)
		list := data["districts"].([]any)
		require.Equal(t, 2, len(list))

		meta := response["meta"].(map[string]any)
		require.True(t, meta["has_more"].(bool))
		require.Equal(t, "2", meta["next_cursor"])
	})
}
