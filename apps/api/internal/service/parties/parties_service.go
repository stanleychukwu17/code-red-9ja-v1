package partiesservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/constants"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	"free9ja/api/internal/service/audit"
	"free9ja/api/internal/service/notifications"
	pageverificationsservice "free9ja/api/internal/service/page_verifications"
	"free9ja/api/internal/utils"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// PartiesService manages political parties and their wallets.
type PartiesService struct {
	queries                  *queries.Queries
	pool                     *pgxpool.Pool
	rdb                      *redis.Client
	utils                    *utils.Utils
	pageVerificationsService PageVerificationsService
	usersService             UsersService
	bodiesService            BodiesService
	notificationsService     NotificationsService
	blocksService            BlocksService
	followsService           FollowsService
	auditService             audit.AuditService
	walletService            *PartiesWalletService
}

type FollowsService interface {
	FollowParty(ctx context.Context, userID int64, partyID int16, chapterID int32) error
}

// BodiesService interface defines the methods needed from the bodies service
type BodiesService interface {
	CheckCountry(ctx context.Context, countryID int16) (queries.GetCountryByIDRow, error)
	CheckZone(ctx context.Context, zoneID int16) (queries.CZonesNigerium, error)
	CheckStateByID(ctx context.Context, stateID int16) (queries.CState, error)
	CheckLGA(ctx context.Context, lgaID int32) (queries.Lga, error)
	CheckWard(ctx context.Context, wardID int32) (queries.Ward, error)
}

// BlocksService interface defines the methods needed from the blocks service
type BlocksService interface {
	GetUserBlockedPartyIDs(ctx context.Context, userID int64) map[int16]bool
	InvalidateUserBlockedPartiesCache(ctx context.Context, userID int64)
	BlockUserByParty(ctx context.Context, partyID int16, blockedUserID int64, blockedByUserID *int64) (queries.PartyUserBlock, error)
	UnblockUserByParty(ctx context.Context, partyID int16, blockedUserID int64) error
	ListBlockedUsersByParty(ctx context.Context, partyID int16, limit int32, cursor int64) ([]queries.ListBlockedUsersByPartyRow, error)
}

// UsersService interface defines the methods needed from the users service
type UsersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error)
	GetUsersByFakeIDs(ctx context.Context, fakeIDs []int64) ([]queries.UserWithPlaces, error)
	UpdateUserParty(ctx context.Context, userID int64, partyID *int16, fakeID int64) error
	StripPartyAdminRoles(ctx context.Context, userID int64, fakeID int64) error
}

// PageVerificationsService interface defines the methods needed from the page verifications service
type PageVerificationsService interface {
	GetPageVerifications(ctx context.Context, pageType string, pageID int64) ([]queries.GetPageVerificationsRow, error)
	EnsureOfficialVerification(ctx context.Context, userID int64, verificationTypeID int16) error
	RevokeOfficialVerificationIfNoActivePosition(ctx context.Context, userID int64, chapterType string, verificationTypeID int16) error
	RevokeAllOfficialVerificationsIfNoActivePosition(ctx context.Context, userID int64) error
	InvalidateCache(ctx context.Context, pageType string, pageID int64)
}

// NotificationsService defines methods required for dispatching notifications
type NotificationsService interface {
	NotifyPartyMemberSuspended(ctx context.Context, params notifications.NotifyPartyMemberSuspendedParams)
	NotifyPartyMemberReinstated(ctx context.Context, params notifications.NotifyPartyMemberReinstatedParams)
	NotifyPartyUserBlocked(ctx context.Context, params notifications.NotifyPartyUserBlockedParams)
	NotifyPartyUserUnblocked(ctx context.Context, params notifications.NotifyPartyUserUnblockedParams)
	NotifyNewMemberJoined(ctx context.Context, params notifications.NotifyNewMemberJoinedParams)
	NotifyPartyOfficialAppointed(ctx context.Context, params notifications.NotifyPartyOfficialAppointedParams)
	NotifyPartyOfficialVacated(ctx context.Context, params notifications.NotifyPartyOfficialVacatedParams)
}

// NewPartiesService creates a new PartiesService.
func NewPartiesService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client, u *utils.Utils, ns NotificationsService, bs BlocksService, as audit.AuditService, bodiesService BodiesService, usersService UsersService) *PartiesService {
	return &PartiesService{
		queries:              q,
		pool:                 pool,
		rdb:                  rdb,
		utils:                u,
		notificationsService: ns,
		blocksService:        bs,
		auditService:         as,
		bodiesService:        bodiesService,
		usersService:         usersService,
	}
}

// SetPageVerificationsService sets the PageVerificationsService to avoid circular dependency in constructor.
func (s *PartiesService) SetPageVerificationsService(pvs PageVerificationsService) {
	s.pageVerificationsService = pvs
}

// SetWalletService sets the PartiesWalletService to avoid circular dependency in constructor.
func (s *PartiesService) SetWalletService(ws *PartiesWalletService) {
	s.walletService = ws
}

// SetFollowsService sets the service used to follow chapters after joining.
func (s *PartiesService) SetFollowsService(fs FollowsService) {
	s.followsService = fs
}

// CreateParty inserts a party into the database and provisions a wallet for it.
func (s *PartiesService) CreateParty(ctx context.Context, shortName, name, logo string, logoFileID *int64, displayOrder int32, colorHex, darkColorHex, coverImage *string, coverImageFileID *int64, coverPositionY *int16, dateFounded *string) (queries.Party, error) {
	party, err := s.queries.CreateParty(ctx, queries.CreatePartyParams{
		ShortName:        shortName,
		Name:             name,
		Logo:             logo,
		LogoFileID:       utils.PgInt8FromPtr(logoFileID),
		DisplayOrder:     displayOrder,
		ColorHex:         utils.PgTextFromPtr(colorHex),
		DarkColorHex:     utils.PgTextFromPtr(darkColorHex),
		CoverImage:       utils.PgTextFromPtr(coverImage),
		CoverImageFileID: utils.PgInt8FromPtr(coverImageFileID),
		CoverPositionY:   utils.PgInt2FromPtr(coverPositionY, 50),
		DateFounded:      utils.PgDateFromPtr(dateFounded),
	})
	if err != nil {
		return queries.Party{}, err
	}

	// Provision wallet directly (best-effort).
	if _, walletErr := s.walletService.CreatePartyWallet(ctx, party); walletErr != nil {
		// Log but don't fail — party creation must succeed either way.
		_ = walletErr
	}

	// Invalidate parties listings cache
	s.InvalidatePartyCache(ctx, party.ID)

	return party, nil
}

// GetPartyBasicInfo retrieves basic party info.
func (s *PartiesService) GetPartyBasicInfo(ctx context.Context, partyID int16) *queries.PartyBasicInfoWithVerifications {
	if partyID <= 0 {
		return nil
	}

	redisKey := fmt.Sprintf("%s%d", db.RedisPartyBasicInfo, partyID)

	// Try to get from Redis
	cachedData, err := s.rdb.Get(ctx, redisKey).Result()
	if err == nil {
		var party queries.PartyBasicInfoWithVerifications
		if err := json.Unmarshal([]byte(cachedData), &party); err == nil {
			return &party
		}
	}

	partyRow, err := s.queries.GetPartyBasicInfo(ctx, partyID)
	if err != nil {
		return nil
	}

	party := queries.PartyBasicInfoWithVerifications{
		GetPartyBasicInfoRow: partyRow,
	}

	// Only fetch verifications if the party is flagged as verified
	if partyRow.IsVerified.Bool {
		verifications, _ := s.pageVerificationsService.GetPageVerifications(ctx, db.PageTypeParty, int64(partyID))
		if verifications != nil {
			party.Verifications = verifications
		}
	}

	// Save to Redis
	if partyData, err := json.Marshal(party); err == nil {
		s.rdb.Set(ctx, redisKey, partyData, db.RedisOneEightyDaysTTL)
	}

	return &party
}

// IsPartyAcceptingApplications checks if a party meets all criteria to accept agent applications.
func (s *PartiesService) IsPartyAcceptingApplications(ctx context.Context, partyID int16) (bool, error) {
	return s.queries.IsPartyAcceptingApplications(ctx, partyID)
}

// GetAcceptingPartyIDs returns a set (as map[int16]bool) of party IDs currently accepting agent applications.
func (s *PartiesService) GetAcceptingPartyIDs(ctx context.Context) (map[int16]bool, error) {
	ids, err := s.queries.GetAcceptingPartyIDs(ctx)
	if err != nil {
		return nil, err
	}
	acceptingMap := make(map[int16]bool, len(ids))
	for _, id := range ids {
		acceptingMap[id] = true
	}
	return acceptingMap, nil
}

// GetPartyInfo returns a party if the provided optional partyID is valid.
func (s *PartiesService) GetPartyInfo(ctx context.Context, partyID int16) *queries.PartyWithVerifications {
	if partyID <= 0 {
		return nil
	}

	redisKey := fmt.Sprintf("%s%d", db.RedisPartyInfo, partyID)

	// Try to get from Redis
	cachedData, err := s.rdb.Get(ctx, redisKey).Result()
	if err == nil {
		var party queries.PartyWithVerifications
		if err := json.Unmarshal([]byte(cachedData), &party); err == nil {
			return &party
		}
	}

	partyRow, err := s.GetPartyByID(ctx, int16(partyID))
	if err == nil {
		party := queries.PartyWithVerifications{
			ListPartiesRow: queries.ListPartiesRow{
				ID:               partyRow.ID,
				ShortName:        partyRow.ShortName,
				Name:             partyRow.Name,
				Logo:             partyRow.Logo,
				LogoFileID:       partyRow.LogoFileID,
				CoverImage:       partyRow.CoverImage,
				CoverImageFileID: partyRow.CoverImageFileID,
				CoverPositionY:   partyRow.CoverPositionY,
				DisplayOrder:     partyRow.DisplayOrder,
				Status:           partyRow.Status,
				Slots:            partyRow.Slots,
				IsVerified:       partyRow.IsVerified,
				ColorHex:         partyRow.ColorHex,
				DarkColorHex:     partyRow.DarkColorHex,
				DateFounded:      partyRow.DateFounded,
				CreatedAt:        partyRow.CreatedAt,
				UpdatedAt:        partyRow.UpdatedAt,
			},
		}

		if partyRow.IsVerified.Bool {
			verifications, _ := s.pageVerificationsService.GetPageVerifications(ctx, db.PageTypeParty, int64(partyID))
			if verifications != nil {
				party.Verifications = verifications
			}
		}

		// Save to Redis
		if partyData, err := json.Marshal(party); err == nil {
			s.rdb.Set(ctx, redisKey, partyData, db.RedisOneEightyDaysTTL)
		}
		return &party
	}
	return nil
}

// ListParties returns all parties ordered by ID ascending.
func (s *PartiesService) ListParties(ctx context.Context) ([]queries.PartyWithVerifications, error) {
	redisKey := db.RedisPartiesList

	// Try to get from Redis
	cachedData, err := s.rdb.Get(ctx, redisKey).Result()
	if err == nil {
		var parties []queries.PartyWithVerifications
		if err := json.Unmarshal([]byte(cachedData), &parties); err == nil {
			return parties, nil
		}
	}

	// fetch from db using the status and display order
	partyRows, err := s.queries.ListParties(ctx)
	if err != nil {
		return nil, err
	}

	// Transform rows into response models
	var parties []queries.PartyWithVerifications
	for _, p := range partyRows {
		party := queries.PartyWithVerifications{
			ListPartiesRow: p,
		}

		// Attach verification details if party is verified
		if p.IsVerified.Bool {
			verifications, _ := s.pageVerificationsService.GetPageVerifications(ctx, db.PageTypeParty, int64(p.ID))
			if verifications != nil {
				party.Verifications = verifications
			}
		}

		// append party to parties list
		parties = append(parties, party)
	}

	// Save to Redis
	if partyData, err := json.Marshal(parties); err == nil {
		s.rdb.Set(ctx, redisKey, partyData, db.RedisOneEightyDaysTTL)
	}

	return parties, nil
}

type PartyOfficialCard struct {
	PositionID   int32   `json:"position_id"`
	PositionName string  `json:"position_name"`
	RankOrder    int16   `json:"rank_order"`
	UserID       *int64  `json:"user_id,omitempty"`
	Name         *string `json:"name,omitempty"`
	Username     *string `json:"username,omitempty"`
	Avatar       *string `json:"avatar,omitempty"`
	Since        *string `json:"since,omitempty"`
	IsVacant     bool    `json:"is_vacant"`
}

