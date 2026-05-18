package countrieshandler

// @Description for GetCountries
type CountryResponse struct {
	ID        int32  `json:"id"`
	Name      string `json:"name"`
	ISO2      string `json:"iso2"`
	PhoneCode string `json:"phone_code"`
}

type GetCountriesResponse struct {
	Countries []CountryResponse `json:"countries"`
}

type StateResponse struct {
	ID   int16  `json:"id"`
	Name string `json:"name"`
}

type GetStatesResponse struct {
	States []StateResponse `json:"states"`
}

type CityResponse struct {
	ID   int32  `json:"id"`
	Name string `json:"name"`
}

type GetCitiesResponse struct {
	Cities []CityResponse `json:"cities"`
}


