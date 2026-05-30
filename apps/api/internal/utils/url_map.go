package utils

// URLMap defines the structure for all API endpoints to avoid hardcoding strings.

type AuthURLMap struct {
	RegisterPhaseSignUp string
	Register            string
	CheckNin            string
	CheckUsername       string
	Login               string
	Logout              string
	ForgotPassword      string
	Refresh             string
}

type CountriesURLMap struct {
	GetAll    string
	GetStates string
	GetCities string
}

type URLMap struct {
	Root      string
	Health    string
	Auth      AuthURLMap
	Countries CountriesURLMap
}

// ApiUrls holds the global configuration for all API endpoints.
// This allows consistent URL usage across the application and tests.
var ApiUrls = URLMap{
	Health: "/health",
	Root:   "/api/v1",
	Auth: AuthURLMap{
		RegisterPhaseSignUp: "/api/v1/auth/register_phase_signup",
		CheckNin:            "/api/v1/auth/check_nin",
		CheckUsername:       "/api/v1/auth/check_username",
		Register:            "/api/v1/auth/register",
		Login:               "/api/v1/auth/login",
		Logout:              "/api/v1/auth/logout",
		ForgotPassword:      "/api/v1/auth/forgot_password",
		Refresh:             "/api/v1/auth/refresh",
	},
	Countries: CountriesURLMap{
		GetAll:    "/api/v1/countries",
		GetStates: "/api/v1/countries/{countryID}/states",
		GetCities: "/api/v1/states/{stateID}/cities",
	},
}
