package db

import "time"

const (
	// Reusable duration TTLs
	RedisFifteenMinutesTTL = 15 * time.Minute
	RedisOneHourTTL        = 1 * time.Hour
	RedisOneDayTTL         = 24 * time.Hour
	RedisSevenDaysTTL      = 7 * 24 * time.Hour
	RedisFourteenDaysTTL   = 14 * 24 * time.Hour
	RedisThirtyDaysTTL     = 30 * 24 * time.Hour
	RedisSixtyDaysTTL      = 60 * 24 * time.Hour
	RedisNinetyDaysTTL     = 90 * 24 * time.Hour
	RedisOneEightyDaysTTL  = 180 * 24 * time.Hour
	RedisOneYearTTL        = 365 * 24 * time.Hour

	//--START-- for registration
	RedisRegisterEmailOtp         = "register:email_otp:"
	RedisRegisterEmailOtpVerified = "register:email_otp_verified:"
	//--END--

	//--START-- for login, refreshing jwt token, logout,
	RedisJwtRefreshToken    = "jwt:refresh_token:"       // STRING: "jwt:refresh_token:<hash>" used to store and retrieve a hashed jwt refresh token. The key is a string, and the value is a JWT refresh token.
	RedisSessionTokens      = "jwt:session_tokens:"      // SET: "jwt:session_tokens:<sessionID>" used to store refresh tokens that belong to a session.
	RedisUserLoginSessions  = "jwt:user_login_sessions:" // SET: "jwt:user_login_sessions:<userFakeID>" used to store and check for existing user login sessions.
	RedisJwtUserLoginLocked = "jwt:user_login_locked:"   // STRING: "jwt:user_login_locked:<userFakeID>" key used to lock token generation.
	//--END--

	//--START-- for user
	RedisUserInfo                = "user:info:"               // STRING: user:info:<userFakeID> used to store and retrieve user info.
	RedisUserMoreInfo            = "user:more_info:"          // STRING: user:more_info:<userID> used to store and retrieve user more_info.
	RedisUserRoles               = "user:roles:"              // STRING: user:roles:<userID> used to store and retrieve user roles.
	RedisUserPreferences         = "user:preferences:"        // STRING: user:preferences:<userID> used to store and retrieve user preferences.
	RedisNotificationPreferences = "user:notification_prefs:" // STRING: user:notification_prefs:<userID> used to store notification preferences.
	RedisReferralCode            = "user:referral_code:"      // STRING: user:referral_code:<code> used to store cached referrer info JSON (id, name).
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
	RedisPartiesList           = "parties:list"                   // STRING: used to store and retrieve all parties and they details, the value is a JSON string of all parties.
	RedisPartyInfo             = "parties:info:"                  // STRING: "parties:info:<partyID>" is used to store and retrieve party info.
	RedisPartyBasicInfo        = "parties:basic_info:"            // STRING: "parties:basic_info:<partyID>" is used to store and retrieve party basic info.
	RedisChapterMemberCount    = "parties:chapter:members_count:" // STRING: "parties:chapter:members_count:<chapterID>" is used to store and retrieve the number of members in each chapter of a party.
	RedisNationalChapter       = "parties:national_chapter:"      // STRING: "parties:national_chapter:<partyID>:<countryID>" is used to store the national chapter ID.
	RedisZonalChapter          = "parties:zonal_chapter:"         // STRING: "parties:zonal_chapter:<partyID>:<zonalID>" is used to store the zonal chapter ID.
	RedisStateChapter          = "parties:state_chapter:"         // STRING: "parties:state_chapter:<partyID>:<stateID>" is used to store the state chapter ID.
	RedisLGAChapter            = "parties:lga_chapter:"           // STRING: "parties:lga_chapter:<partyID>:<lgaID>" is used to store the LGA chapter ID.
	RedisWardChapter           = "parties:ward_chapter:"          // STRING: "parties:ward_chapter:<partyID>:<wardID>" is used to store the ward chapter ID.
	RedisParties5MemberAvatars = "parties:sample_member_avatars:" // STRING: "parties:sample_member_avatars:<partyID>" is used to store sample member avatars for a party.
	RedisChapterOfficial       = "parties:chapter:official:"      // STRING: "parties:chapter:official:<chapterID>:<positionID>" is used to store active official for a chapter and position.
	RedisPartyMemberSuspension = "parties:member_suspension:"     // STRING: "parties:member_suspension:<partyID>:<userID>" stores cached active suspension JSON (id > 0 if suspended, id = 0 if not)
	//--END--

	//--START-- for page verifications & badges
	RedisPageVerificationTypesList = "page_verification_type:list"
	RedisPageVerificationTypeInfo  = "page_verification_type:info:"
	RedisPageVerifications         = "page_verifications:page:"
	//--END--

	//--START-- for political and administrative bodies
	RedisSenatorialDistrictsByState   = "bodies:senatorial_districts:state:"
	RedisFederalConstituenciesByState = "bodies:federal_constituencies:state:"
	RedisStateConstituenciesByState   = "bodies:state_constituencies:state:"
	RedisLGAsByState                  = "bodies:lgas:state:"
	RedisWardsByLGA                   = "bodies:wards:lga:"
	RedisPollingUnitsByWard           = "bodies:polling_units:ward:"
	RedisNationalMetrics              = "bodies:national_metrics"
	//--END--

	//--START-- for offices
	RedisOfficesAll = "offices:all" // STRING: used to store and retrieve all offices JSON.
	//--END--

	//--START-- for elections and election groups
	RedisElectionGroupsAll = "election_groups:all" // STRING: used to store and retrieve all election groups JSON.
	RedisElectionGroupInfo = "election_group:"     // STRING: "election_group:<id>" used to store and retrieve single election group JSON.
	RedisElectionsAll      = "elections:all"       // STRING: used to store and retrieve all elections JSON.
	RedisElectionInfo      = "election:"           // STRING: "election:<id>" used to store and retrieve single election JSON.
	//--END--

	//--START-- for background worker & cron distributed locks
	RedisCronLockINECGrabberSync           = "cron:lock:inec_grabber_sync"     // STRING: distributed lock to prevent duplicate concurrent INEC IReV result syncing
	RedisCronLockMarketingDeductionsPrefix = "cron:lock:marketing_deductions:" // STRING: "cron:lock:marketing_deductions:<YYYY-MM-DD>" daily marketing deductions lock
	//--END--

	//--START-- for blocks
	RedisUserBlockedPartyIDs = "blocks:user:blocked_party_ids:" // STRING: "blocks:user:blocked_party_ids:<userID>" used to store cached JSON slice of party IDs that have blocked this user.
	//--END--
)

