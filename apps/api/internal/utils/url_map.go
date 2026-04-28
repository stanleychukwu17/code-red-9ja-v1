package utils

// URLMap defines the structure for all API endpoints to avoid hardcoding strings.
type URLMap struct {
	Register       string
	Login          string
	Logout         string
	ForgotPassword string
	Health         string
	Root           string
}

// ApiUrls holds the global configuration for all API endpoints.
// This allows consistent URL usage across the application and tests.
var ApiUrls = URLMap{
	Register:       "/api/v1/auth/register",
	Login:          "/api/v1/auth/login",
	Logout:         "/api/v1/auth/logout",
	ForgotPassword: "/api/v1/auth/forgot_password",
	Health:         "/health",
	Root:           "/api/v1",
}
