package utils

// URLMap defines the structure for all API endpoints to avoid hardcoding strings.

type AuthURLMap struct {
	Register       string
	Login          string
	Logout         string
	ForgotPassword string
}

type CountriesURLMap struct {
	GetAll string
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
		Register:       "/api/v1/auth/register",
		Login:          "/api/v1/auth/login",
		Logout:         "/api/v1/auth/logout",
		ForgotPassword: "/api/v1/auth/forgot_password",
	},
	Countries: CountriesURLMap{
		GetAll: "/api/v1/countries",
	},
}
