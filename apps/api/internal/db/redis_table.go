package db

const (
	//--START-- for registration
	// SET: RedisRegisteredUsernames is the Redis set key used to store and check for existing usernames.
	RedisRegisteredUsernames = "register:registered_usernames"

	// SET: RedisRegisteredEmails is the Redis set key used to store and check for existing email addresses.
	RedisRegisteredEmails = "register:registered_emails"

	// SET: RedisRegisteredPhones is the Redis "set" key used to store and check for existing phone numbers.
	RedisRegisteredPhones = "register:registered_phones"

	// SET: RedisRegisteredNins is the Redis "set" key used to store and check for existing National Identification Numbers.
	RedisRegisteredNins = "register:registered_nins"
	//--END--

	//--START-- for login, refreshing jwt token, logout,
	// STRING: "jwt:refresh_token:<hash>" is the Redis "string" key used to store and retrieve a hashed jwt refresh token.
	// The key is a string, and the value is a JWT refresh token.
	RedisJwtRefreshToken = "jwt:refresh_token:"

	// SET: "jwt:login_sessions:<sessionID>" is the Redis "set" key used to store and check for existing login sessions.
	RedisLoginSessions = "jwt:login_sessions:"

	// SET: "jwt:user_login_sessions:<userFakeID>" is the Redis "set" key used to store and check for existing user login sessions.
	RedisUserLoginSessions = "jwt:user_login_sessions:"

	// STRING: user:info:<userFakeID> is the Redis "string" key used to store and retrieve user info.
	RedisUserInfo = "user:info:"
	//--END--

	//--START-- for countries and states
	// STRING: "countries:all" is the Redis "string" key used to store and retrieve all countries.
	// The key is a string, and the value is a JSON string of all countries.
	CountriesAll = "countries:all"

	// STRING: "countries:states:<country_id>" is the Redis "string" key used to store and retrieve states of a country.
	// The key is a string, and the value is a JSON string of all states of a country.
	StatesByCountry = "countries:states:"

	// STRING: "countries:cities:<state_id>" is the Redis "string" key used to store and retrieve cities of a state.
	// The key is a string, and the value is a JSON string of all cities of a state.
	CitiesByState = "countries:cities:"
	//--END--

)
