package utils

// URLMap defines the structure for all API endpoints to avoid hardcoding strings.

type AuthURLMap struct {
	RegisterPhaseSignUp     string
	SendSignupEmailOTP      string
	VerifySignupEmailOTP    string
	Register                string
	CheckNin                string
	CheckUsername           string
	Login                   string
	Logout                  string
	ForgotPassword          string
	Refresh                 string
	VerifySecurityQuestions string
	AdminLogin              string
	PartyLogin              string
	ChangePasswordByEmail   string
	SuperAdmin              string
}

type BodiesURLMap struct {
	GetAll                         string
	GetStates                      string
	GetCities                      string
	GetSenatorialDistricts         string
	GetFederalConstituencies       string
	GetStateAssemblyConstituencies string
	GetLGAs                        string
	GetWards                       string
	GetPollingUnits                string
}

type UsersURLMap struct {
	GetMe         string
	UpdateProfile string
	ListUsers     string
}

type URLMap struct {
	Root   string
	Health string
	Auth   AuthURLMap
	Bodies BodiesURLMap
	Users  UsersURLMap
}

// ApiUrls holds the global configuration for all API endpoints.
// This allows consistent URL usage across the application and tests.
var ApiUrls = URLMap{
	Health: "/health",
	Root:   "/api/v1",
	Auth: AuthURLMap{
		RegisterPhaseSignUp:     "/api/v1/auth/signup",
		SendSignupEmailOTP:      "/api/v1/auth/signup/email-otp",
		VerifySignupEmailOTP:    "/api/v1/auth/signup/email-otp/verify",
		CheckNin:                "/api/v1/auth/check_nin",
		CheckUsername:           "/api/v1/auth/check_username",
		Register:                "/api/v1/auth/register",
		Login:                   "/api/v1/auth/login",
		Logout:                  "/api/v1/auth/logout",
		ForgotPassword:          "/api/v1/auth/forgot_password",
		Refresh:                 "/api/v1/auth/refresh",
		VerifySecurityQuestions: "/api/v1/auth/verify_security_questions",
		AdminLogin:              "/api/v1/auth/admin/login",
		PartyLogin:              "/api/v1/auth/partyapp/login",
		ChangePasswordByEmail:   "/api/v1/auth/change_password_by_email",
		SuperAdmin:              "/api/v1/auth/superadmin",
	},
	Bodies: BodiesURLMap{
		GetAll:                         "/api/v1/countries",
		GetStates:                      "/api/v1/countries/{countryID}/states",
		GetCities:                      "/api/v1/states/{stateID}/cities",
		GetSenatorialDistricts:         "/api/v1/senatorial-districts",
		GetFederalConstituencies:       "/api/v1/federal-constituencies",
		GetStateAssemblyConstituencies: "/api/v1/state-constituencies",
		GetLGAs:                        "/api/v1/lgas",
		GetWards:                       "/api/v1/wards",
		GetPollingUnits:                "/api/v1/polling-units",
	},
	Users: UsersURLMap{
		GetMe:         "/api/v1/users/me",
		UpdateProfile: "/api/v1/users/profile",
		ListUsers:     "/api/v1/users",
	},
}
