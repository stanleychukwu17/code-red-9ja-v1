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
	RedisUserInfo                = "user:info:"               // Core profile only; relationships are hydrated separately.
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
	RedisPartiesList                = "parties:list"                     // STRING: used to store and retrieve all parties and they details, the value is a JSON string of all parties.
	RedisPartyInfo                  = "parties:info:"                    // STRING: "parties:info:<partyID>" is used to store and retrieve party info.
	RedisPartyBasicInfo             = "parties:basic_info:"              // STRING: "parties:basic_info:<partyID>" is used to store and retrieve party basic info.
	RedisPartyByID                  = "parties:by_id:"                   // STRING: "parties:by_id:<partyID>" stores cached full party record.
	RedisPartyWallet                = "parties:wallet:"                  // STRING: "parties:wallet:<partyID>" is used to store and retrieve cached party wallet.
	RedisGlobalSlotCost             = "system:setting:slot_cost_kobo"    // STRING: stores the global slot price in Kobo.
	RedisChapterMemberCount         = "parties:chapter:members_count:"   // STRING: "parties:chapter:members_count:<partyID>:<chapterID>" is used to store and retrieve the number of members in each chapter of a party.
	RedisNationalChapter            = "parties:national_chapter:"        // STRING: "parties:national_chapter:<partyID>:<countryID>" is used to store the national chapter ID.
	RedisZonalChapter               = "parties:zonal_chapter:"           // STRING: "parties:zonal_chapter:<partyID>:<zonalID>" is used to store the zonal chapter ID.
	RedisStateChapter               = "parties:state_chapter:"           // STRING: "parties:state_chapter:<partyID>:<stateID>" is used to store the state chapter ID.
	RedisLGAChapter                 = "parties:lga_chapter:"             // STRING: "parties:lga_chapter:<partyID>:<lgaID>" is used to store the LGA chapter ID.
	RedisWardChapter                = "parties:ward_chapter:"            // STRING: "parties:ward_chapter:<partyID>:<wardID>" is used to store the ward chapter ID.
	RedisPartyChapter               = "parties:chapter:"                 // STRING: "parties:chapter:<chapterID>" stores cached party chapter details.
	RedisParties5MemberAvatars      = "parties:sample_member_avatars:"   // STRING: "parties:sample_member_avatars:<partyID>:<chapterID>" is used to store sample member avatars for a party chapter.
	RedisChapterOfficial            = "parties:chapter:official:"        // STRING: "parties:chapter:official:<chapterID>:<positionID>" is used to store active official for a chapter and position.
	RedisPartyChapterOfficials      = "parties:chapter_officials:"       // STRING: "parties:chapter_officials:<partyID>:<chapterID>" stores cached JSON array of chapter officials
	RedisPartyMemberSuspension      = "parties:member_suspension:"       // STRING: "parties:member_suspension:<partyID>:<userID>" stores cached active suspension JSON (id > 0 if suspended, id = 0 if not)
	RedisPartyMemberPositions       = "parties:member_positions:"        // STRING: "parties:member_positions:<partyID>:<userID>" stores cached JSON array of member positions assignments
	RedisPartyMember                = "parties:member:"                  // STRING: "parties:member:<partyID>:<userID>" stores cached party-wide membership booleans
	RedisPartyChapterMember         = "parties:chapter_member:"          // STRING: "parties:chapter_member:<partyID>:<chapterID>:<userID>" stores cached membership booleans
	RedisPartyChapterFollower       = "parties:chapter_follower:"        // STRING: "parties:chapter_follower:<partyID>:<chapterID>:<userID>" stores cached following booleans
	RedisPartyChapterFollowersCount = "parties:chapter:followers_count:" // STRING: "parties:chapter:followers_count:<partyID>:<chapterID>" stores cached count of followers for a chapter
	RedisPartyDefaultPositions      = "parties:default_party_positions"  // STRING: "parties:default_party_positions" stores cached JSON array of default party positions
	RedisPartyCustomPositions       = "parties:custom_party_positions:"  // STRING: "parties:custom_party_positions:<partyID>" stores cached JSON array of custom party positions
	RedisPartyPositionByID          = "parties:position_by_id:"          // STRING: "parties:position_by_id:<partyID>:<positionID>" stores cached single party position JSON
	RedisUserPartyChapters          = "parties:user_chapters:"           // STRING: "parties:user_chapters:<partyID>:<userID>" stores cached JSON array of user party chapters
	//--END--

	//--START-- for campaign groups and operations
	RedisCampaignGroupByID       = "campaign_groups:info:"      // STRING: "campaign_groups:info:<groupID>" stores cached JSON object of campaign group
	RedisCampaignGroupMembers    = "campaign_groups:members:"   // STRING: "campaign_groups:members:<groupID>" stores cached JSON array of campaign group members
	RedisCampaignGroupSyncLock   = "campaign_groups:sync_lock:" // STRING: "campaign_groups:sync_lock:<groupID>" cooldown lock preventing repeated db syncing
	//--END--

	//--START-- for page verifications & badges
	RedisPageVerificationTypesList = "page_verification_type:list"
	RedisPageVerificationTypeInfo  = "page_verification_type:info:"
	RedisPageVerifications         = "page_verifications:page:"
	//--END--

	//--START-- for political and administrative bodies
	RedisEachZone                          = "bodies:each_zone:"
	RedisEachLGA                           = "bodies:each_lga:"
	RedisEachWard                          = "bodies:each_ward:"
	RedisEachSenatorialDistrict            = "bodies:each_senatorial_district:"
	RedisEachFederalConstituency           = "bodies:each_federal_constituency:"
	RedisEachStateConstituency             = "bodies:each_state_constituency:"
	RedisEachPollingUnit                   = "bodies:each_polling_unit:"
	RedisSenatorialDistrictsAll            = "bodies:senatorial_districts:all"           // STRING: "bodies:senatorial_districts:all"
	RedisSenatorialDistrictsByState        = "bodies:senatorial_districts:state:"        // STRING: "bodies:senatorial_districts:state:<stateID>"
	RedisFederalConstituenciesAll          = "bodies:federal_constituencies:all"         // STRING: "bodies:federal_constituencies:all"
	RedisFederalConstituenciesByState      = "bodies:federal_constituencies:state:"      // STRING: "bodies:federal_constituencies:state:<stateID>"
	RedisFederalConstituenciesBySenatorial = "bodies:federal_constituencies:senatorial:" // STRING: "bodies:federal_constituencies:senatorial:<senatorialDistrictID>"
	RedisStateConstituenciesAll            = "bodies:state_constituencies:all"           // STRING: "bodies:state_constituencies:all"
	RedisStateConstituenciesByState        = "bodies:state_constituencies:state:"        // STRING: "bodies:state_constituencies:state:<stateID>"
	RedisStateConstituenciesByFederal      = "bodies:state_constituencies:federal:"      // STRING: "bodies:state_constituencies:federal:<federalConstituencyID>"
	RedisLGAsAll                           = "bodies:lgas:all"                           // STRING: "bodies:lgas:all"
	RedisLGAsByState                       = "bodies:lgas:state:"                        // STRING: "bodies:lgas:state:<stateID>"
	RedisWardsByState                      = "bodies:wards:state:"                       // STRING: "bodies:wards:state:<stateID>"
	RedisWardsByLGA                        = "bodies:wards:lga:"                         // STRING: "bodies:wards:lga:<lgaID>"
	RedisPollingUnitsByWard                = "bodies:polling_units:ward:"                // STRING: "bodies:polling_units:ward:<wardID>"
	RedisPollingUnitsByLGA                 = "bodies:polling_units:lga:"                 // STRING: "bodies:polling_units:lga:<lgaID>"
	RedisNationalMetrics                   = "bodies:national_metrics"
	//--END--

	//--START-- for offices
	RedisOfficesAll = "offices:all" // STRING: used to store and retrieve all offices JSON.
	//--END--

	//--START-- for elections and election groups
	RedisElectionGroupsAll     = "election_groups:all"         // STRING: used to store and retrieve all election groups JSON.
	RedisElectionGroupsActive  = "election_groups:active"      // STRING: used to store and retrieve active election groups JSON.
	RedisElectionGroupByID     = "election_group:"             // STRING: "election_group:<id>" used to store and retrieve single election group JSON.
	RedisElectionGroupByFakeID = "election_group:fake:"        // STRING: "election_group:fake:<fake_id>" used to store and retrieve single election group JSON.
	RedisElectionByID          = "election:"                   // Raw election record; cached for 180 days.
	RedisElectionByFakeID      = "election:fake:"              // Raw election record by fake_id; cached for 180 days.
	RedisUserActiveCandidacies = "elections:user_candidacies:" // Active candidacies for user; cached for 30 days.
	//--END--

	//--START-- for background worker & cron distributed locks
	RedisCronLockINECGrabberSync           = "cron:lock:inec_grabber_sync"        // STRING: distributed lock to prevent duplicate concurrent INEC IReV result syncing
	RedisCronLockMarketingDeductionsPrefix = "cron:lock:marketing_deductions:"    // STRING: "cron:lock:marketing_deductions:<YYYY-MM-DD>" daily marketing deductions lock
	RedisLockElectoralUnitsSync            = "bodies:lock:electoral_units_sync"   // STRING: distributed lock to prevent duplicate electoral units sync (24h in prod, 30m in dev)
	RedisElectoralUnitsSyncStatus          = "bodies:status:electoral_units_sync" // STRING: holds current/last sync status JSON
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
	RedisPartyByID,
	RedisPartyWallet,
	RedisGlobalSlotCost,
	RedisChapterMemberCount,
	RedisNationalChapter,
	RedisZonalChapter,
	RedisStateChapter,
	RedisLGAChapter,
	RedisWardChapter,
	RedisPartyChapter,
	RedisParties5MemberAvatars,
	RedisChapterOfficial,
	RedisPartyChapterOfficials,
	RedisPartyMemberSuspension,
	RedisPartyMemberPositions,
	RedisPartyMember,
	RedisPartyChapterMember,
	RedisPartyChapterFollower,
	RedisPartyChapterFollowersCount,
	RedisPartyDefaultPositions,
	RedisPartyCustomPositions,
	RedisPartyPositionByID,
	RedisUserPartyChapters,
	RedisPageVerificationTypesList,
	RedisPageVerificationTypeInfo,
	RedisPageVerifications,
	RedisEachZone,
	RedisEachLGA,
	RedisEachWard,
	RedisEachSenatorialDistrict,
	RedisEachFederalConstituency,
	RedisEachStateConstituency,
	RedisEachPollingUnit,
	RedisSenatorialDistrictsAll,
	RedisSenatorialDistrictsByState,
	RedisFederalConstituenciesAll,
	RedisFederalConstituenciesByState,
	RedisFederalConstituenciesBySenatorial,
	RedisStateConstituenciesAll,
	RedisStateConstituenciesByState,
	RedisStateConstituenciesByFederal,
	RedisLGAsAll,
	RedisLGAsByState,
	RedisWardsByState,
	RedisWardsByLGA,
	RedisPollingUnitsByWard,
	RedisPollingUnitsByLGA,
	RedisNationalMetrics,
	RedisOfficesAll,
	RedisElectionGroupsAll,
	RedisElectionGroupsActive,
	RedisElectionGroupByID,
	RedisElectionGroupByFakeID,
	RedisElectionByID,
	RedisElectionByFakeID,
	RedisUserActiveCandidacies,
	RedisCronLockINECGrabberSync,
	RedisCronLockMarketingDeductionsPrefix,
	RedisLockElectoralUnitsSync,
	RedisElectoralUnitsSyncStatus,
	RedisUserBlockedPartyIDs,
	RedisCampaignGroupByID,
	RedisCampaignGroupMembers,
	RedisCampaignGroupSyncLock,
}
