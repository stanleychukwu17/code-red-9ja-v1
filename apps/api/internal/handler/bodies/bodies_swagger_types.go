package bodieshandler

type PaginationMeta struct {
	NextCursor string `json:"next_cursor"`
	HasMore    bool   `json:"has_more"`
}

// Countries swagger structures
type CountryResponse struct {
	ID        int32  `json:"id"`
	Name      string `json:"name"`
	ISO2      string `json:"iso2"`
	PhoneCode string `json:"phone_code"`
}

type GetCountriesResponse struct {
	Success bool             `json:"success"`
	Message string           `json:"message"`
	Data    GetCountriesData `json:"data"`
}

type GetCountriesData struct {
	Countries []CountryResponse `json:"countries"`
}

// States swagger structures
type StateResponse struct {
	ID   int16  `json:"id"`
	Name string `json:"name"`
}

type GetStatesResponse struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    GetStatesData   `json:"data"`
	Meta    *PaginationMeta `json:"meta,omitempty"`
}

type GetStatesData struct {
	States []StateResponse `json:"states"`
}

// Cities swagger structures
type CityResponse struct {
	ID   int32  `json:"id"`
	Name string `json:"name"`
}

type GetCitiesResponse struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    GetCitiesData   `json:"data"`
	Meta    *PaginationMeta `json:"meta,omitempty"`
}

type GetCitiesData struct {
	Cities []CityResponse `json:"cities"`
}

// Senatorial Districts swagger structures
type SenatorialDistrictResponse struct {
	ID              int32  `json:"id"`
	Name            string `json:"name"`
	Description     string `json:"description"`
	CoalitionCenter string `json:"coalition_center"`
	StateID         int32  `json:"state_id"`
	StateName       string `json:"state_name"`
}

type GetSenatorialDistrictsResponse struct {
	Success bool                       `json:"success"`
	Message string                     `json:"message"`
	Data    GetSenatorialDistrictsData `json:"data"`
	Meta    *PaginationMeta            `json:"meta,omitempty"`
}

type GetSenatorialDistrictsData struct {
	Districts []SenatorialDistrictResponse `json:"districts"`
}

// Federal Constituencies swagger structures
type FederalConstituencyResponse struct {
	ID                     int32  `json:"id"`
	Name                   string `json:"name"`
	StateID                int32  `json:"state_id"`
	StateName              string `json:"state_name"`
	SenatorialDistrictID   int32  `json:"senatorial_district_id"`
	SenatorialDistrictName string `json:"senatorial_district_name"`
}

type GetFederalConstituenciesResponse struct {
	Success bool                         `json:"success"`
	Message string                       `json:"message"`
	Data    GetFederalConstituenciesData `json:"data"`
	Meta    *PaginationMeta              `json:"meta,omitempty"`
}

type GetFederalConstituenciesData struct {
	Constituencies []FederalConstituencyResponse `json:"constituencies"`
}

// State Assembly Constituencies swagger structures
type StateAssemblyConstituencyResponse struct {
	ID                      int32  `json:"id"`
	Name                    string `json:"name"`
	StateID                 int32  `json:"state_id"`
	StateName               string `json:"state_name"`
	SenatorialDistrictID    int32  `json:"senatorial_district_id"`
	SenatorialDistrictName  string `json:"senatorial_district_name"`
	FederalConstituencyID   int32  `json:"federal_constituency_id"`
	FederalConstituencyName string `json:"federal_constituency_name"`
}

type GetStateAssemblyConstituenciesResponse struct {
	Success bool                               `json:"success"`
	Message string                             `json:"message"`
	Data    GetStateAssemblyConstituenciesData `json:"data"`
	Meta    *PaginationMeta                    `json:"meta,omitempty"`
}

type GetStateAssemblyConstituenciesData struct {
	Constituencies []StateAssemblyConstituencyResponse `json:"constituencies"`
}

// LGAs swagger structures
type LGAResponse struct {
	ID           int32  `json:"id"`
	Name         string `json:"name"`
	Abbreviation string `json:"abbreviation"`
	StateID      int32  `json:"state_id"`
	StateName    string `json:"state_name"`
}

type GetLGAsResponse struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    GetLGAsData     `json:"data"`
	Meta    *PaginationMeta `json:"meta,omitempty"`
}

type GetLGAsData struct {
	LGAs []LGAResponse `json:"lgas"`
}

// Wards swagger structures
type WardResponse struct {
	ID                  int32  `json:"id"`
	Name                string `json:"name"`
	LocalGovernmentID   int32  `json:"lga_id"`
	LocalGovernmentName string `json:"lga_name"`
	StateID             int32  `json:"state_id"`
	StateName           string `json:"state_name"`
}

type GetWardsResponse struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    GetWardsData    `json:"data"`
	Meta    *PaginationMeta `json:"meta,omitempty"`
}

type GetWardsData struct {
	Wards []WardResponse `json:"wards"`
}

// Polling Units swagger structures
type PollingUnitResponse struct {
	ID                  int32    `json:"id"`
	Name                string   `json:"name"`
	Abbreviation        string   `json:"abbreviation"`
	Units               string   `json:"units"`
	Delimitation        string   `json:"delimitation"`
	Remark              string   `json:"remark"`
	RegistrationAreaID  int32    `json:"registration_area_id"`
	WardID              int32    `json:"ward_id"`
	WardName            string   `json:"ward_name"`
	LocalGovernmentID   int32    `json:"lga_id"`
	LocalGovernmentName string   `json:"lga_name"`
	StateID             int32    `json:"state_id"`
	StateName           string   `json:"state_name"`
	Latitude            float64  `json:"latitude"`
	Longitude           float64  `json:"longitude"`
	PreciseLocation     string   `json:"precise_location"`
	FormattedAddress    string   `json:"formatted_address"`
	GooglePlaceID       string   `json:"google_place_id"`
}

type GetPollingUnitsResponse struct {
	Success bool                 `json:"success"`
	Message string               `json:"message"`
	Data    GetPollingUnitsData  `json:"data"`
	Meta    *PaginationMeta      `json:"meta,omitempty"`
}

type GetPollingUnitsData struct {
	PollingUnits []PollingUnitResponse `json:"polling_units"`
}
