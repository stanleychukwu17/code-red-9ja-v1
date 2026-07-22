package db

import "time"

const (
	RedisFiveYearsTTL = 5 * 365 * 24 * time.Hour
	RedisTwoYearsTTL  = 2 * 365 * 24 * time.Hour

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
	// STRING: "jwt:refresh_token:<hash>" used to store and retrieve a hashed jwt refresh token.
	// The key is a string, and the value is a JWT refresh token.
	RedisJwtRefreshToken = "jwt:refresh_token:"

	// SET: "jwt:session_tokens:<sessionID>" used to store refresh tokens that belong to a session.
	RedisSessionTokens = "jwt:session_tokens:"

	// SET: "jwt:user_login_sessions:<userFakeID>" used to store and check for existing user login sessions.
	RedisUserLoginSessions = "jwt:user_login_sessions:"

	// STRING: "jwt:user_login_locked:<userFakeID>" key used to lock token generation.
	RedisJwtUserLoginLocked = "jwt:user_login_locked:"
	//--END--

	//--START-- for user
	// STRING: user:info:<userFakeID> used to store and retrieve user info.
	RedisUserInfo = "user:info:"
	// STRING: user:more_info:<userID> used to store and retrieve user more_info.
	RedisUserMoreInfo = "user:more_info:"
	// STRING: user:roles:<userFakeID> used to store and retrieve user roles.
	RedisUserRoles = "user:roles:"
	// STRING: user:phone_numbers:<userID> used to store and retrieve user phone numbers.
	RedisUserPhoneNumbers = "user:phone_numbers:"
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
	// STRING: used to store and retrieve all parties and they details, the value is a JSON string of all parties.
	RedisPartiesList = "parties:list"
	// STRING: "parties:info:<partyID>" is used to store and retrieve party info.
	RedisPartyInfo = "parties:info:"
	// STRING: "parties:basic_info:<partyID>" is used to store and retrieve party basic info.
	RedisPartyBasicInfo = "parties:basic_info:"
	//--END--

	//--START-- for page verifications & badges
	// STRING: "page_verification_type:info:<pageVerificationType>:<pageVerificationTypeID>" gets info on one verification type
	RedisPageVerificationTypeInfo = "page_verification_type:info:"
	// STRING: "page_verifications:page:<pageType>:<pageID>" used to store and retrieve page verifications.
	RedisPageVerifications = "page_verifications:page:"
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