type PartySampleMember struct {
	UserID    int64  `json:"user_id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Username  string `json:"username"`
	Avatar    string `json:"avatar"`
}

type PartyCard struct {
	ID             int16               `json:"id"`
	ShortName      string              `json:"short_name"`
	Name           string              `json:"name"`
	Logo           string              `json:"logo"`
	DisplayOrder   int32               `json:"display_order"`
	Status         string              `json:"status"`
	IsVerified     bool                `json:"is_verified"`
	ColorHex       *string             `json:"color_hex,omitempty"`
	DarkColorHex   *string             `json:"dark_color_hex,omitempty"`
	DateFounded    *string             `json:"date_founded,omitempty"`
	CoverImage     *string             `json:"cover_image,omitempty"`
	CoverPositionY *int16              `json:"cover_position_y,omitempty"`
	ChapterID      int32               `json:"chapter_id"`
	TotalMembers   int64               `json:"total_members"`
	SampleMembers  []PartySampleMember `json:"sample_members"`
	Officials      []PartyOfficialCard `json:"officials"`
	IsUserMember   bool                `json:"is_user_member"`
}

// GetPartySampleMemberAvatars retrieves sample member avatars for a party chapter, cached in Redis.
func (s *PartiesService) GetPartySampleMemberAvatars(ctx context.Context, partyID int16, chapterID int32) ([]PartySampleMember, error) {
	if partyID <= 0 || chapterID <= 0 {
		return []PartySampleMember{}, nil
	}

	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisParties5MemberAvatars, partyID, chapterID)

	// Try to get from Redis
	if cachedData, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		var sampleMembers []PartySampleMember
		if err := json.Unmarshal([]byte(cachedData), &sampleMembers); err == nil {
			return sampleMembers, nil
		}
	}

	// Fetch sample member avatars from the database
	avatars, err := s.queries.GetPartySampleMemberAvatars(ctx, queries.GetPartySampleMemberAvatarsParams{
		PartyID:   partyID,
		ChapterID: chapterID,
	})
	if err != nil {
		return nil, err
	}

	// Map database records into PartySampleMember
	sampleMembers := make([]PartySampleMember, 0, len(avatars))
	for _, a := range avatars {
		sampleMembers = append(sampleMembers, PartySampleMember{
			UserID:    a.UserID,
			FirstName: a.FirstName.String,
			LastName:  a.LastName.String,
			Username:  a.Username.String,
			Avatar:    a.Avatar.String,
		})
	}

	// Cache result in Redis
	if data, err := json.Marshal(sampleMembers); err == nil {
		_ = s.rdb.Set(ctx, cacheKey, data, db.RedisSevenDaysTTL).Err()
	}

	return sampleMembers, nil
}

// GetOnePartyChapterOfficial fetches a single active official in a chapter by position ID, cached in Redis.
func (s *PartiesService) GetOnePartyChapterOfficial(ctx context.Context, chapterID int32, positionID int32) (*PartyOfficialCard, error) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisChapterOfficial, chapterID, positionID)

	// Try to get from Redis
	if cachedData, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		var official PartyOfficialCard
		if err := json.Unmarshal([]byte(cachedData), &official); err == nil {
			return &official, nil
		}
	}

	// Fetch official assignment from DB
	off, err := s.queries.GetOnePartyChapterOfficial(ctx, queries.GetOnePartyChapterOfficialParams{
		ChapterID:  chapterID,
		PositionID: positionID,
	})

	if err != nil {
		// If position is unassigned, cache and return a vacant card
		if errors.Is(err, pgx.ErrNoRows) {
			var posName string
			switch positionID {
			case constants.PartyPositionChairmanID:
				posName = "Chairman"
			case constants.PartyPositionDeputyChairmanID:
				posName = "Deputy Chairman"
			case constants.PartyPositionSecretaryID:
				posName = "Secretary"
			default:
				posName = "Official"
			}

			vacantOfficial := PartyOfficialCard{
				PositionID:   positionID,
				PositionName: posName,
				IsVacant:     true,
			}
			// Cache vacant card
			if data, marshalErr := json.Marshal(vacantOfficial); marshalErr == nil {
				_ = s.rdb.Set(ctx, cacheKey, data, db.RedisOneEightyDaysTTL).Err()
			}
			return &vacantOfficial, nil
		}

		// Return other errors
		return nil, err
	}

	// Format display name and username
	fullName := strings.TrimSpace(off.FirstName.String + " " + off.LastName.String)
	namePtr := &fullName
	unPtr := &off.Username.String

	// Format optional avatar
	var avPtr *string
	if off.Avatar.Valid && off.Avatar.String != "" {
		avPtr = &off.Avatar.String
	}

	// Format tenure start year
	var sincePtr *string
	if off.TenureStart.Valid {
		sStr := fmt.Sprintf("since %d", off.TenureStart.Time.Year())
		sincePtr = &sStr
	}

	// Build official card
	uid := off.UserID
	official := PartyOfficialCard{
		PositionID:   off.PositionID,
		PositionName: off.PositionName,
		UserID:       &uid,
		Name:         namePtr,
		Username:     unPtr,
		Avatar:       avPtr,
		Since:        sincePtr,
		IsVacant:     false,
	}

	// Cache in Redis
	if data, err := json.Marshal(official); err == nil {
		_ = s.rdb.Set(ctx, cacheKey, data, db.RedisThirtyDaysTTL).Err()
	}

	return &official, nil
}

// GetPartyCards returns all active parties enriched with real member counts,
// sample member avatars, top national leadership positions, the user's membership status,
// and whether the user is blocked by the party.
func (s *PartiesService) GetPartyCards(ctx context.Context, userID int64, userPartyID int16) ([]PartyCard, error) {
	parties, err := s.ListParties(ctx)
	if err != nil {
		return nil, err
	}

	// 1. Fetch active national member counts per party using cached chapter member counts
	memberCountsMap := make(map[int16]int64, len(parties))
	nationalChapterIDs := make(map[int16]int32, len(parties))
	for _, p := range parties {
		if natChapterID, err := s.GetOrCreateNationalChapter(ctx, p.ID, constants.NigeriaCountryID); err == nil {
			nationalChapterIDs[p.ID] = natChapterID
			if count, err := s.GetChapterMemberCount(ctx, p.ID, natChapterID); err == nil {
				memberCountsMap[p.ID] = count
			}
		}
	}

	// 2. Fetch sample member avatars (up to 5 per party, cached in Redis)
	sampleAvatarsMap := make(map[int16][]PartySampleMember, len(parties))
	for _, p := range parties {
		natChapterID, ok := nationalChapterIDs[p.ID]
		if !ok {
			continue
		}
		if avatars, err := s.GetPartySampleMemberAvatars(ctx, p.ID, natChapterID); err == nil {
			sampleAvatarsMap[p.ID] = avatars
		}
	}

	// 3. Fetch top national officials per party (Chairman & Secretary)
	officialsMap := make(map[int16][]PartyOfficialCard, len(parties))
	for _, p := range parties {
		natChapterID, ok := nationalChapterIDs[p.ID]
		if !ok {
			continue
		}
		// Chairman (Position ID 1)
		if chair, err := s.GetOnePartyChapterOfficial(ctx, natChapterID, constants.PartyPositionChairmanID); err == nil && chair != nil {
			officialsMap[p.ID] = append(officialsMap[p.ID], *chair)
		}
		// Secretary (Position ID 4)
		if sec, err := s.GetOnePartyChapterOfficial(ctx, natChapterID, constants.PartyPositionSecretaryID); err == nil && sec != nil {
			officialsMap[p.ID] = append(officialsMap[p.ID], *sec)
		}
	}

	// 4. Fetch all parties that have blocked this user (cached 24h via BlocksService)
	blockedPartiesMap := s.blocksService.GetUserBlockedPartyIDs(ctx, userID)

	// 5. Build final PartyCard list
	cards := make([]PartyCard, 0, len(parties))
	for _, p := range parties {
		sampleMembers := sampleAvatarsMap[p.ID]
		if sampleMembers == nil {
			sampleMembers = []PartySampleMember{}
		}

		// 2 national positions (Chairman & Secretary)
		officials := officialsMap[p.ID]
		if officials == nil {
			officials = []PartyOfficialCard{}
		}

		isUserMember := userPartyID > 0 && p.ID == userPartyID
		if !isUserMember && blockedPartiesMap[p.ID] {
			continue
		}

		cards = append(cards, PartyCard{
			ID:             p.ID,
			ShortName:      p.ShortName,
			Name:           p.Name,
			Logo:           p.Logo,
			DisplayOrder:   p.DisplayOrder,
			Status:         p.Status,
			IsVerified:     p.IsVerified.Bool,
			ColorHex:       utils.PtrFromPgText(p.ColorHex),
			DarkColorHex:   utils.PtrFromPgText(p.DarkColorHex),
			DateFounded:    utils.PtrFromPgDate(p.DateFounded),
			CoverImage:     utils.PtrFromPgText(p.CoverImage),
			CoverPositionY: utils.PtrFromPgInt2(p.CoverPositionY),
			ChapterID:      nationalChapterIDs[p.ID],
			TotalMembers:   memberCountsMap[p.ID],
			SampleMembers:  sampleMembers,
			Officials:      officials,
			IsUserMember:   isUserMember,
		})
	}

	return cards, nil
}

// PartyHomeLeaderItem matches the frontend PartyLeader structure directly.
type PartyHomeLeaderItem struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Role     string  `json:"role"`
	Avatar   *string `json:"avatar,omitempty"`
	Since    *string `json:"since,omitempty"`
	Username *string `json:"username,omitempty"`
	IsVacant bool    `json:"is_vacant"`
}

func (s *PartiesService) formatHomeLeader(card PartyOfficialCard) PartyHomeLeaderItem {
	var id string
	if card.UserID != nil && *card.UserID > 0 {
		id = fmt.Sprintf("u-%d", *card.UserID)
	} else {
		id = fmt.Sprintf("pos-%d", card.PositionID)
	}

	name := "Unassigned"
	if card.Name != nil && *card.Name != "" {
		name = *card.Name
	}

	return PartyHomeLeaderItem{
		ID:       id,
		Name:     name,
		Role:     card.PositionName,
		Avatar:   card.Avatar,
		Since:    card.Since,
		Username: card.Username,
		IsVacant: card.IsVacant,
	}
}

// PartyDynamicLeadersGroup groups leadership cards for the secondary home card.
type PartyDynamicLeadersGroup struct {
	Title       string                `json:"title"`
	ChapterType string                `json:"chapter_type"`
	ChapterName *string               `json:"chapter_name,omitempty"`
	Leaders     []PartyHomeLeaderItem `json:"leaders"`
}

// PartyHomeData encapsulates all primary data displayed on the party home tab.
type PartyHomeData struct {
	NationalLeaders []PartyHomeLeaderItem    `json:"national_leaders"`
	DynamicLeaders  PartyDynamicLeadersGroup `json:"dynamic_leaders"`
}

// PartyReadinessData aggregates party info, financial status, and marketing overview for party readiness.
type PartyReadinessData struct {
	Party                queries.Party        `json:"party"`
	Wallet               *queries.PartyWallet `json:"wallet,omitempty"`
	ActiveCampaignsCount int                  `json:"active_campaigns_count"`
	HasMarketingSetup    bool                 `json:"has_marketing_setup"`
	HasSlots             bool                 `json:"has_slots"`
	HasAgentPayment      bool                 `json:"has_agent_payment"`
	HasPaymentAllocation bool                 `json:"has_payment_allocation"`
}

// GetPartyHome fetches the primary data for the party home tab (leadership cards, upcoming events, etc.).
func (s *PartiesService) GetPartyHome(ctx context.Context, partyID int16, chapterID *int32) (*PartyHomeData, error) {
	// Resolve national chapter
	natChapterID, err := s.GetOrCreateNationalChapter(ctx, partyID, constants.NigeriaCountryID)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve national chapter: %w", err)
	}

	// Fetch national leadership card (Chairman, Deputy Chairman, Secretary)
	topPositions := []struct {
		id   int32
		name string
	}{
		{id: constants.PartyPositionChairmanID, name: "Chairman"},
		{id: constants.PartyPositionDeputyChairmanID, name: "Deputy Chairman"},
		{id: constants.PartyPositionSecretaryID, name: "Secretary"},
	}

	nationalLeaders := make([]PartyHomeLeaderItem, 0, len(topPositions))
	for _, pos := range topPositions {
		official, err := s.GetOnePartyChapterOfficial(ctx, natChapterID, pos.id)
		if err == nil && official != nil {
			nationalLeaders = append(nationalLeaders, s.formatHomeLeader(*official))
		} else {
			nationalLeaders = append(nationalLeaders, s.formatHomeLeader(PartyOfficialCard{
				PositionID:   pos.id,
				PositionName: pos.name,
				IsVacant:     true,
			}))
		}
	}

	// Resolve active in-view chapter
	var activeChapter queries.PartyChapter
	hasCustomChapter := false
	if chapterID != nil && *chapterID > 0 && *chapterID != natChapterID {
		if ch, err := s.GetPartyChapterByID(ctx, *chapterID); err == nil && ch.PartyID == partyID {
			activeChapter = ch
			hasCustomChapter = true
		}
	}

	// Fetch dynamic leadership card (key state chairs or active chapter leaders)
	var dynamicGroup PartyDynamicLeadersGroup

	if !hasCustomChapter || activeChapter.ChapterType == "national" {
		// Key States: Lagos (25), FCT/Abuja (15), Kano (20)
		keyStates := []struct {
			ID   int16
			Name string
		}{
			{ID: constants.StateLagosID, Name: "Lagos"},
			{ID: constants.StateFCTAbujaID, Name: "Abuja (FCT)"},
			{ID: constants.StateKanoID, Name: "Kano"},
		}

		stateLeaders := make([]PartyHomeLeaderItem, 0, len(keyStates))
		for _, st := range keyStates {
			stateChapID, err := s.GetOrCreateStateChapter(ctx, partyID, st.ID, true)
			if err == nil && stateChapID > 0 {
				official, offErr := s.GetOnePartyChapterOfficial(ctx, stateChapID, constants.PartyPositionChairmanID)
				if offErr == nil && official != nil {
					card := *official
					card.PositionName = fmt.Sprintf("%s Chairman", st.Name)
					stateLeaders = append(stateLeaders, s.formatHomeLeader(card))
					continue
				}
			}
			stateLeaders = append(stateLeaders, s.formatHomeLeader(PartyOfficialCard{
				PositionID:   constants.PartyPositionChairmanID,
				PositionName: fmt.Sprintf("%s Chairman", st.Name),
				IsVacant:     true,
			}))
		}

		dynamicGroup = PartyDynamicLeadersGroup{
			Title:       "Key state leaders",
			ChapterType: "national",
			Leaders:     stateLeaders,
		}
	} else {
		// Active chapter in view (State, LGA, or Ward)
		chapLeaders := make([]PartyHomeLeaderItem, 0, len(topPositions))
		for _, pos := range topPositions {
			official, err := s.GetOnePartyChapterOfficial(ctx, activeChapter.ID, pos.id)
			if err == nil && official != nil {
				chapLeaders = append(chapLeaders, s.formatHomeLeader(*official))
			} else {
				chapLeaders = append(chapLeaders, s.formatHomeLeader(PartyOfficialCard{
					PositionID:   pos.id,
					PositionName: pos.name,
					IsVacant:     true,
				}))
			}
		}

		var chapName string
		switch activeChapter.ChapterType {
		case "state":
			if activeChapter.StateID.Valid && activeChapter.StateID.Int16 > 0 {
				if st, err := s.bodiesService.CheckStateByID(ctx, activeChapter.StateID.Int16); err == nil {
					chapName = st.Name + " State"
				}
			}
		case "lga":
			if activeChapter.LgaID.Valid && activeChapter.LgaID.Int32 > 0 {
				if lga, err := s.bodiesService.CheckLGA(ctx, activeChapter.LgaID.Int32); err == nil {
					chapName = lga.Name + " LGA"
				}
			}
		case "ward":
			if activeChapter.WardID.Valid && activeChapter.WardID.Int32 > 0 {
				if ward, err := s.bodiesService.CheckWard(ctx, activeChapter.WardID.Int32); err == nil {
					chapName = ward.Name + " Ward"
				}
			}
		}

		title := fmt.Sprintf("%s leaders", chapName)

		dynamicGroup = PartyDynamicLeadersGroup{
			Title:       title,
			ChapterType: activeChapter.ChapterType,
			ChapterName: &chapName,
			Leaders:     chapLeaders,
		}
	}

	return &PartyHomeData{
		NationalLeaders: nationalLeaders,
		DynamicLeaders:  dynamicGroup,
	}, nil
}

// GetPartyReadiness aggregates party profile, wallet, slots, payment allocations, and marketing summary.
func (s *PartiesService) GetPartyReadiness(ctx context.Context, partyID int16) (*PartyReadinessData, error) {
	party, err := s.GetPartyByID(ctx, partyID)
	if err != nil {
		return nil, fmt.Errorf("failed to get party: %w", err)
	}

	// Fetch party wallet (optional / best-effort)
	var walletPtr *queries.PartyWallet
	wallet, err := s.walletService.GetPartyWallet(ctx, partyID)
	if err == nil {
		walletPtr = &wallet
	}

	// Fetch marketing campaigns
	campaigns, err := s.GetPartyMarketingCampaigns(ctx, partyID)
	activeCampaignsCount := 0
	if err == nil {
		now := time.Now()
		for _, c := range campaigns {
			if !c.EndDate.Valid || c.EndDate.Time.After(now) {
				activeCampaignsCount++
			}
		}
	}

	// Check if payment allocation has any configured roles > 0
	hasPaymentAllocation := false
	if len(party.AgentPaymentAllocationKobo) > 0 {
		var allocs map[string]map[string]interface{}
		if err := json.Unmarshal(party.AgentPaymentAllocationKobo, &allocs); err == nil {
			for _, role := range allocs {
				if defVal, ok := role["default"]; ok {
					if num, ok := defVal.(float64); ok && num > 0 {
						hasPaymentAllocation = true
						break
					}
				}
			}
		}
	}

	return &PartyReadinessData{
		Party:                party,
		Wallet:               walletPtr,
		ActiveCampaignsCount: activeCampaignsCount,
		HasMarketingSetup:    activeCampaignsCount > 0,
		HasSlots:             party.Slots > 0,
		HasAgentPayment:      party.AgentPaymentBalanceKobo > 0,
		HasPaymentAllocation: hasPaymentAllocation,
	}, nil
}

// UpdateParty modifies the short name, name, logo, cover, and details of an existing party.
func (s *PartiesService) UpdateParty(ctx context.Context, id int64, shortName, name, logo string, logoFileID *int64, displayOrder int32, colorHex, darkColorHex, coverImage *string, coverImageFileID *int64, coverPositionY *int16, dateFounded *string) (queries.Party, error) {
	defer s.InvalidatePartyCache(ctx, int16(id))

	party, err := s.queries.UpdateParty(ctx, queries.UpdatePartyParams{
		ID:               int16(id),
		ShortName:        shortName,
		Name:             name,
		Logo:             logo,
		LogoFileID:       utils.PgInt8FromPtr(logoFileID),
		DisplayOrder:     displayOrder,
		ColorHex:         utils.PgTextFromPtr(colorHex),
		DarkColorHex:     utils.PgTextFromPtr(darkColorHex),
		CoverImage:       utils.PgTextFromPtr(coverImage),
		CoverImageFileID: utils.PgInt8FromPtr(coverImageFileID),
		CoverPositionY:   utils.PgInt2FromPtr(coverPositionY, 50),
		DateFounded:      utils.PgDateFromPtr(dateFounded),
	})

	s.InvalidatePartyCache(ctx, int16(id))
	return party, err
}

// DeleteParty removes a party from the database (cascades to party_wallets).
func (s *PartiesService) DeleteParty(ctx context.Context, id int64) error {
	s.InvalidatePartyCache(ctx, int16(id))
	return nil
}

// UpdatePartyDiscount sets custom discount percentage for a political party.
func (s *PartiesService) UpdatePartyDiscount(ctx context.Context, partyID int16, discountPercentage float64) (queries.Party, error) {
	if discountPercentage < 0.0 || discountPercentage > 100.0 {
		return queries.Party{}, fmt.Errorf("discount percentage must be between 0 and 100")
	}

	var numericDiscount pgtype.Numeric
	if err := numericDiscount.Scan(fmt.Sprintf("%.2f", discountPercentage)); err != nil {
		return queries.Party{}, fmt.Errorf("failed to parse discount percentage: %w", err)
	}

	defer s.InvalidatePartyCache(ctx, partyID)
	return s.queries.UpdatePartyDiscount(ctx, queries.UpdatePartyDiscountParams{
		DiscountPercentage: numericDiscount,
		ID:                 partyID,
	})
}

// DepositAllowance debits the party wallet and adds it to the party's dedicated polling agent allowance balance.
// This is executed as a database transaction.
func (s *PartiesService) DepositAllowance(ctx context.Context, partyID int16, amountKobo int64) (queries.Party, error) {
	if amountKobo <= 0 {
		return queries.Party{}, fmt.Errorf("amount must be positive")
	}

	if s.pool == nil {
		return queries.Party{}, fmt.Errorf("db pool is not configured")
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.Party{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txQueries := s.queries.WithTx(tx)

	// Get wallet details
	wallet, err := txQueries.GetPartyWalletByPartyID(ctx, partyID)
	if err != nil {
		return queries.Party{}, fmt.Errorf("wallet not found for party: %w", err)
	}

	if wallet.BalanceKobo < amountKobo {
		return queries.Party{}, fmt.Errorf("insufficient wallet balance: required %d kobo, have %d kobo", amountKobo, wallet.BalanceKobo)
	}

	// Debit the wallet
	updatedWallet, err := txQueries.DebitPartyWallet(ctx, queries.DebitPartyWalletParams{
		BalanceKobo: amountKobo,
		ID:          wallet.ID,
	})
	if err != nil {
		return queries.Party{}, fmt.Errorf("wallet debit failed: %w", err)
	}

	// Log financial transaction in party_wallet_transactions
	txRef := fmt.Sprintf("allowance-deposit-%d-%d", partyID, time.Now().UnixNano())
	_, err = txQueries.CreateWalletTransaction(ctx, queries.CreateWalletTransactionParams{
		WalletID:             wallet.ID,
		TransactionReference: txRef,
		Type:                 constants.TransactionTypeDebit,
		TransactionCategory:  constants.TxCategoryAllowanceDeposit,
		AmountKobo:           amountKobo,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            utils.PgTextFromString(""),
		PayerAccountNumber:   utils.PgTextFromString(""),
		PayerBankCode:        utils.PgTextFromString(""),
		Narration:            utils.PgTextFromString(fmt.Sprintf("Deposited NGN %.2f to polling agent allowance budget", float64(amountKobo)/100.0)),
		RawPayload:           []byte("{}"),
	})
	if err != nil {
		return queries.Party{}, fmt.Errorf("failed to log allowance deposit transaction: %w", err)
	}

	// Add to allowance balance directly in parties table
	updatedParty, err := txQueries.DepositPartyAllowance(ctx, queries.DepositPartyAllowanceParams{
		AgentPaymentBalanceKobo: amountKobo,
		ID:                      partyID,
	})
	if err != nil {
		return queries.Party{}, fmt.Errorf("failed to deposit allowance: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.Party{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Invalidate the cache for the party
	s.InvalidatePartyCache(ctx, partyID)

	return updatedParty, nil
}

// AgentPaymentRoleConfig holds the default allowance and any state-level overrides for a role.
type AgentPaymentRoleConfig struct {
	Default int64            `json:"default"`
	States  map[string]int64 `json:"states"`
}

// CanonicalAgentPaymentAllocation is the normalized structure stored in the database.
type CanonicalAgentPaymentAllocation struct {
	PollingAgent            AgentPaymentRoleConfig `json:"polling_agent"`
	WardElectionSupervisor  AgentPaymentRoleConfig `json:"ward_election_supervisor"`
	LgaElectionSupervisor   AgentPaymentRoleConfig `json:"lga_election_supervisor"`
	StateElectionSupervisor AgentPaymentRoleConfig `json:"state_election_supervisor"`
}

// HarmonizeAgentPaymentAllocation normalizes incoming allocation payloads (handling both camelCase
// and snake_case role keys) and returns canonical JSON with guaranteed valid role configurations.
func HarmonizeAgentPaymentAllocation(raw []byte) ([]byte, error) {
	var rawMap map[string]struct {
		Default *int64           `json:"default"`
		States  map[string]int64 `json:"states"`
	}
	if err := json.Unmarshal(raw, &rawMap); err != nil {
		return nil, fmt.Errorf("invalid allowances configuration: %w", err)
	}

	getRoleConfig := func(camel, snake string) (AgentPaymentRoleConfig, error) {
		cfg, exists := rawMap[camel]
		if !exists {
			cfg, exists = rawMap[snake]
		}
		if !exists || cfg.Default == nil || *cfg.Default <= 0 {
			return AgentPaymentRoleConfig{}, fmt.Errorf("missing or invalid default payment for role '%s' (must be > 0)", snake)
		}
		states := cfg.States
		if states == nil {
			states = make(map[string]int64)
		}
		return AgentPaymentRoleConfig{
			Default: *cfg.Default,
			States:  states,
		}, nil
	}

	pa, err := getRoleConfig("pollingAgent", "polling_agent")
	if err != nil {
		return nil, err
	}
	ward, err := getRoleConfig("wardElectionSupervisor", "ward_election_supervisor")
	if err != nil {
		return nil, err
	}
	lga, err := getRoleConfig("lgaElectionSupervisor", "lga_election_supervisor")
	if err != nil {
		return nil, err
	}
	state, err := getRoleConfig("stateElectionSupervisor", "state_election_supervisor")
	if err != nil {
		return nil, err
	}

	canonical := CanonicalAgentPaymentAllocation{
		PollingAgent:            pa,
		WardElectionSupervisor:  ward,
		LgaElectionSupervisor:   lga,
		StateElectionSupervisor: state,
	}

	return json.Marshal(canonical)
}

// UpdateAgentPaymentAllocationKobo updates the state-by-state polling agent payment settings for a party.
func (s *PartiesService) UpdateAgentPaymentAllocationKobo(ctx context.Context, partyID int16, allowancesJSON []byte) (queries.Party, error) {
	canonicalJSON, err := HarmonizeAgentPaymentAllocation(allowancesJSON)
	if err != nil {
		return queries.Party{}, err
	}

	defer s.InvalidatePartyCache(ctx, partyID)
	return s.queries.UpdatePartyAgentPaymentAllocationKobo(ctx, queries.UpdatePartyAgentPaymentAllocationKoboParams{
		AgentPaymentAllocationKobo: canonicalJSON,
		ID:                         partyID,
	})
}

// GetAgentPaymentAllocationKobo returns the agent_payment_allocation JSON for a party.
func (s *PartiesService) GetAgentPaymentAllocationKobo(ctx context.Context, partyID int16) (json.RawMessage, error) {
	party, err := s.GetPartyByID(ctx, partyID)
	if err != nil {
		return nil, fmt.Errorf("party not found: %w", err)
	}
	if len(party.AgentPaymentAllocationKobo) == 0 {
		return json.RawMessage("{}"), nil
	}
	return json.RawMessage(party.AgentPaymentAllocationKobo), nil
}

// UpdatePartyIsVerified updates the is_verified flag of a party.
// It also synchronizes pages_verified and invalidates the cache for the party.
func (s *PartiesService) UpdatePartyIsVerified(ctx context.Context, partyID int16, isVerified bool) error {
	err := s.queries.UpdatePartyIsVerified(ctx, queries.UpdatePartyIsVerifiedParams{
		ID:         partyID,
		IsVerified: pgtype.Bool{Bool: isVerified, Valid: true},
	})
	if err != nil {
		return err
	}

	if isVerified {
		// Ensure political_party_verified (ID: 3) is present in pages_verified
		_, _ = s.queries.AddPageVerification(ctx, queries.AddPageVerificationParams{
			PageType:           db.PageTypeParty,
			PageID:             int64(partyID),
			VerificationTypeID: 3,
		})
	} else {
		// Remove party verifications from pages_verified using existing RemovePageVerification
		verifications, _ := s.pageVerificationsService.GetPageVerifications(ctx, db.PageTypeParty, int64(partyID))
		for _, v := range verifications {
			_ = s.queries.RemovePageVerification(ctx, queries.RemovePageVerificationParams{
				ID:                 v.ID,
				PageType:           v.PageType,
				PageID:             v.PageID,
				VerificationTypeID: v.VerificationTypeID,
			})
		}
	}

	// Invalidate cache
	s.InvalidatePartyCache(ctx, partyID)

	return nil
}

// --start-- party chapters

// GetPartyChapterByID retrieves a party chapter by its ID, cached in Redis.
func (s *PartiesService) GetPartyChapterByID(ctx context.Context, chapterID int32) (queries.PartyChapter, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisPartyChapter, chapterID)
	if cached, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		var chapter queries.PartyChapter
		if err := json.Unmarshal([]byte(cached), &chapter); err == nil && chapter.ID == chapterID && chapter.ID > 0 {
			return chapter, nil
		}
	}

	chapter, err := s.queries.GetPartyChapterByID(ctx, chapterID)
	if err != nil {
		return queries.PartyChapter{}, err
	}

	if data, err := json.Marshal(chapter); err == nil {
		_ = s.rdb.Set(ctx, cacheKey, data, db.RedisOneEightyDaysTTL).Err()
	}

	return chapter, nil
}

// GetOrCreateNationalChapter retrieves the national chapter for a party in a specific country.
// When createIfMissing is true (default), it creates the chapter if it does not already exist.
// When createIfMissing is false, it returns 0 without creating the chapter if it does not exist.
func (s *PartiesService) GetOrCreateNationalChapter(ctx context.Context, partyID, countryID int16, createIfMissing ...bool) (int32, error) {
	// 1. Resolve creation mode flag (defaults to true if omitted)
	shouldCreate := true
	if len(createIfMissing) > 0 {
		shouldCreate = createIfMissing[0]
	}

	// 2. Validate that the country exists
	if _, err := s.bodiesService.CheckCountry(ctx, countryID); err != nil {
		return 0, fmt.Errorf("invalid country: %w", err)
	}

	// 3. Fast-path: Check Redis cache
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisNationalChapter, partyID, countryID)
	if valStr, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if val, err := strconv.ParseInt(valStr, 10, 32); err == nil {
			return int32(val), nil
		}
	}

	// 4. Read-only lookup: query without inserting if creation is disabled
	if !shouldCreate {
		natChapterID, err := s.queries.GetNationalChapter(ctx, queries.GetNationalChapterParams{
			PartyID:   partyID,
			CountryID: pgtype.Int2{Int16: countryID, Valid: true},
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return 0, nil // Chapter does not exist yet
			}
			return 0, fmt.Errorf("failed to get national chapter: %w", err)
		}

		// Cache found chapter ID in Redis
		_ = s.rdb.Set(ctx, cacheKey, natChapterID, db.RedisOneEightyDaysTTL).Err()
		return natChapterID, nil
	}

	// 5. Read-or-create: Upsert national chapter record in the database
	natChapterID, err := s.queries.GetOrCreateNationalChapter(ctx, queries.GetOrCreateNationalChapterParams{
		PartyID:   partyID,
		CountryID: pgtype.Int2{Int16: countryID, Valid: true},
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get or create national chapter: %w", err)
	}

	// 6. Cache newly resolved chapter ID in Redis
	_ = s.rdb.Set(ctx, cacheKey, natChapterID, db.RedisOneEightyDaysTTL).Err()
	return natChapterID, nil
}

// GetOrCreateZonalChapter retrieves the zonal chapter for a party in a specific geopolitical zone.
// When createIfMissing is true (default), it creates the chapter if it does not already exist.
// When createIfMissing is false, it returns 0 without creating the chapter if it does not exist.
func (s *PartiesService) GetOrCreateZonalChapter(ctx context.Context, partyID, zonalID int16, createIfMissing ...bool) (int32, error) {
	// 1. Resolve creation mode flag (defaults to true if omitted)
	shouldCreate := true
	if len(createIfMissing) > 0 {
		shouldCreate = createIfMissing[0]
	}

	// 2. Validate that the geopolitical zone exists
	if _, err := s.bodiesService.CheckZone(ctx, zonalID); err != nil {
		return 0, fmt.Errorf("invalid zone: %w", err)
	}

	// 3. Fast-path: Check Redis cache
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisZonalChapter, partyID, zonalID)
	if valStr, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if val, err := strconv.ParseInt(valStr, 10, 32); err == nil {
			return int32(val), nil
		}
	}

	// 4. Read-only lookup: query without inserting if creation is disabled
	if !shouldCreate {
		zonalChapterID, err := s.queries.GetZonalChapter(ctx, queries.GetZonalChapterParams{
			PartyID: partyID,
			ZonalID: pgtype.Int2{Int16: zonalID, Valid: true},
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return 0, nil // Chapter does not exist yet
			}
			return 0, fmt.Errorf("failed to get zonal chapter: %w", err)
		}

		// Cache found chapter ID in Redis
		_ = s.rdb.Set(ctx, cacheKey, zonalChapterID, db.RedisOneEightyDaysTTL).Err()
		return zonalChapterID, nil
	}

	// 5. Read-or-create: Upsert zonal chapter record in the database
	zonalChapterID, err := s.queries.GetOrCreateZonalChapter(ctx, queries.GetOrCreateZonalChapterParams{
		PartyID: partyID,
		ZonalID: pgtype.Int2{Int16: zonalID, Valid: true},
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get or create zonal chapter: %w", err)
	}

	// 6. Cache newly resolved chapter ID in Redis
	_ = s.rdb.Set(ctx, cacheKey, zonalChapterID, db.RedisOneEightyDaysTTL).Err()
	return zonalChapterID, nil
}

// GetOrCreateStateChapter retrieves the state chapter for a party in a specific state.
// When createIfMissing is true (default), it creates the chapter if it does not already exist.
// When createIfMissing is false, it returns 0 without creating the chapter if it does not exist.
func (s *PartiesService) GetOrCreateStateChapter(ctx context.Context, partyID, stateID int16, createIfMissing ...bool) (int32, error) {
	// 1. Resolve creation mode flag (defaults to true if omitted)
	shouldCreate := true
	if len(createIfMissing) > 0 {
		shouldCreate = createIfMissing[0]
	}

	// 2. Validate that the state exists
	if _, err := s.bodiesService.CheckStateByID(ctx, stateID); err != nil {
		return 0, fmt.Errorf("invalid state: %w", err)
	}

	// 3. Fast-path: Check Redis cache
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisStateChapter, partyID, stateID)
	if valStr, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if val, err := strconv.ParseInt(valStr, 10, 32); err == nil {
			return int32(val), nil
		}
	}

	// 4. Read-only lookup: query without inserting if creation is disabled
	if !shouldCreate {
		stateChapterID, err := s.queries.GetStateChapter(ctx, queries.GetStateChapterParams{
			PartyID: partyID,
			StateID: pgtype.Int2{Int16: stateID, Valid: true},
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return 0, nil // Chapter does not exist yet
			}
			return 0, fmt.Errorf("failed to get state chapter: %w", err)
		}

		// Cache found chapter ID in Redis
		_ = s.rdb.Set(ctx, cacheKey, stateChapterID, db.RedisOneEightyDaysTTL).Err()
		return stateChapterID, nil
	}

	// 5. Read-or-create: Upsert state chapter record in the database
	stateChapterID, err := s.queries.GetOrCreateStateChapter(ctx, queries.GetOrCreateStateChapterParams{
		PartyID: partyID,
		StateID: pgtype.Int2{Int16: stateID, Valid: true},
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get or create state chapter: %w", err)
	}

	// 6. Cache newly resolved chapter ID in Redis
	_ = s.rdb.Set(ctx, cacheKey, stateChapterID, db.RedisOneEightyDaysTTL).Err()
	return stateChapterID, nil
}

// GetOrCreateLGAChapter retrieves the LGA chapter for a party in a specific LGA.
// When createIfMissing is true (default), it creates the chapter if it does not already exist.
// When createIfMissing is false, it returns 0 without creating the chapter if it does not exist.
func (s *PartiesService) GetOrCreateLGAChapter(ctx context.Context, partyID int16, lgaID int32, createIfMissing ...bool) (int32, error) {
	// 1. Resolve creation mode flag (defaults to true if omitted)
	shouldCreate := true
	if len(createIfMissing) > 0 {
		shouldCreate = createIfMissing[0]
	}

	// 2. Validate that the LGA exists
	if _, err := s.bodiesService.CheckLGA(ctx, lgaID); err != nil {
		return 0, fmt.Errorf("invalid LGA: %w", err)
	}

	// 3. Fast-path: Check Redis cache
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisLGAChapter, partyID, lgaID)
	if valStr, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if val, err := strconv.ParseInt(valStr, 10, 32); err == nil {
			return int32(val), nil
		}
	}

	// 4. Read-only lookup: query without inserting if creation is disabled
	if !shouldCreate {
		lgaChapterID, err := s.queries.GetLGAChapter(ctx, queries.GetLGAChapterParams{
			PartyID: partyID,
			LgaID:   pgtype.Int4{Int32: lgaID, Valid: true},
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return 0, nil // Chapter does not exist yet
			}
			return 0, fmt.Errorf("failed to get LGA chapter: %w", err)
		}

		// Cache found chapter ID in Redis
		_ = s.rdb.Set(ctx, cacheKey, lgaChapterID, db.RedisOneEightyDaysTTL).Err()
		return lgaChapterID, nil
	}

	// 5. Read-or-create: Upsert LGA chapter record in the database
	lgaChapterID, err := s.queries.GetOrCreateLGAChapter(ctx, queries.GetOrCreateLGAChapterParams{
		PartyID: partyID,
		ID:      lgaID,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get or create LGA chapter: %w", err)
	}

	// 6. Cache newly resolved chapter ID in Redis
	_ = s.rdb.Set(ctx, cacheKey, lgaChapterID, db.RedisOneEightyDaysTTL).Err()
	return lgaChapterID, nil
}

// GetOrCreateWardChapter retrieves the Ward chapter for a party in a specific Ward.
// When createIfMissing is true (default), it creates the chapter if it does not already exist.
// When createIfMissing is false, it returns 0 without creating the chapter if it does not exist.
func (s *PartiesService) GetOrCreateWardChapter(ctx context.Context, partyID int16, wardID int32, createIfMissing ...bool) (int32, error) {
	// 1. Resolve creation mode flag (defaults to true if omitted)
	shouldCreate := true
	if len(createIfMissing) > 0 {
		shouldCreate = createIfMissing[0]
	}

	// 2. Validate that the ward exists
	if _, err := s.bodiesService.CheckWard(ctx, wardID); err != nil {
		return 0, fmt.Errorf("invalid ward: %w", err)
	}

	// 3. Fast-path: Check Redis cache
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisWardChapter, partyID, wardID)
	if valStr, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if val, err := strconv.ParseInt(valStr, 10, 32); err == nil {
			return int32(val), nil
		}
	}

	// 4. Read-only lookup: query without inserting if creation is disabled
	if !shouldCreate {
		wardChapterID, err := s.queries.GetWardChapter(ctx, queries.GetWardChapterParams{
			PartyID: partyID,
			WardID:  pgtype.Int4{Int32: wardID, Valid: true},
		})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return 0, nil // Chapter does not exist yet
			}
			return 0, fmt.Errorf("failed to get Ward chapter: %w", err)
		}

		// Cache found chapter ID in Redis
		_ = s.rdb.Set(ctx, cacheKey, wardChapterID, db.RedisOneEightyDaysTTL).Err()
		return wardChapterID, nil
	}

	// 5. Read-or-create: Upsert Ward chapter record in the database
	wardChapterID, err := s.queries.GetOrCreateWardChapter(ctx, queries.GetOrCreateWardChapterParams{
		PartyID: partyID,
		ID:      wardID,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get or create Ward chapter: %w", err)
	}

	// 6. Cache newly resolved chapter ID in Redis
	_ = s.rdb.Set(ctx, cacheKey, wardChapterID, db.RedisOneEightyDaysTTL).Err()
	return wardChapterID, nil
}

// GetChapterMemberCount retrieves the number of active members in a chapter.
// It checks Redis first and falls back to the database if not found.
func (s *PartiesService) GetChapterMemberCount(ctx context.Context, partyID int16, chapterID int32) (int64, error) {
	if partyID <= 0 || chapterID <= 0 {
		return 0, nil
	}

	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisChapterMemberCount, partyID, chapterID)

	// 1. Try to get count from Redis
	countStr, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		if count, parseErr := strconv.ParseInt(countStr, 10, 64); parseErr == nil {
			return count, nil
		}
	} else if !errors.Is(err, redis.Nil) {
		slog.Error("Failed to fetch chapter member count from redis", "error", err, "partyID", partyID, "chapterID", chapterID)
	}

	// 2. Fallback to database
	count, err := s.queries.GetChapterMemberCount(ctx, queries.GetChapterMemberCountParams{
		PartyID:   partyID,
		ChapterID: chapterID,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get chapter member count from db: %w", err)
	}

	// 3. Cache in Redis
	err = s.rdb.Set(ctx, cacheKey, count, db.RedisSevenDaysTTL).Err()
	if err != nil {
		slog.Error("Failed to cache chapter member count in redis", "error", err, "partyID", partyID, "chapterID", chapterID)
	}

	return count, nil
}

// IsPartyChapterMember checks chapter membership, including suspended members.
func (s *PartiesService) IsPartyChapterMember(ctx context.Context, userID int64, partyID int16, chapterID int32) (bool, error) {
	if userID <= 0 || partyID <= 0 || chapterID <= 0 {
		return false, nil
	}

	cacheKey := fmt.Sprintf("%s%d:%d:%d", db.RedisPartyChapterMember, partyID, chapterID, userID)
	if cached, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if isMember, err := strconv.ParseBool(cached); err == nil {
			return isMember, nil
		}
	}

	isMember, err := s.queries.IsPartyChapterMember(ctx, queries.IsPartyChapterMemberParams{
		UserID:    userID,
		PartyID:   partyID,
		ChapterID: chapterID,
	})
	if err != nil {
		return false, fmt.Errorf("failed to check party chapter membership: %w", err)
	}

	_ = s.rdb.Set(ctx, cacheKey, isMember, db.RedisThirtyDaysTTL).Err()
	return isMember, nil
}

// IsPartyMember checks if a user is an active member of a party.
func (s *PartiesService) IsPartyMember(ctx context.Context, userID int64, partyID int16) (bool, error) {
	if userID <= 0 || partyID <= 0 {
		return false, nil
	}

	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisPartyMember, partyID, userID)
	if s.rdb != nil {
		if cached, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
			if isMember, err := strconv.ParseBool(cached); err == nil {
				return isMember, nil
			}
		}
	}

	isMember, err := s.queries.IsPartyMember(ctx, queries.IsPartyMemberParams{
		UserID:  userID,
		PartyID: partyID,
	})
	if err != nil {
		return false, fmt.Errorf("failed to check party membership: %w", err)
	}

	if s.rdb != nil {
		_ = s.rdb.Set(ctx, cacheKey, isMember, db.RedisThirtyDaysTTL).Err()
	}
	return isMember, nil
}

//--END-- party chapters

// LeaveParty allows a user to leave their current party.
func (s *PartiesService) LeaveParty(ctx context.Context, partyID int16, userID, userFid int64) error {
	chapterIDs, err := s.queries.DeletePartyMembership(ctx, queries.DeletePartyMembershipParams{
		UserID:  userID,
		PartyID: partyID,
	})
	if err != nil {
		return fmt.Errorf("failed to remove user from party_membership: %w", err)
	}

	for _, chapterID := range chapterIDs {
		_ = s.queries.AddPartyMemberMilestone(ctx, queries.AddPartyMemberMilestoneParams{
			UserID:        userID,
			PartyID:       partyID,
			ChapterID:     pgtype.Int4{Int32: chapterID, Valid: true},
			MilestoneType: constants.MilestoneTypeLeft,
			Metadata:      []byte("{}"),
		})
		s.InvalidateChapterMemberCount(ctx, partyID, chapterID)
		s.InvalidatePartyChapterMembership(ctx, userID, partyID, chapterID)
	}

	// invalidate party membership from redis
	s.InvalidatePartyMembership(ctx, userID, partyID)

	// Revoke party-scoped administrative roles (party_admin, super_party_admin)
	_ = s.usersService.StripPartyAdminRoles(ctx, userID, userFid)

	// Remove the user's active party affiliation from the users table
	err = s.usersService.UpdateUserParty(ctx, userID, nil, userFid)
	if err != nil {
		return fmt.Errorf("failed to clear user party_id: %w", err)
	}

	return nil
}

// JoinPartyParams identifies the user, party, and chapter being joined.
type JoinPartyParams struct {
	PartyID     int16
	ChapterID   int32
	ChapterType string
	UserID      int64
	UserFID     int64
}

// JoinParty allows a user to become a new party member.
func (s *PartiesService) JoinParty(ctx context.Context, params JoinPartyParams) error {
	if params.PartyID <= 0 {
		return fmt.Errorf("invalid party ID: must be greater than zero")
	}

	// Fetch the user details to check their current party affiliation.
	user, err := s.usersService.GetUserByFakeID(ctx, params.UserFID)
	if err != nil {
		return fmt.Errorf("failed to fetch user details: %w", err)
	}

	// Reject if user is affiliated with a different party.
	// Users must explicitly leave their current party before joining a different one.
	if user.PartyID.Valid && user.PartyID.Int16 > 0 && user.PartyID.Int16 != params.PartyID {
		return fmt.Errorf("you are already a member of a different party; you must leave your current party before joining another one")
	}

	// Check blocked parties only if the user is not already a member of this party.
	if !user.PartyID.Valid || user.PartyID.Int16 != params.PartyID {
		blockedParties := s.blocksService.GetUserBlockedPartyIDs(ctx, params.UserID)
		if blockedParties[params.PartyID] {
			return fmt.Errorf("you have been blocked from joining this party")
		}
	}

	// Check whether an existing member has been suspended by this party.
	if user.PartyID.Valid && user.PartyID.Int16 == params.PartyID {
		suspension, err := s.GetActivePartyMemberSuspension(ctx, params.PartyID, params.UserID)
		if err != nil {
			return err
		}
		if suspension != nil && suspension.ID > 0 {
			return fmt.Errorf("you have been suspended by this party")
		}
	}

	// Resolve the chapter the user is joining.
	// If params.ChapterID is 0, default directly to the national chapter.
	// Users can later drill down to state, LGA, or ward chapters via dialogs in the UI.
	var finalChapterID int32 = params.ChapterID
	if finalChapterID == 0 {
		natChapterID, err := s.GetOrCreateNationalChapter(ctx, params.PartyID, constants.NigeriaCountryID)
		if err != nil {
			return fmt.Errorf("failed to resolve national chapter: %w", err)
		}

		finalChapterID = natChapterID
		params.ChapterType = "national"
	}

	// Skip inserting membership if the user already belongs to this chapter.
	isMember, err := s.IsPartyChapterMember(ctx, params.UserID, params.PartyID, finalChapterID)
	if err != nil {
		return err
	}
	if isMember {
		return s.followsService.FollowParty(ctx, params.UserID, params.PartyID, finalChapterID)
	}

	// Insert the new membership record directly.
	err = s.queries.AddPartyMembership(ctx, queries.AddPartyMembershipParams{
		UserID:    params.UserID,
		PartyID:   params.PartyID,
		ChapterID: finalChapterID,
	})
	if err != nil {
		return fmt.Errorf("failed to add party membership: %w", err)
	}

	// Invalidate cache of chapter member count
	s.InvalidateChapterMemberCount(ctx, params.PartyID, finalChapterID)                    // chapter member count invalidation
	s.InvalidatePartyChapterMembership(ctx, params.UserID, params.PartyID, finalChapterID) // user party chapter membership invalidation
	s.InvalidatePartyMembership(ctx, params.UserID, params.PartyID)                        // invalidate party membership

	if params.ChapterType == "national" {
		// Log the milestone in party_member_milestones for audit trails and user activity timeline.
		_ = s.queries.AddPartyMemberMilestone(ctx, queries.AddPartyMemberMilestoneParams{
			UserID:        params.UserID,
			PartyID:       params.PartyID,
			ChapterID:     pgtype.Int4{Int32: finalChapterID, Valid: true},
			MilestoneType: constants.MilestoneTypeJoined,
			Metadata:      []byte("{}"),
		})
	}

	// Update the user's active party affiliation in the users table (if not already set)
	if !user.PartyID.Valid || user.PartyID.Int16 != params.PartyID {
		err = s.usersService.UpdateUserParty(ctx, params.UserID, &params.PartyID, params.UserFID)
		if err != nil {
			return fmt.Errorf("failed to update user party_id: %w", err)
		}
	}

	// Notify party and chapter officials asynchronously
	s.notificationsService.NotifyNewMemberJoined(ctx, notifications.NotifyNewMemberJoinedParams{
		PartyID:   params.PartyID,
		UserID:    params.UserID,
		ChapterID: finalChapterID,
	})

	// Follow the chapter after joining; follower notifications are asynchronous.
	return s.followsService.FollowParty(ctx, params.UserID, params.PartyID, finalChapterID)
}

// CreatePartyMarketingCampaign creates a marketing campaign and deducts the budget from the party wallet
func (s *PartiesService) CreatePartyMarketingCampaign(ctx context.Context, arg queries.CreatePartyMarketingCampaignParams) (queries.PartyMarketingCampaign, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)

	// 0. Check election group date: cannot create campaign if election_date is today or in the past
	electionGroup, err := s.queries.GetElectionGroupByID(ctx, arg.ElectionGroupID)
	if err != nil {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("failed to get election group: %w", err)
	}

	if int(electionGroup.Year) < time.Now().Year() {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("one can't create an agent marketing campaign for a past election group")
	}

	// 1. Get the party wallet to check balance
	wallet, err := qtx.GetPartyWalletByPartyID(ctx, int16(arg.PartyID))
	if err != nil {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("failed to get party wallet: %w", err)
	}

	if wallet.BalanceKobo < arg.BudgetKobo {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("insufficient wallet balance: have %d kobo, need %d kobo", wallet.BalanceKobo, arg.BudgetKobo)
	}

	// 2. Debit the wallet balance
	updatedWallet, err := qtx.DebitPartyWallet(ctx, queries.DebitPartyWalletParams{
		BalanceKobo: arg.BudgetKobo,
		ID:          wallet.ID,
	})
	if err != nil {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("failed to debit wallet: %w", err)
	}

	// 3. Record the debit transaction
	txRef := fmt.Sprintf("MC-%d-%s", arg.PartyID, time.Now().Format("20060102150405"))
	_, err = qtx.CreateWalletTransaction(ctx, queries.CreateWalletTransactionParams{
		WalletID:             wallet.ID,
		TransactionReference: txRef,
		Type:                 constants.TransactionTypeDebit,
		TransactionCategory:  constants.TxCategoryMarketingCampaign,
		AmountKobo:           arg.BudgetKobo,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            utils.PgTextFromString(""),
		PayerAccountNumber:   utils.PgTextFromString(""),
		PayerBankCode:        utils.PgTextFromString(""),
		Narration:            utils.PgTextFromString("Payment for marketing campaign"),
		RawPayload:           nil,
	})
	if err != nil {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("failed to record wallet transaction: %w", err)
	}

	// 4. Get the plan to snapshot referral amount
	plan, err := qtx.GetPlanByID(ctx, arg.PlanID)
	if err != nil {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("failed to get plan: %w", err)
	}
	arg.ReferralAmountKobo = plan.ReferralAmountKobo

	// 5. Create the marketing campaign record
	campaign, err := qtx.CreatePartyMarketingCampaign(ctx, arg)
	if err != nil {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("failed to create marketing campaign: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return queries.PartyMarketingCampaign{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	s.walletService.InvalidatePartyWalletCache(ctx, arg.PartyID)

	return campaign, nil
}

// GetPartyMarketingCampaigns retrieves all marketing campaigns for a party
func (s *PartiesService) GetPartyMarketingCampaigns(ctx context.Context, partyID int16) ([]queries.GetPartyMarketingCampaignsRow, error) {
	return s.queries.GetPartyMarketingCampaigns(ctx, partyID)
}

// ListAllPartyMarketingCampaigns retrieves marketing campaigns with filters and pagination (admin route).
func (s *PartiesService) ListAllPartyMarketingCampaigns(ctx context.Context, arg queries.ListAllPartyMarketingCampaignsParams) ([]queries.ListAllPartyMarketingCampaignsRow, error) {
	return s.queries.ListAllPartyMarketingCampaigns(ctx, arg)
}

// UpdateMarketingCampaignStatus updates a campaign's status, setting start/end dates and deducting per-day budget when activating.
func (s *PartiesService) UpdateMarketingCampaignStatus(ctx context.Context, id int32, status string) (queries.PartyMarketingCampaign, error) {
	return s.queries.UpdateMarketingCampaignStatus(ctx, queries.UpdateMarketingCampaignStatusParams{
		ID:     id,
		Status: status,
	})
}

// DeletePartyMarketingCampaign deletes a marketing campaign by ID (admin only).
func (s *PartiesService) DeletePartyMarketingCampaign(ctx context.Context, id int32) error {
	return s.queries.DeletePartyMarketingCampaign(ctx, id)
}

// CreatePlan creates a new marketing plan (admin only).
func (s *PartiesService) CreatePlan(ctx context.Context, arg queries.CreatePlanParams) (queries.Plan, error) {
	return s.queries.CreatePlan(ctx, arg)
}

// UpdatePlan updates an existing marketing plan (admin only).
func (s *PartiesService) UpdatePlan(ctx context.Context, arg queries.UpdatePlanParams) (queries.Plan, error) {
	return s.queries.UpdatePlan(ctx, arg)
}

// DeletePlan deletes a marketing plan by ID (admin only).
func (s *PartiesService) DeletePlan(ctx context.Context, id int32) error {
	return s.queries.DeletePlan(ctx, id)
}

// GetPlans retrieves marketing plans with optional filters.
func (s *PartiesService) GetPlans(ctx context.Context, typeFilter string, isActiveFilter string) ([]queries.Plan, error) {
	arg := queries.GetPlansParams{
		Column1: typeFilter,
		Column2: isActiveFilter,
	}
	return s.queries.GetPlans(ctx, arg)
}

// UpdatePlanDisplayOrder updates a plan's display order (admin only).
func (s *PartiesService) UpdatePlanDisplayOrder(ctx context.Context, arg queries.UpdatePlanDisplayOrderParams) (queries.Plan, error) {
	return s.queries.UpdatePlanDisplayOrder(ctx, arg)
}

// UpdatePartyAgentAcquisitionTargets updates the agent acquisition targets of a party.
func (s *PartiesService) UpdatePartyAgentAcquisitionTargets(ctx context.Context, arg queries.UpdatePartyAgentAcquisitionTargetsParams) (queries.Party, error) {
	defer s.InvalidatePartyCache(ctx, arg.ID)
	return s.queries.UpdatePartyAgentAcquisitionTargets(ctx, arg)
}

// GetPartyAgentAcquisitionTargets returns the agent_acquisition_targets JSON for a party.
func (s *PartiesService) GetPartyAgentAcquisitionTargets(ctx context.Context, partyID int16) (json.RawMessage, error) {
	party, err := s.GetPartyByID(ctx, partyID)
	if err != nil {
		return nil, fmt.Errorf("party not found: %w", err)
	}
	if len(party.AgentAcquisitionTargets) == 0 {
		return json.RawMessage("{}"), nil
	}
	return json.RawMessage(party.AgentAcquisitionTargets), nil
}

// GetPartyByID returns a party by its ID.
func (s *PartiesService) GetPartyByID(ctx context.Context, partyID int16) (queries.Party, error) {
	return s.queries.GetPartyByID(ctx, partyID)
}

// ResetPartyLogo resets the logo file ID of a party to NULL.
func (s *PartiesService) ResetPartyLogo(ctx context.Context, partyID int16) error {
	defer s.InvalidatePartyCache(ctx, partyID)
	return s.queries.ResetPartyLogo(ctx, partyID)
}

// --START-- party positions & officials

// GetDefaultPartyPositions returns default party positions, cached in Redis.
func (s *PartiesService) GetDefaultPartyPositions(ctx context.Context) ([]queries.PartyPosition, error) {
	cacheKey := db.RedisPartyDefaultPositions

	// Try reading from Redis cache
	if s.rdb != nil {
		if cachedData, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
			var positions []queries.PartyPosition
			if err := json.Unmarshal([]byte(cachedData), &positions); err == nil {
				return positions, nil
			}
		}
	}

	// Fetch all default positions from database
	defaultPositions, err := s.queries.ListDefaultPartyPositions(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list default positions: %w", err)
	}
	if defaultPositions == nil {
		defaultPositions = []queries.PartyPosition{}
	}

	// Cache result in Redis (default positions are static)
	if s.rdb != nil {
		if data, err := json.Marshal(defaultPositions); err == nil {
			_ = s.rdb.Set(ctx, cacheKey, data, db.RedisOneYearTTL).Err()
		}
	}

	return defaultPositions, nil
}

// GetCustomPartyPositions returns custom party positions for a party, cached in Redis.
func (s *PartiesService) GetCustomPartyPositions(ctx context.Context, partyID int16) ([]queries.PartyPosition, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisPartyCustomPositions, partyID)

	// Try reading from Redis cache
	if s.rdb != nil {
		if cachedData, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
			var positions []queries.PartyPosition
			if err := json.Unmarshal([]byte(cachedData), &positions); err == nil {
				return positions, nil
			}
		}
	}

	// Fetch all custom positions for this party from database
	customPositions, err := s.queries.ListCustomPartyPositions(ctx, pgtype.Int2{Int16: partyID, Valid: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list custom positions: %w", err)
	}
	if customPositions == nil {
		customPositions = []queries.PartyPosition{}
	}

	// Cache result in Redis
	if s.rdb != nil {
		if data, err := json.Marshal(customPositions); err == nil {
			_ = s.rdb.Set(ctx, cacheKey, data, db.RedisOneEightyDaysTTL).Err()
		}
	}

	return customPositions, nil
}

// PartyPositionsResult holds default and custom positions for a party.
type PartyPositionsResult struct {
	Default []queries.PartyPosition `json:"default"`
	Custom  []queries.PartyPosition `json:"custom"`
}

// ListPartyPositions returns all positions (default and custom) for a party.
func (s *PartiesService) ListPartyPositions(ctx context.Context, partyID int16) (*PartyPositionsResult, error) {
	defaultPositions, err := s.GetDefaultPartyPositions(ctx)
	if err != nil {
		return nil, err
	}

	customPositions, err := s.GetCustomPartyPositions(ctx, partyID)
	if err != nil {
		return nil, err
	}

	return &PartyPositionsResult{
		Default: defaultPositions,
		Custom:  customPositions,
	}, nil
}

// GetPartyPositionByID returns a single position by ID, cached in Redis.
func (s *PartiesService) GetPartyPositionByID(ctx context.Context, id int32, partyID int16) (queries.PartyPosition, error) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisPartyPositionByID, partyID, id)

	// Try reading from Redis cache
	if s.rdb != nil {
		if cachedData, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
			var pos queries.PartyPosition
			if err := json.Unmarshal([]byte(cachedData), &pos); err == nil && pos.ID == id && pos.ID > 0 {
				return pos, nil
			}
		}
	}

	// Fetch position from database
	pos, err := s.queries.GetPartyPositionByID(ctx, queries.GetPartyPositionByIDParams{
		ID:      id,
		PartyID: pgtype.Int2{Int16: partyID, Valid: true},
	})
	if err != nil {
		return queries.PartyPosition{}, err
	}

	// Cache result in Redis
	if s.rdb != nil {
		if data, err := json.Marshal(pos); err == nil {
			_ = s.rdb.Set(ctx, cacheKey, data, db.RedisOneEightyDaysTTL).Err()
		}
	}

	return pos, nil
}

// CreatePartyCustomPosition creates a new custom position for the party.
func (s *PartiesService) CreatePartyCustomPosition(ctx context.Context, arg queries.CreatePartyCustomPositionParams) (queries.PartyPosition, error) {
	// MaxPartyCustomPositions is the maximum number of custom positions a party can create.
	const MaxPartyCustomPositions = 200

	if !arg.PartyID.Valid {
		return queries.PartyPosition{}, errors.New("party ID is required to create a custom position")
	}

	// Check current custom positions limit
	existing, err := s.GetCustomPartyPositions(ctx, arg.PartyID.Int16)
	if err != nil {
		return queries.PartyPosition{}, fmt.Errorf("failed to check existing custom positions: %w", err)
	}
	if len(existing) >= MaxPartyCustomPositions {
		return queries.PartyPosition{}, fmt.Errorf("party has reached the maximum allowed custom positions (%d)", MaxPartyCustomPositions)
	}

	pos, err := s.queries.CreatePartyCustomPosition(ctx, arg)
	if err != nil {
		return queries.PartyPosition{}, err
	}

	// Invalidate the custom positions cache and log audit action
	s.InvalidatePartyCustomPositionsCache(ctx, arg.PartyID.Int16)

	posJSON, _ := json.Marshal(pos)
	s.auditService.LogActionAsync(ctx, queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModulePartyAdmin),
		Action:     db.ActionCreatePartyCustomPosition,
		EntityType: db.EntityTypeParty,
		EntityID:   strconv.FormatInt(int64(arg.PartyID.Int16), 10),
		NewValues:  posJSON,
	})

	return pos, nil
}

// UpdatePartyCustomPosition updates an existing custom position owned by the party.
func (s *PartiesService) UpdatePartyCustomPosition(ctx context.Context, arg queries.UpdatePartyCustomPositionParams) (queries.PartyPosition, error) {
	pos, err := s.queries.UpdatePartyCustomPosition(ctx, arg)

	if err == nil && arg.PartyID.Valid {
		s.InvalidatePartyCustomPositionsCache(ctx, arg.PartyID.Int16)
		s.InvalidatePartyPositionByIDCache(ctx, arg.PartyID.Int16, arg.ID)

		posJSON, _ := json.Marshal(pos)
		s.auditService.LogActionAsync(ctx, queries.InsertAuditLogParams{
			Module:     audit.StringToText(db.ModulePartyAdmin),
			Action:     db.ActionUpdatePartyCustomPosition,
			EntityType: db.EntityTypeParty,
			EntityID:   strconv.FormatInt(int64(arg.PartyID.Int16), 10),
			NewValues:  posJSON,
		})
	}
	return pos, err
}

// DeletePartyCustomPosition deletes a custom position owned by the party.
// If the position has been used at all in party_position_assignments, it is soft-deleted
// (is_active = false) to preserve assignment history; otherwise, it is hard-deleted.
func (s *PartiesService) DeletePartyCustomPosition(ctx context.Context, id int32, partyID int16) error {
	hasAssignments, err := s.queries.HasPositionBeenAssigned(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to check position assignments: %w", err)
	}

	if hasAssignments {
		err = s.queries.SoftDeletePartyCustomPosition(ctx, queries.SoftDeletePartyCustomPositionParams{
			ID:      id,
			PartyID: pgtype.Int2{Int16: partyID, Valid: true},
		})
	} else {
		err = s.queries.HardDeletePartyCustomPosition(ctx, queries.HardDeletePartyCustomPositionParams{
			ID:      id,
			PartyID: pgtype.Int2{Int16: partyID, Valid: true},
		})
	}

	if err == nil {
		s.InvalidatePartyCustomPositionsCache(ctx, partyID)
		s.InvalidatePartyPositionByIDCache(ctx, partyID, id)

		s.auditService.LogActionAsync(ctx, queries.InsertAuditLogParams{
			Module:     audit.StringToText(db.ModulePartyAdmin),
			Action:     db.ActionDeletePartyCustomPosition,
			EntityType: db.EntityTypeParty,
			EntityID:   strconv.FormatInt(int64(partyID), 10),
		})
	}
	return err
}

// AssignPartyPositionInput contains parameters for assigning a party position to a member.
type AssignPartyPositionInput struct {
	queries.AssignPartyPositionParams
	ChapterType string `json:"chapter_type,omitempty"`
}

// AssignPartyPosition assigns a member to a position in a chapter with occupancy checking.
func (s *PartiesService) AssignPartyPosition(ctx context.Context, input AssignPartyPositionInput) (queries.PartyPositionAssignment, error) {
	arg := input.AssignPartyPositionParams
	chapterType := strings.TrimSpace(input.ChapterType)

	if chapterType == "" {
		return queries.PartyPositionAssignment{}, fmt.Errorf("chapter type is required")
	}

	// Verify position exists and check max occupants
	pos, err := s.GetPartyPositionByID(ctx, arg.PositionID, arg.PartyID)
	if err != nil {
		return queries.PartyPositionAssignment{}, fmt.Errorf("position not found: %w", err)
	}

	// Ensure the position is active
	if !pos.IsActive {
		return queries.PartyPositionAssignment{}, fmt.Errorf("cannot assign member: position '%s' is inactive", pos.Name)
	}

	// Verify position occupancy limit for this chapter
	if pos.MaxOccupants > 0 {
		count, err := s.queries.CountActivePositionOccupants(ctx, queries.CountActivePositionOccupantsParams{
			ChapterID:  arg.ChapterID,
			PositionID: arg.PositionID,
		})
		if err != nil {
			return queries.PartyPositionAssignment{}, fmt.Errorf("failed checking position occupancy: %w", err)
		}
		if count >= int64(pos.MaxOccupants) {
			return queries.PartyPositionAssignment{}, fmt.Errorf("position '%s' has reached maximum occupancy (%d) for this chapter", pos.Name, pos.MaxOccupants)
		}
	}

	// Create position assignment in database
	assignment, err := s.queries.AssignPartyPosition(ctx, arg)
	if err == nil {
		// Invalidate member position assignments, chapter officials cache, and single official card cache
		s.InvalidateMemberPositionAssignmentsCache(ctx, arg.PartyID, arg.UserID)
		s.InvalidatePartyOfficialsCache(ctx, arg.PartyID, arg.ChapterID)
		s.InvalidateChapterOfficialCache(ctx, arg.ChapterID, arg.PositionID)

		// Record lightweight milestone in party member milestones timeline
		milestoneMeta, _ := json.Marshal(map[string]any{
			"assignment_id":    assignment.ID,
			"position_id":      arg.PositionID,
			"position_name":    pos.Name,
			"appointment_type": arg.AppointmentType,
		})
		_ = s.queries.AddPartyMemberMilestone(ctx, queries.AddPartyMemberMilestoneParams{
			UserID:        arg.UserID,
			PartyID:       arg.PartyID,
			ChapterID:     pgtype.Int4{Int32: arg.ChapterID, Valid: true},
			MilestoneType: constants.MilestoneTypeReceivedPosition,
			Metadata:      milestoneMeta,
		})

		// Log audit action for the administrator
		assignmentJSON, _ := json.Marshal(assignment)
		s.auditService.LogActionAsync(ctx, queries.InsertAuditLogParams{
			Module:     audit.StringToText(db.ModulePartyAdmin),
			Action:     db.ActionAssignPartyPosition,
			ActorID:    arg.AppointedBy.Int64,
			EntityType: db.EntityTypeUser,
			EntityID:   strconv.FormatInt(arg.UserID, 10),
			NewValues:  assignmentJSON,
		})

		// Dispatch notification to receiver and party leadership asynchronously
		appointedByPointer := &arg.AppointedBy.Int64
		s.notificationsService.NotifyPartyOfficialAppointed(ctx, notifications.NotifyPartyOfficialAppointedParams{
			PartyID:         arg.PartyID,
			ChapterID:       arg.ChapterID,
			PositionID:      arg.PositionID,
			PositionName:    pos.Name,
			TargetUserID:    arg.UserID,
			ActorID:         appointedByPointer,
			AppointmentType: arg.AppointmentType,
			AssignmentID:    assignment.ID,
		})

		// Grant official verification badge if chapter corresponds to an official level
		if vTypeID, err := pageverificationsservice.ChapterTypeToOfficialVerificationType(chapterType); err == nil {
			if err := s.pageVerificationsService.EnsureOfficialVerification(ctx, arg.UserID, vTypeID); err != nil {
				slog.Warn("failed to ensure official verification for user", "userID", arg.UserID, "vTypeID", vTypeID, "error", err)
			}
		}
	}
	return assignment, err
}

// VacatePositionAssignment vacates an active position assignment.
func (s *PartiesService) VacatePositionAssignment(ctx context.Context, id int64, partyID int16) (queries.PartyPositionAssignment, error) {
	assignment, err := s.queries.VacatePositionAssignment(ctx, queries.VacatePositionAssignmentParams{
		ID:      id,
		PartyID: partyID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return queries.PartyPositionAssignment{}, fmt.Errorf("active position assignment not found")
		}

		return queries.PartyPositionAssignment{}, err
	}

	// Invalidate member position assignments, chapter officials cache, and single official card cache
	s.InvalidateMemberPositionAssignmentsCache(ctx, assignment.PartyID, assignment.UserID)
	s.InvalidatePartyOfficialsCache(ctx, assignment.PartyID, assignment.ChapterID)
	s.InvalidateChapterOfficialCache(ctx, assignment.ChapterID, assignment.PositionID)

	// Fetch position details for milestone and notification
	posName := "Official Position"
	if pos, err := s.GetPartyPositionByID(ctx, assignment.PositionID, assignment.PartyID); err == nil && pos.Name != "" {
		posName = pos.Name
	}

	// Record milestone in party member milestones timeline
	milestoneMeta, _ := json.Marshal(map[string]any{
		"assignment_id":    assignment.ID,
		"position_id":      assignment.PositionID,
		"position_name":    posName,
		"appointment_type": assignment.AppointmentType,
	})
	_ = s.queries.AddPartyMemberMilestone(ctx, queries.AddPartyMemberMilestoneParams{
		UserID:        assignment.UserID,
		PartyID:       assignment.PartyID,
		ChapterID:     pgtype.Int4{Int32: assignment.ChapterID, Valid: true},
		MilestoneType: constants.MilestoneTypePositionRemoved,
		Metadata:      milestoneMeta,
	})

	// Log audit action for the administrator
	assignmentJSON, _ := json.Marshal(assignment)
	s.auditService.LogActionAsync(ctx, queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModulePartyAdmin),
		Action:     db.ActionVacatePartyPosition,
		EntityType: db.EntityTypeUser,
		EntityID:   audit.FormatID(assignment.UserID),
		NewValues:  assignmentJSON,
	})

	// Dispatch notification to vacated member and chapter leadership asynchronously
	s.notificationsService.NotifyPartyOfficialVacated(ctx, notifications.NotifyPartyOfficialVacatedParams{
		PartyID:         assignment.PartyID,
		ChapterID:       assignment.ChapterID,
		PositionID:      assignment.PositionID,
		PositionName:    posName,
		TargetUserID:    assignment.UserID,
		AppointmentType: assignment.AppointmentType,
		AssignmentID:    assignment.ID,
	})

	// Revoke official verification badge if user has no remaining active position at this chapter level
	if chapter, err := s.GetPartyChapterByID(ctx, assignment.ChapterID); err == nil {
		if vTypeID, err := pageverificationsservice.ChapterTypeToOfficialVerificationType(chapter.ChapterType); err == nil {
			if err := s.pageVerificationsService.RevokeOfficialVerificationIfNoActivePosition(ctx, assignment.UserID, chapter.ChapterType, vTypeID); err != nil {
				slog.Warn("failed to revoke official verification for user", "userID", assignment.UserID, "chapterType", chapter.ChapterType, "vTypeID", vTypeID, "error", err)
			}
		}
	}

	return assignment, nil
}

// ListPartyOfficials lists position assignments for a given chapter directly by chapter_id using idx_pos_assign_chapter.
// Results are cached in Redis for 7 days to eliminate database lookups across frequent roster views,
// and invalidated whenever positions are assigned, vacated, or updated.
func (s *PartiesService) ListPartyOfficials(ctx context.Context, partyID int16, chapterID int32) ([]queries.ListPartyOfficialsRow, error) {
	if partyID <= 0 || chapterID <= 0 {
		return []queries.ListPartyOfficialsRow{}, nil
	}

	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisPartyChapterOfficials, partyID, chapterID)

	// 1. Check Redis cache
	if cachedVal, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		var cached []queries.ListPartyOfficialsRow
		if jsonErr := json.Unmarshal([]byte(cachedVal), &cached); jsonErr == nil {
			return cached, nil
		}
	}

	// 2. Query DB
	officials, err := s.queries.ListPartyOfficials(ctx, queries.ListPartyOfficialsParams{
		PartyID:   partyID,
		ChapterID: chapterID,
	})
	if err != nil {
		return nil, err
	}

	// Ensure empty results serialize to [] instead of null so we can cache empty sets
	// and prevent cache penetration / repeated unnecessary hits to the database
	if officials == nil {
		officials = []queries.ListPartyOfficialsRow{}
	}

	// 3. Cache result (including empty slice) for 7 days or until positions are assigned/modified/vacated
	if data, err := json.Marshal(officials); err == nil {
		_ = s.rdb.Set(ctx, cacheKey, data, db.RedisSevenDaysTTL).Err()
	}

	return officials, nil
}

// ListMemberPositionAssignments lists positions held by a user in the party.
// Results are cached in Redis to minimize database lookups across frequent authorization checks.
func (s *PartiesService) ListMemberPositionAssignments(ctx context.Context, partyID int16, userID int64) ([]queries.ListMemberPositionAssignmentsRow, error) {
	if partyID <= 0 || userID <= 0 {
		return []queries.ListMemberPositionAssignmentsRow{}, nil
	}

	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisPartyMemberPositions, partyID, userID)

	// 1. Check Redis cache
	if cachedVal, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		var cached []queries.ListMemberPositionAssignmentsRow
		if jsonErr := json.Unmarshal([]byte(cachedVal), &cached); jsonErr == nil {
			return cached, nil
		}
	}

	// 2. Query DB
	positions, err := s.queries.ListMemberPositionAssignments(ctx, queries.ListMemberPositionAssignmentsParams{
		PartyID: partyID,
		UserID:  userID,
	})
	if err != nil {
		return nil, err
	}

	// Ensure empty results serialize to [] instead of null so we can cache empty sets
	// and prevent cache penetration / repeated unnecessary hits to the database
	if positions == nil {
		positions = []queries.ListMemberPositionAssignmentsRow{}
	}

	// 3. Cache result (including empty slice) for 14 days or until positions are assigned/modified/vacated
	if data, err := json.Marshal(positions); err == nil {
		_ = s.rdb.Set(ctx, cacheKey, data, db.RedisFourteenDaysTTL).Err()
	}

	return positions, nil
}

// GetActivePartyMemberSuspension checks if a user is actively suspended from a party.
// Results are cached in Redis to minimize database lookups across frequent checks.
// If the user is not suspended, a struct with ID = 0 is returned/cached (check if suspension.ID > 0).
func (s *PartiesService) GetActivePartyMemberSuspension(ctx context.Context, partyID int16, userID int64) (*queries.PartyMemberSuspension, error) {
	if partyID <= 0 || userID <= 0 {
		return nil, nil
	}

	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisPartyMemberSuspension, partyID, userID)

	// 1. Check Redis cache
	cachedVal, err := s.rdb.Get(ctx, cacheKey).Result()
	if err == nil {
		var cached queries.PartyMemberSuspension
		if jsonErr := json.Unmarshal([]byte(cachedVal), &cached); jsonErr == nil {
			return &cached, nil
		}
	}

	// 2. Query DB
	suspension, err := s.queries.GetActivePartyMemberSuspension(ctx, queries.GetActivePartyMemberSuspensionParams{
		PartyID: partyID,
		UserID:  userID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Cache empty struct (ID = 0) for 7 days to indicate not suspended
			emptySuspension := queries.PartyMemberSuspension{
				ID:      0,
				PartyID: partyID,
				UserID:  userID,
			}

			if data, err := json.Marshal(emptySuspension); err == nil {
				_ = s.rdb.Set(ctx, cacheKey, data, db.RedisFourteenDaysTTL).Err()
			}

			return &emptySuspension, nil
		}

		return nil, fmt.Errorf("failed to query active suspension: %w", err)
	}

	// 3. Cache positive result for 7 days (or until lifted/suspended)
	if data, err := json.Marshal(suspension); err == nil {
		_ = s.rdb.Set(ctx, cacheKey, data, db.RedisFourteenDaysTTL).Err()
	}

	return &suspension, nil
}

// SuspendPartyMemberInput defines the input for suspending a party member.
type SuspendPartyMemberInput struct {
	PartyID     int16
	UserID      int64
	SuspendedBy *int64
	Reason      *string
}

// SuspendPartyMember suspends a party member, vacates active positions, and records the suspension.
func (s *PartiesService) SuspendPartyMember(ctx context.Context, input SuspendPartyMemberInput) (*queries.PartyMemberSuspension, error) {
	// Check if already actively suspended (utilizing Redis cache if available)
	existing, err := s.GetActivePartyMemberSuspension(ctx, input.PartyID, input.UserID)
	if err != nil {
		return nil, err
	}
	if existing != nil && existing.ID > 0 {
		return nil, fmt.Errorf("user is already suspended from this party")
	}

	// begin db transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// set queries to use transaction
	qtx := s.queries.WithTx(tx)

	// 1. Fetch user to verify existence and retrieve fake_id for session revocation
	user, err := qtx.GetUserByID(ctx, input.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// 2. Suspend party membership across all chapters
	chapterIDs, err := qtx.SuspendPartyMembership(ctx, queries.SuspendPartyMembershipParams{
		PartyID: input.PartyID,
		UserID:  input.UserID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update party membership status: %w", err)
	}
	if len(chapterIDs) == 0 {
		return nil, fmt.Errorf("user is not an active member of this party")
	}

	// 3. Create suspension record
	suspension, err := qtx.CreatePartyMemberSuspension(ctx, queries.CreatePartyMemberSuspensionParams{
		PartyID:     input.PartyID,
		UserID:      input.UserID,
		SuspendedBy: utils.PgInt8FromPtr(input.SuspendedBy),
		Reason:      utils.PgTextFromPtr(input.Reason),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create suspension record: %w", err)
	}

	// marshal suspension record into json for metadata
	suspensionJSON, _ := json.Marshal(suspension)

	// 4. Suspend all active positions held by the user in this party
	suspendedPositions, err := qtx.SuspendAllUserPositionsInParty(ctx, queries.SuspendAllUserPositionsInPartyParams{
		PartyID: input.PartyID,
		UserID:  input.UserID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to suspend user positions: %w", err)
	}

	// Get party's national chapterID to use for notifications and audit logging
	var primaryChapterID pgtype.Int4
	if natChapterID, err := s.GetOrCreateNationalChapter(ctx, input.PartyID, constants.NigeriaCountryID); err == nil && natChapterID > 0 {
		primaryChapterID = utils.PgInt4FromInt32(natChapterID)
	}

	// add one milestone for the user in this party
	_ = qtx.AddPartyMemberMilestone(ctx, queries.AddPartyMemberMilestoneParams{
		UserID:        input.UserID,
		PartyID:       input.PartyID,
		ChapterID:     primaryChapterID,
		MilestoneType: constants.MilestoneTypeSuspended,
		Metadata:      suspensionJSON,
	})

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit suspension transaction: %w", err)
	}

	// Strip party admin roles from suspended user and revoke all active sessions across devices
	_ = s.usersService.StripPartyAdminRoles(ctx, input.UserID, user.FakeID.Int64)

	// invalidate member suspension cache
	s.InvalidatePartyMemberSuspensionCache(ctx, input.PartyID, input.UserID)

	// invalidate member position assignments cache
	s.InvalidateMemberPositionAssignmentsCache(ctx, input.PartyID, input.UserID)

	// invalidate party membership from redis
	s.InvalidatePartyMembership(ctx, input.UserID, input.PartyID)

	// invalidate party officials cache and chapter official card caches
	for _, chID := range chapterIDs {
		s.InvalidatePartyOfficialsCache(ctx, input.PartyID, chID)
	}
	for _, pos := range suspendedPositions {
		s.InvalidateChapterOfficialCache(ctx, pos.ChapterID, pos.PositionID)
	}

	// Audit Logging
	s.auditService.LogActionAsync(ctx, queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModulePartyAdmin),
		Action:     db.ActionSuspendPartyMember,
		ActorID:    *input.SuspendedBy,
		ActorRole:  audit.StringToText(db.ActorRolePartyAdmin),
		EntityType: db.EntityTypeUser,
		EntityID:   strconv.FormatInt(input.UserID, 10),
		NewValues:  suspensionJSON,
	})

	// Send notification to the suspended user and party officials asynchronously
	s.notificationsService.NotifyPartyMemberSuspended(ctx, notifications.NotifyPartyMemberSuspendedParams{
		PartyID:      input.PartyID,
		TargetUserID: input.UserID,
		ActorID:      input.SuspendedBy,
		ChapterID:    &primaryChapterID.Int32,
		Reason:       input.Reason,
	})

	// Revoke official badges if user has no remaining active positions
	_ = s.pageVerificationsService.RevokeAllOfficialVerificationsIfNoActivePosition(ctx, input.UserID)

	return &suspension, nil
}

// UnsuspendPartyMemberInput defines the input for lifting a suspension.
type UnsuspendPartyMemberInput struct {
	PartyID    int16   `json:"party_id"`
	UserID     int64   `json:"user_id"`
	LiftedBy   *int64  `json:"lifted_by,omitempty"`
	LiftReason *string `json:"lift_reason,omitempty"`
}

// UnsuspendPartyMember lifts an active suspension and reactivates party membership.
func (s *PartiesService) UnsuspendPartyMember(ctx context.Context, input UnsuspendPartyMemberInput) (*queries.PartyMemberSuspension, error) {
	// Check if actively suspended (utilizing Redis cache if available)
	existing, err := s.GetActivePartyMemberSuspension(ctx, input.PartyID, input.UserID)
	if err != nil {
		return nil, err
	}
	if existing == nil || existing.ID == 0 {
		return nil, fmt.Errorf("no active suspension found for this member")
	}

	// begin db transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// set queries to use transaction
	qtx := s.queries.WithTx(tx)

	// 1. Lift suspension record
	updatedSuspension, err := qtx.LiftPartyMemberSuspension(ctx, queries.LiftPartyMemberSuspensionParams{
		PartyID:    input.PartyID,
		UserID:     input.UserID,
		LiftedBy:   utils.PgInt8FromPtr(input.LiftedBy),
		LiftReason: utils.PgTextFromPtr(input.LiftReason),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to lift suspension: %w", err)
	}

	// 2. Reactivate party membership
	_, err = qtx.ReactivatePartyMembership(ctx, queries.ReactivatePartyMembershipParams{
		PartyID: input.PartyID,
		UserID:  input.UserID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to reactivate party membership: %w", err)
	}

	// 3. Log milestone (one milestone entry for the user in this party)
	// Marshal input into JSON to use as metadata and for audit logging
	reinstatedJSON, _ := json.Marshal(input)

	// Get party's national chapterID to use for notifications and audit logging
	var primaryChapterID pgtype.Int4
	if natChapterID, err := s.GetOrCreateNationalChapter(ctx, input.PartyID, constants.NigeriaCountryID); err == nil && natChapterID > 0 {
		primaryChapterID = utils.PgInt4FromInt32(natChapterID)
	}

	// add one milestone for the user in this party
	_ = qtx.AddPartyMemberMilestone(ctx, queries.AddPartyMemberMilestoneParams{
		UserID:        input.UserID,
		PartyID:       input.PartyID,
		ChapterID:     primaryChapterID,
		MilestoneType: constants.MilestoneTypeReinstatedFromSuspension,
		Metadata:      reinstatedJSON,
	})

	// commit db transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit unsuspend transaction: %w", err)
	}

	// invalidate member suspension cache
	s.InvalidatePartyMemberSuspensionCache(ctx, input.PartyID, input.UserID)

	// invalidate party membership from redis
	s.InvalidatePartyMembership(ctx, input.UserID, input.PartyID)

	// Audit Logging
	s.auditService.LogActionAsync(ctx, queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModulePartyAdmin),
		Action:     db.ActionUnsuspendPartyMember,
		ActorID:    *input.LiftedBy,
		ActorRole:  audit.StringToText(db.ActorRolePartyAdmin),
		EntityType: db.EntityTypeUser,
		EntityID:   strconv.FormatInt(input.UserID, 10),
		NewValues:  reinstatedJSON,
	})

	// Send notification to the reinstated user and party officials asynchronously
	s.notificationsService.NotifyPartyMemberReinstated(ctx, notifications.NotifyPartyMemberReinstatedParams{
		PartyID:      input.PartyID,
		TargetUserID: input.UserID,
		ActorID:      input.LiftedBy,
		ChapterID:    &primaryChapterID.Int32,
		Reason:       input.LiftReason,
	})

	return &updatedSuspension, nil
}

// BlockPartyUserInput defines the input for blocking a user from a party.
type BlockPartyUserInput struct {
	PartyID       int16
	BlockedUserID int64
	BlockedBy     *int64
	Reason        *string
}

// BlockUserFromThisParty removes the user from the party entirely, vacates all their held positions,
// strips party admin privileges, revokes active membership, and registers a party block.
func (s *PartiesService) BlockUserFromThisParty(ctx context.Context, input BlockPartyUserInput) (*queries.PartyUserBlock, error) {
	// Check if already blocked by this party
	blockedParties := s.blocksService.GetUserBlockedPartyIDs(ctx, input.BlockedUserID)
	if blockedParties[input.PartyID] {
		return nil, fmt.Errorf("user is already blocked by this party")
	}

	// begin db transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Set queries to use transaction
	qtx := s.queries.WithTx(tx)

	// 1. Fetch user to check if they have fake_id and party affiliation
	user, err := qtx.GetUserByID(ctx, input.BlockedUserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	isMemberOfThisParty := user.PartyID.Valid && user.PartyID.Int16 == input.PartyID
	var chapterIDs []int32
	var vacatedPositions []queries.VacateAllUserPositionsInPartyRow

	// Only vacate positions, strip roles, delete memberships, and log membership milestones
	// if the user is currently affiliated with this party.
	if isMemberOfThisParty {
		// 2. Vacate all positions held by the user in this party
		vacatedPositions, err = qtx.VacateAllUserPositionsInParty(ctx, queries.VacateAllUserPositionsInPartyParams{
			PartyID: input.PartyID,
			UserID:  input.BlockedUserID,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to vacate user positions: %w", err)
		}

		// 3. Remove party membership records if any exist
		chapterIDs, err = qtx.DeletePartyMembership(ctx, queries.DeletePartyMembershipParams{
			UserID:  input.BlockedUserID,
			PartyID: input.PartyID,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to delete party membership: %w", err)
		}

		// 4. Record milestone for audit trail
		metaJSON, _ := json.Marshal(utils.NewMetadata().
			SetIfNotEmptyPtr("reason", input.Reason).
			SetIfPresent("blocked_by", input.BlockedBy))

		// If user was not enrolled in chapters, record milestone against national chapter
		var primaryChapterID pgtype.Int4
		if natChapterID, err := s.GetOrCreateNationalChapter(ctx, input.PartyID, constants.NigeriaCountryID); err == nil && natChapterID > 0 {
			primaryChapterID = utils.PgInt4FromInt32(natChapterID)
		}
		_ = qtx.AddPartyMemberMilestone(ctx, queries.AddPartyMemberMilestoneParams{
			UserID:        input.BlockedUserID,
			PartyID:       input.PartyID,
			ChapterID:     primaryChapterID,
			MilestoneType: constants.MilestoneTypeBlocked,
			Metadata:      metaJSON,
		})

		// 5. Clear user's party affiliation (UpdateUserParty with nil automatically strips party admin roles and invalidates user cache)
		_ = s.usersService.UpdateUserParty(ctx, input.BlockedUserID, nil, user.FakeID.Int64)
	}

	// 6. Record party-user block in party_user_blocks table
	partyBlock, err := qtx.BlockUserByParty(ctx, queries.BlockUserByPartyParams{
		PartyID:         input.PartyID,
		BlockedUserID:   input.BlockedUserID,
		BlockedByUserID: utils.PgInt8FromPtr(input.BlockedBy),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to record party user block: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit block user transaction: %w", err)
	}

	// Invalidate party related caches
	s.blocksService.InvalidateUserBlockedPartiesCache(ctx, input.BlockedUserID)
	if isMemberOfThisParty {
		// Membership removal has now committed. Clear the party-wide check and
		// chapter list even when the user had no chapter rows to iterate below.
		s.InvalidatePartyMembership(ctx, input.BlockedUserID, input.PartyID)
		// UpdateUserParty ran before this transaction committed; repeat cache
		// eviction here so requests during the transaction cannot leave a stale copy.
		keys := []string{fmt.Sprintf("%s%d", db.RedisUserActiveCandidacies, input.BlockedUserID)}
		if user.FakeID.Valid {
			keys = append(keys, fmt.Sprintf("%s%d", db.RedisUserInfo, user.FakeID.Int64))
		}
		_ = s.rdb.Del(ctx, keys...).Err()
		s.InvalidateMemberPositionAssignmentsCache(ctx, input.PartyID, input.BlockedUserID)
		for _, chapterID := range chapterIDs {
			s.InvalidateChapterMemberCount(ctx, input.PartyID, chapterID)
			s.InvalidatePartyChapterMembership(ctx, input.BlockedUserID, input.PartyID, chapterID)
			s.InvalidatePartyOfficialsCache(ctx, input.PartyID, chapterID)
		}
		for _, pos := range vacatedPositions {
			s.InvalidateChapterOfficialCache(ctx, pos.ChapterID, pos.PositionID)
		}

		// Revoke official badges if user has no remaining active positions
		_ = s.pageVerificationsService.RevokeAllOfficialVerificationsIfNoActivePosition(ctx, input.BlockedUserID)
	}

	// Audit Logging
	blockJSON, _ := json.Marshal(partyBlock)
	s.auditService.LogActionAsync(ctx, queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModulePartyAdmin),
		Action:     db.ActionBlockPartyMember,
		ActorID:    *input.BlockedBy,
		ActorRole:  audit.StringToText(db.ActorRolePartyAdmin),
		EntityType: db.EntityTypeUser,
		EntityID:   strconv.FormatInt(input.BlockedUserID, 10),
		NewValues:  blockJSON,
	})

	// Send notification to the blocked user and party leadership asynchronously
	var chapterIDPtr *int32
	if len(chapterIDs) > 0 {
		chapterIDPtr = &chapterIDs[0]
	}

	s.notificationsService.NotifyPartyUserBlocked(ctx, notifications.NotifyPartyUserBlockedParams{
		PartyID:      input.PartyID,
		TargetUserID: input.BlockedUserID,
		ActorID:      input.BlockedBy,
		ChapterID:    chapterIDPtr,
		Reason:       input.Reason,
	})

	return &partyBlock, nil
}

// UnblockPartyUserInput defines the input for lifting a party block on a user.
type UnblockPartyUserInput struct {
	PartyID     int16   `json:"party_id"`
	UserID      int64   `json:"user_id"`
	UnblockedBy *int64  `json:"unblocked_by,omitempty"`
	Reason      *string `json:"reason,omitempty"`
}

// UnblockPartyUser removes a party block on a user and logs an unblock milestone.
func (s *PartiesService) UnblockPartyUser(ctx context.Context, input UnblockPartyUserInput) error {
	// Check if user is actually blocked by this party
	blockedParties := s.blocksService.GetUserBlockedPartyIDs(ctx, input.UserID)
	if !blockedParties[input.PartyID] {
		return fmt.Errorf("user is not blocked by this party")
	}

	// begin db transaction
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Set queries to use transaction
	qtx := s.queries.WithTx(tx)

	// 1. Remove party block record
	if err := qtx.UnblockUserByParty(ctx, queries.UnblockUserByPartyParams{
		PartyID:       input.PartyID,
		BlockedUserID: input.UserID,
	}); err != nil {
		return fmt.Errorf("failed to unblock user: %w", err)
	}

	// 2. Record unblocked milestone
	metaJSON, _ := json.Marshal(utils.NewMetadata().
		SetIfNotEmptyPtr("reason", input.Reason).
		SetIfPresent("unblocked_by", input.UnblockedBy))

	var primaryChapterID pgtype.Int4
	if natChapterID, err := s.GetOrCreateNationalChapter(ctx, input.PartyID, constants.NigeriaCountryID); err == nil && natChapterID > 0 {
		primaryChapterID = utils.PgInt4FromInt32(natChapterID)
	}

	// Add unblocked milestone
	_ = qtx.AddPartyMemberMilestone(ctx, queries.AddPartyMemberMilestoneParams{
		UserID:        input.UserID,
		PartyID:       input.PartyID,
		ChapterID:     primaryChapterID,
		MilestoneType: constants.MilestoneTypeUnblocked,
		Metadata:      metaJSON,
	})

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit unblock transaction: %w", err)
	}

	// Invalidate user blocked parties cache
	s.blocksService.InvalidateUserBlockedPartiesCache(ctx, input.UserID)

	// Audit Logging
	unblockJSON, _ := json.Marshal(input)
	s.auditService.LogActionAsync(ctx, queries.InsertAuditLogParams{
		Module:     audit.StringToText(db.ModulePartyAdmin),
		Action:     db.ActionUnblockPartyMember,
		ActorID:    *input.UnblockedBy,
		ActorRole:  audit.StringToText(db.ActorRolePartyAdmin),
		EntityType: db.EntityTypeUser,
		EntityID:   strconv.FormatInt(input.UserID, 10),
		NewValues:  unblockJSON,
	})

	// Send notification ONLY to the unblocked user asynchronously
	s.notificationsService.NotifyPartyUserUnblocked(ctx, notifications.NotifyPartyUserUnblockedParams{
		PartyID:      input.PartyID,
		TargetUserID: input.UserID,
		ActorID:      input.UnblockedBy,
		Reason:       input.Reason,
	})

	return nil
}

// ListBlockedPartyMembers lists blocked users for a party using cursor pagination.
func (s *PartiesService) ListBlockedPartyMembers(ctx context.Context, partyID int16, limit int32, cursor int64) ([]queries.ListBlockedUsersByPartyRow, error) {
	return s.blocksService.ListBlockedUsersByParty(ctx, partyID, limit, cursor)
}

// ListSuspendedPartyMembers lists actively suspended members for a party with cursor pagination.
func (s *PartiesService) ListSuspendedPartyMembers(ctx context.Context, partyID int16, limit int32, cursor int64) ([]queries.ListSuspendedPartyMembersRow, error) {
	arg := queries.ListSuspendedPartyMembersParams{
		PartyID:  partyID,
		LimitNum: limit,
	}
	if cursor > 0 {
		arg.Cursor = pgtype.Int8{Int64: cursor, Valid: true}
	}

	return s.queries.ListSuspendedPartyMembers(ctx, arg)
}

// PartyAdminItem represents a sanitized, UI-friendly party administrator.
type PartyAdminItem struct {
	ID            int64                             `json:"id"`
	FirstName     string                            `json:"first_name"`
	LastName      string                            `json:"last_name"`
	FullName      string                            `json:"full_name"`
	Username      string                            `json:"username"`
	Avatar        *string                           `json:"avatar,omitempty"`
	Email         *string                           `json:"email,omitempty"`
	StateName     *string                           `json:"state_name,omitempty"`
	IsVerified    bool                              `json:"is_verified"`
	IsSuperAdmin  bool                              `json:"is_super_admin"`
	Verifications []queries.GetPageVerificationsRow `json:"verifications"`
}

// ListPartyAdmins retrieves all administrators assigned to a given political party.
func (s *PartiesService) ListPartyAdmins(ctx context.Context, partyID int16) ([]PartyAdminItem, error) {
	// Query users assigned party administrator roles
	arg := queries.ListUsersParams{
		PartyID:       pgtype.Int2{Int16: partyID, Valid: true},
		RoleCodes:     []string{"party_admin", "super_party_admin"},
		AccountStatus: []string{"active", "just_registered", "placeholder"},
		LimitNum:      100,
	}

	userRows, err := s.queries.ListUsers(ctx, arg)
	if err != nil {
		return nil, err
	}
	if len(userRows) == 0 {
		return []PartyAdminItem{}, nil
	}

	// Collect fake IDs to hydrate enriched profile data
	fakeIDs := make([]int64, 0, len(userRows))
	for _, u := range userRows {
		if u.FakeID.Valid {
			fakeIDs = append(fakeIDs, u.FakeID.Int64)
		}
	}

	usersWithPlaces, err := s.usersService.GetUsersByFakeIDs(ctx, fakeIDs)
	if err != nil {
		return nil, err
	}

	// Map enriched users to sanitized admin items
	result := make([]PartyAdminItem, 0, len(usersWithPlaces))
	for _, u := range usersWithPlaces {
		firstName := utils.PgTextOrDefault(u.FirstName, "")
		lastName := utils.PgTextOrDefault(u.LastName, "")
		fullName := strings.TrimSpace(fmt.Sprintf("%s %s", firstName, lastName))
		username := utils.PgTextOrDefault(u.Username, fmt.Sprintf("user_%d", u.ID))
		avatar := utils.PtrFromPgText(u.Avatar)
		email := utils.PtrFromPgText(u.Email)
		stateName := utils.PtrFromString(u.StateName)
		isVerified := u.IsVerified.Valid && u.IsVerified.Bool

		// Check for super party admin role
		isSuperAdmin := false
		for _, rc := range u.Roles.RolesCode {
			if rc == "super_party_admin" {
				isSuperAdmin = true
				break
			}
		}

		result = append(result, PartyAdminItem{
			ID:            u.ID,
			FirstName:     firstName,
			LastName:      lastName,
			FullName:      fullName,
			Username:      username,
			Avatar:        avatar,
			Email:         email,
			StateName:     stateName,
			IsVerified:    isVerified,
			IsSuperAdmin:  isSuperAdmin,
			Verifications: u.Verifications,
		})
	}

	return result, nil
}

// InvalidatePartyMemberSuspensionCache invalidates the Redis suspension cache for a member.
func (s *PartiesService) InvalidatePartyMemberSuspensionCache(ctx context.Context, partyID int16, userID int64) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisPartyMemberSuspension, partyID, userID)
	if err := s.rdb.Del(ctx, cacheKey).Err(); err != nil {
		slog.Error("Failed to invalidate party member suspension cache", "error", err, "partyID", partyID, "userID", userID)
	}
}

// InvalidateMemberPositionAssignmentsCache invalidates the Redis position assignments cache for a member.
func (s *PartiesService) InvalidateMemberPositionAssignmentsCache(ctx context.Context, partyID int16, userID int64) {
	if partyID <= 0 || userID <= 0 {
		return
	}

	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisPartyMemberPositions, partyID, userID)
	if err := s.rdb.Del(ctx, cacheKey).Err(); err != nil {
		slog.Error("Failed to invalidate party member positions cache", "error", err, "partyID", partyID, "userID", userID)
	}
}

// InvalidatePartyOfficialsCache invalidates the Redis cache for chapter officials.
func (s *PartiesService) InvalidatePartyOfficialsCache(ctx context.Context, partyID int16, chapterID int32) {
	if partyID <= 0 || chapterID <= 0 {
		return
	}

	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisPartyChapterOfficials, partyID, chapterID)
	if err := s.rdb.Del(ctx, cacheKey).Err(); err != nil {
		slog.Error("Failed to invalidate party chapter officials cache", "error", err, "partyID", partyID, "chapterID", chapterID)
	}
}

// InvalidateChapterOfficialCache invalidates the Redis cache for a single chapter official by chapterID and positionID.
func (s *PartiesService) InvalidateChapterOfficialCache(ctx context.Context, chapterID int32, positionID int32) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisChapterOfficial, chapterID, positionID)
	if err := s.rdb.Del(ctx, cacheKey).Err(); err != nil {
		slog.Error("Failed to invalidate chapter official cache", "error", err, "chapterID", chapterID, "positionID", positionID)
	}
}

// InvalidatePartyCache invalidates the Redis cache for a given party, its page verifications, and the global parties list.
func (s *PartiesService) InvalidatePartyCache(ctx context.Context, partyID int16) {
	redisPartyInfo := fmt.Sprintf("%s%d", db.RedisPartyInfo, partyID)
	redisPartyBasicInfo := fmt.Sprintf("%s%d", db.RedisPartyBasicInfo, partyID)
	s.rdb.Del(ctx, redisPartyInfo)
	s.rdb.Del(ctx, redisPartyBasicInfo)
	s.rdb.Del(ctx, db.RedisPartiesList)
}

// InvalidateChapterMemberCount removes the cached member count for a chapter.
func (s *PartiesService) InvalidateChapterMemberCount(ctx context.Context, partyID int16, chapterID int32) {
	if partyID <= 0 || chapterID <= 0 {
		return
	}

	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisChapterMemberCount, partyID, chapterID)
	err := s.rdb.Del(ctx, cacheKey).Err()
	if err != nil {
		slog.Error("Failed to invalidate chapter member count in redis", "error", err, "partyID", partyID, "chapterID", chapterID)
	}
}

// InvalidatePartyChapterMembership removes the cached membership boolean for a user in a chapter.
func (s *PartiesService) InvalidatePartyChapterMembership(ctx context.Context, userID int64, partyID int16, chapterID int32) {
	cacheKey := fmt.Sprintf("%s%d:%d:%d", db.RedisPartyChapterMember, partyID, chapterID, userID)
	_ = s.rdb.Del(ctx, cacheKey).Err()
	s.InvalidateUserPartyChapters(ctx, userID, partyID)
}

// InvalidatePartyMembership removes the cached party-wide membership boolean for a user.
func (s *PartiesService) InvalidatePartyMembership(ctx context.Context, userID int64, partyID int16) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisPartyMember, partyID, userID)
	_ = s.rdb.Del(ctx, cacheKey).Err()
	s.InvalidateUserPartyChapters(ctx, userID, partyID)
}

// InvalidatePartyCustomPositionsCache invalidates cached custom positions for a party.
func (s *PartiesService) InvalidatePartyCustomPositionsCache(ctx context.Context, partyID int16) {
	if s.rdb == nil {
		return
	}
	cacheKey := fmt.Sprintf("%s%d", db.RedisPartyCustomPositions, partyID)
	if err := s.rdb.Del(ctx, cacheKey).Err(); err != nil {
		slog.Error("Failed to invalidate party custom positions cache", "error", err, "partyID", partyID)
	}
}

// InvalidatePartyPositionByIDCache invalidates the Redis cache for a single party position.
func (s *PartiesService) InvalidatePartyPositionByIDCache(ctx context.Context, partyID int16, id int32) {
	if s.rdb == nil {
		return
	}
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisPartyPositionByID, partyID, id)
	if err := s.rdb.Del(ctx, cacheKey).Err(); err != nil {
		slog.Error("Failed to invalidate party position cache", "error", err, "partyID", partyID, "id", id)
	}
}

// GetUserPartyChapters lists active chapters of a party that a user belongs to.
// Results are cached in Redis to minimize database lookups.
func (s *PartiesService) GetUserPartyChapters(ctx context.Context, userID int64, partyID int16) ([]queries.GetUserPartyChaptersRow, error) {
	if userID <= 0 || partyID <= 0 {
		return []queries.GetUserPartyChaptersRow{}, nil
	}

	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisUserPartyChapters, partyID, userID)

	// 1. Check Redis cache
	if cachedVal, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		var cached []queries.GetUserPartyChaptersRow
		if jsonErr := json.Unmarshal([]byte(cachedVal), &cached); jsonErr == nil {
			return cached, nil
		}
	}

	// 2. Query DB
	chapters, err := s.queries.GetUserPartyChapters(ctx, queries.GetUserPartyChaptersParams{
		UserID:  userID,
		PartyID: partyID,
	})
	if err != nil {
		return nil, err
	}

	if chapters == nil {
		chapters = []queries.GetUserPartyChaptersRow{}
	}

	// 3. Cache result for 180 days
	if jsonBytes, err := json.Marshal(chapters); err == nil {
		_ = s.rdb.Set(ctx, cacheKey, jsonBytes, db.RedisOneEightyDaysTTL).Err()
	}

	return chapters, nil
}

// InvalidateUserPartyChapters clears the cached user party chapters.
func (s *PartiesService) InvalidateUserPartyChapters(ctx context.Context, userID int64, partyID int16) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisUserPartyChapters, partyID, userID)
	_ = s.rdb.Del(ctx, cacheKey).Err()
}

// ListPartyMembersParams parameters for querying chapter members
type ListPartyMembersParams struct {
	PartyID   int16
	ChapterID int32
	Search    string
	Cursor    int64
	Limit     int32
}

// PartyMemberItem represents a single member of a party chapter
type PartyMemberItem struct {
	MembershipID int64     `json:"membership_id"`
	PartyID      int16     `json:"party_id"`
	ChapterID    int32     `json:"chapter_id"`
	UserID       int64     `json:"user_id"`
	FakeID       *int64    `json:"fake_id,omitempty"`
	Username     string    `json:"username"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Avatar       *string   `json:"avatar,omitempty"`
	IsVerified   bool      `json:"is_verified"`
	PositionName *string   `json:"position_name,omitempty"`
	Status       string    `json:"status"`
	JoinedAt     time.Time `json:"joined_at"`
}