// AllRedisPrefixes is a list of all key prefixes and static keys used across the application.
var AllRedisPrefixes = []string{
	RedisRegisterEmailOtp,
	RedisRegisterEmailOtpVerified,
	RedisJwtRefreshToken,
	RedisSessionTokens,
	RedisUserLoginSessions,
	RedisJwtUserLoginLocked,
	RedisUserInfo,
	RedisUserMoreInfo,
	RedisUserRoles,
	RedisUserPreferences,
	RedisNotificationPreferences,
	RedisReferralCode,
	RedisEachCountry,
	RedisEachState,
	RedisEachCity,
	RedisCountriesAll,
	RedisStatesByCountry,
	RedisCitiesByState,
	RedisPartiesList,
	RedisPartyInfo,
	RedisPartyBasicInfo,
	RedisChapterMemberCount,
	RedisNationalChapter,
	RedisZonalChapter,
	RedisStateChapter,
	RedisLGAChapter,
	RedisWardChapter,
	RedisParties5MemberAvatars,
	RedisPageVerificationTypesList,
	RedisPageVerificationTypeInfo,
	RedisPageVerifications,
	RedisSenatorialDistrictsByState,
	RedisFederalConstituenciesByState,
	RedisStateConstituenciesByState,
	RedisLGAsByState,
	RedisWardsByLGA,
	RedisPollingUnitsByWard,
	RedisNationalMetrics,
	RedisOfficesAll,
	RedisElectionGroupsAll,
	RedisElectionGroupInfo,
	RedisElectionsAll,
	RedisElectionInfo,
	RedisCronLockINECGrabberSync,
	RedisCronLockMarketingDeductionsPrefix,
	RedisUserBlockedPartyIDs,
}
