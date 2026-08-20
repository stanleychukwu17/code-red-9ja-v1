package db

import "time"

const (
	RedisFiveYearsTTL = 5 * 365 * 24 * time.Hour
	RedisTwoYearsTTL  = 2 * 365 * 24 * time.Hour
	RedisOneYearTTL   = 365 * 24 * time.Hour
	// RedisSixMonthsTTL = 6 * 30 * 24 * time.Hour
	// RedisOneMonthTTL  = 30 * 24 * time.Hour

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
	RedisUserInfo         = "user:info:"          // STRING: user:info:<userFakeID> used to store and retrieve user info.
	RedisUserMoreInfo     = "user:more_info:"     // STRING: user:more_info:<userID> used to store and retrieve user more_info.
	RedisUserRoles        = "user:roles:"         // STRING: user:roles:<userFakeID> used to store and retrieve user roles.
	RedisUserPhoneNumbers = "user:phone_numbers:" // STRING: user:phone_numbers:<userID> used to store and retrieve user phone numbers.
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
	RedisPartiesList        = "parties:list"                   // STRING: used to store and retrieve all parties and they details, the value is a JSON string of all parties.
	RedisPartyInfo          = "parties:info:"                  // STRING: "parties:info:<partyID>" is used to store and retrieve party info.
	RedisPartyBasicInfo     = "parties:basic_info:"            // STRING: "parties:basic_info:<partyID>" is used to store and retrieve party basic info.
	RedisChapterMemberCount = "parties:chapter:members_count:" // STRING: "parties:chapter:members_count:<chapterID>" is used to store and retrieve the number of members in each chapter of a party.
	RedisNationalChapter    = "parties:national_chapter:"      // STRING: "parties:national_chapter:<partyID>:<countryID>" is used to store the national chapter ID.
	RedisChapterSettings    = "parties:chapter_settings:"      // STRING: "parties:chapter_settings:<partyID>:<chapterID>" is used to store the chapter settings.
	//--END--

	//--START-- for page verifications & badges
	RedisPageVerificationTypesList = "page_verification_type:list"
	RedisPageVerificationTypeInfo  = "page_verification_type:info:"
	RedisPageVerifications         = "page_verifications:page:"
	//--END--

	//--START-- for political and administrative bodies
	RedisSenatorialDistrictsByState         = "bodies:senatorial_districts:state:"
	RedisFederalConstituenciesByState       = "bodies:federal_constituencies:state:"
	RedisStateConstituenciesByState = "bodies:state_constituencies:state:"
	RedisLGAsByState                        = "bodies:lgas:state:"
	RedisWardsByLGA                         = "bodies:wards:lga:"
	RedisPollingUnitsByWard                 = "bodies:polling_units:ward:"
	//--END--
)