// PartyMembersMeta pagination metadata
type PartyMembersMeta struct {
	NextCursor *int64 `json:"next_cursor"`
	HasMore    bool   `json:"has_more"`
}

// PartyMembersResult response payload for chapter members listing
type PartyMembersResult struct {
	PartyID    int16             `json:"party_id"`
	ChapterID  int32             `json:"chapter_id"`
	TotalCount int64             `json:"total_count"`
	Members    []PartyMemberItem `json:"members"`
	Meta       PartyMembersMeta  `json:"meta"`
}

// ListPartyChapterMembers retrieves active members for a given party chapter.
func (s *PartiesService) ListPartyChapterMembers(ctx context.Context, params ListPartyMembersParams) (*PartyMembersResult, error) {
	if params.Limit <= 0 || params.Limit > 100 {
		params.Limit = 30
	}

	query := `
		SELECT 
			pm.id,
			pm.party_id,
			pm.chapter_id,
			pm.user_id,
			u.fake_id,
			COALESCE(u.username, ''),
			COALESCE(u.first_name, ''),
			COALESCE(u.last_name, ''),
			u.avatar,
			COALESCE(u.is_verified, false),
			pos.name,
			pm.status,
			pm.created_at
		FROM party_membership pm
		JOIN users u ON u.id = pm.user_id
		LEFT JOIN LATERAL (
			SELECT p.name
			FROM party_position_assignments pa
			JOIN party_positions p ON p.id = pa.position_id
			WHERE pa.party_id = pm.party_id
			  AND pa.chapter_id = pm.chapter_id
			  AND pa.user_id = pm.user_id
			  AND pa.status = 'active'
			ORDER BY pa.id ASC
			LIMIT 1
		) pos ON true
		WHERE pm.party_id = $1
		  AND pm.chapter_id = $2
		  AND pm.status = 'active'
		  AND ($3::bigint IS NULL OR pm.id < $3)
		  AND ($4::text IS NULL OR (
			u.first_name ILIKE '%' || $4 || '%' OR
			u.last_name ILIKE '%' || $4 || '%' OR
			u.username ILIKE '%' || $4 || '%' OR
			(u.first_name || ' ' || u.last_name) ILIKE '%' || $4 || '%'
		  ))
		ORDER BY pm.id DESC
		LIMIT $5
	`

	var cursorParam interface{}
	if params.Cursor > 0 {
		cursorParam = params.Cursor
	}

	var searchParam interface{}
	if strings.TrimSpace(params.Search) != "" {
		searchParam = strings.TrimSpace(params.Search)
	}

	rows, err := s.pool.Query(ctx, query, params.PartyID, params.ChapterID, cursorParam, searchParam, params.Limit+1)
	if err != nil {
		return nil, fmt.Errorf("failed to query party chapter members: %w", err)
	}
	defer rows.Close()

	var members []PartyMemberItem
	for rows.Next() {
		var m PartyMemberItem
		var fakeID *int64
		var avatar *string
		var posName *string
		if err := rows.Scan(
			&m.MembershipID,
			&m.PartyID,
			&m.ChapterID,
			&m.UserID,
			&fakeID,
			&m.Username,
			&m.FirstName,
			&m.LastName,
			&avatar,
			&m.IsVerified,
			&posName,
			&m.Status,
			&m.JoinedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan party chapter member row: %w", err)
		}
		m.FakeID = fakeID
		m.Avatar = avatar
		m.PositionName = posName
		members = append(members, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading party chapter member rows: %w", err)
	}

	hasMore := false
	var nextCursor *int64
	if int32(len(members)) > params.Limit {
		hasMore = true
		cVal := members[params.Limit-1].MembershipID
		nextCursor = &cVal
		members = members[:params.Limit]
	}

	totalCount, _ := s.GetChapterMemberCount(ctx, params.PartyID, params.ChapterID)

	if members == nil {
		members = []PartyMemberItem{}
	}

	return &PartyMembersResult{
		PartyID:    params.PartyID,
		ChapterID:  params.ChapterID,
		TotalCount: totalCount,
		Members:    members,
		Meta: PartyMembersMeta{
			NextCursor: nextCursor,
			HasMore:    hasMore,
		},
	}, nil
}
