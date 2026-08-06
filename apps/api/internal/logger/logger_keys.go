package logger

// Components
const (
	ComponentAuthService              = "auth_service"
	ComponentCountriesHandler         = "countries_handler"
	ComponentMessagingService         = "messaging_service"
	ComponentRouter                   = "router"
	ComponentPageVerificationsService = "page_verifications_service"
)

// Events & Operations
const (
	EventUserLoginSuccess     = "user_login_success"
	EventTokenRefreshSuccess  = "token_refresh_success"
	EventUserLogoutSuccess    = "user_logout_success"
	EventSendingOTP           = "sending_otp"
	EventHTTPRequest          = "http_request"
	EventRedisPipelineFailed  = "redis_pipeline_failed"
	EventFetchCountriesFailed = "fetch_countries_failed"
	EventInvalidCountryID     = "invalid_country_id"
	EventFetchStatesFailed    = "fetch_states_failed"
	EventInvalidStateID       = "invalid_state_id"
	EventFetchCitiesFailed    = "fetch_cities_failed"
	EventAuditLogFailed       = "audit_log_failed"
)


