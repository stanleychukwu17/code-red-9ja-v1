package db

const (
	//--START-- for registration
	// STRING: RedisRegisterOnboarding is the Redis key prefix used to store onboarding data.
	RedisRegisterOnboarding = "register:onboarding:"

	// STRING: Keys used to map registration details to user fake ID
	RedisUsernameFakeID = "register:username_user_fake_id:"
	RedisEmailFakeID    = "register:email_user_fake_id:"
	RedisPhoneFakeID    = "register:phone_user_fake_id:"
	RedisNINFakeID      = "register:nin_user_fake_id:"
	RedisChangePassword = "register:user_change_password:"
	//--END--

	//--START-- for login, refreshing jwt token, logout,
	// STRING: "jwt:refresh_token:<hash>" is the Redis "string" key used to store and retrieve a hashed jwt refresh token.
	// The key is a string, and the value is a JWT refresh token.
	RedisJwtRefreshToken = "jwt:refresh_token:"

	// SET: "jwt:session_tokens:<sessionID>" is used to store refresh tokens that belong to a session.
	RedisSessionTokens = "jwt:session_tokens:"

	// SET: "jwt:user_login_sessions:<userFakeID>" is the Redis "set" key used to store and check for existing user login sessions.
	RedisUserLoginSessions = "jwt:user_login_sessions:"

	// STRING: "jwt:user_login_locked:<userFakeID>" is the Redis "string" key used to lock token generation.
	RedisJwtUserLoginLocked = "jwt:user_login_locked:"

	// STRING: user:info:<userFakeID> is the Redis "string" key used to store and retrieve user info.
	RedisUserInfo = "user:info:"
	//--END--

	//--START-- for countries and states
	// STRING:  "countries:each_country:<countryID>" holds one country at a time and the country details
	RedisEachCountry = "countries:each_country:"
	RedisEachState   = "countries:each_state:"
	RedisEachCity    = "countries:each_city:"

	// STRING: used to store and retrieve all countries and they details, the value is a JSON string of all countries.
	RedisCountriesAll = "countries:all"

	// STRING: "countries:states:<countryID>" is used to store and retrieve states of a country.
	RedisStatesByCountry = "countries:states:"

	// STRING: "countries:cities:<stateID>" is used to store and retrieve cities of a state.
	RedisCitiesByState = "countries:cities:"
	//--END--

	//--START-- for parties
	RedisPartyInfo = "parties:info:"
	RedisPartyBasicInfo = "parties:basic_info:"
	//--END--

	//--START-- for political and administrative bodies
	RedisSenatorialDistrictsByState         = "bodies:senatorial_districts:state:"
	RedisFederalConstituenciesByState       = "bodies:federal_constituencies:state:"
	RedisStateAssemblyConstituenciesByState = "bodies:state_assembly_constituencies:state:"
	RedisLGAsByState                        = "bodies:lgas:state:"
	RedisWardsByLGA                         = "bodies:wards:lga:"
	RedisPollingUnitsByWard                 = "bodies:polling_units:ward:"
	//--END--
)
