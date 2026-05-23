package db

const (
	//--START-- for registration
	// SET: RedisRegisteredUsernames is the Redis set key used to store and check for existing usernames.
	RedisRegisteredUsernames = "registered_usernames"

	// SET: RedisRegisteredEmails is the Redis set key used to store and check for existing email addresses.
	RedisRegisteredEmails = "registered_emails"

	// SET: RedisRegisteredPhones is the Redis "set" key used to store and check for existing phone numbers.
	RedisRegisteredPhones = "registered_phones"

	// SET: RedisRegisteredNins is the Redis "set" key used to store and check for existing National Identification Numbers.
	RedisRegisteredNins = "registered_nins"
	//--END--

	//--START-- for login, refreshing jwt token, logout,
	// STRING: jwtRefreshToken is the Redis "string" key used to store and retrieve a hashed jwt refresh token.
	// The key is a string, and the value is a JWT refresh token.
	JwtRefreshToken = "jwt:refresh_token:"

	// SET: login_sessions is the Redis "set" key used to store and check for existing login sessions.
	LoginSessions = "login_sessions:"

	// SET: user_login_sessions is the Redis "set" key used to store and check for existing user login sessions.
	UserLoginSessions = "user_login_sessions:"
	//--END--

	//--START-- for countries and states
	// STRING: CountriesAll is the Redis "string" key used to store and retrieve all countries.
	// The key is a string, and the value is a JSON string of all countries.
	CountriesAll = "countries:all"

	// STRING: StatesByCountry is the Redis "string" key used to store and retrieve states of a country.
	// The key is a string, and the value is a JSON string of all states of a country.
	StatesByCountry = "states:country:"

	// STRING: CitiesByState is the Redis "string" key used to store and retrieve cities of a state.
	// The key is a string, and the value is a JSON string of all cities of a state.
	CitiesByState = "cities:state:"
	//--END--

)
