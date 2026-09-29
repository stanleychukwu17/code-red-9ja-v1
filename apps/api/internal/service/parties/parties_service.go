package partiesservice

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"free9ja/api/internal/constants"
	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	monnifyclient "free9ja/api/internal/service/monnify"
	"free9ja/api/internal/service/notifications"
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

// PartiesService manages political parties and their Monnify-backed wallets.
type PartiesService struct {
	queries                  *queries.Queries
	pool                     *pgxpool.Pool
	rdb                      *redis.Client
	monnify                  *monnifyclient.Client
	utils                    *utils.Utils
	pageVerificationsService PageVerificationsService
	usersService             UsersService
	notificationsService     NotificationsService
}

// UsersService interface defines the methods needed from the users service
type UsersService interface {
	GetUserByFakeID(ctx context.Context, fakeID int64) (queries.UserWithPlaces, error)
	UpdateUserParty(ctx context.Context, userID int64, partyID *int16, fakeID int64) error
	StripPartyAdminRoles(ctx context.Context, userID int64, fakeID int64) error
}

// PageVerificationsService interface defines the methods needed from the page verifications service
type PageVerificationsService interface {
	GetPageVerifications(ctx context.Context, pageType string, pageID int64) ([]queries.GetPageVerificationsRow, error)
}

// NotificationsService defines methods required for dispatching notifications
type NotificationsService interface {
	CreatePartyNotification(ctx context.Context, params notifications.CreatePartyNotificationInput) (*notifications.PartyNotificationItemResponse, error)
}

// NewPartiesService creates a new PartiesService.
// monnify may be nil in test environments — wallet creation will be skipped.
func NewPartiesService(q *queries.Queries, pool *pgxpool.Pool, rdb *redis.Client, monnify *monnifyclient.Client, u *utils.Utils, ns NotificationsService) *PartiesService {
	return &PartiesService{
		queries:              q,
		pool:                 pool,
		rdb:                  rdb,
		monnify:              monnify,
		utils:                u,
		notificationsService: ns,
	}
}

// SetPageVerificationsService sets the PageVerificationsService to avoid circular dependency in constructor.
func (s *PartiesService) SetPageVerificationsService(pvs PageVerificationsService) {
	s.pageVerificationsService = pvs
}

// SetUsersService sets the UsersService to avoid circular dependency in constructor.
func (s *PartiesService) SetUsersService(us UsersService) {
	s.usersService = us
}

// CreateParty inserts a party into the database and, if a Monnify client is
// configured, immediately provisions a reserved virtual account (wallet) for it.
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

	// Provision wallet asynchronously via Monnify (best-effort).
	// Wallet creation failure does NOT roll back the party insert — the admin
	// can retry wallet creation later via a dedicated endpoint.
	if s.monnify != nil {
		if _, walletErr := s.CreatePartyWallet(ctx, party); walletErr != nil {
			// Log but don't fail — party creation must succeed either way.
			_ = walletErr
		}
	}

	// Invalidate parties listings cache
	s.InvalidatePartyCache(ctx, party.ID)

	return party, nil
}

// CreatePartyWallet calls Monnify to create a reserved virtual account for the
// given party, then persists the wallet record in party_wallets.
//
// It is safe to call this more than once — subsequent calls will return an error
// because account_reference is UNIQUE and Monnify rejects duplicate references.
func (s *PartiesService) CreatePartyWallet(ctx context.Context, party queries.Party) (queries.PartyWallet, error) {
	if s.monnify == nil {
		return queries.PartyWallet{}, fmt.Errorf("monnify client is not configured")
	}

	// Build a stable, human-readable reference tied to the party ID.
	accountReference := fmt.Sprintf("free9ja-party-%d", party.ID)

	resp, err := s.monnify.CreateReservedAccount(ctx, monnifyclient.ReservedAccountRequest{
		AccountReference: accountReference,
		AccountName:      party.Name + " - free9ja",
		CustomerEmail:    fmt.Sprintf("party-%d@free9ja.com", party.ID),
		CustomerName:     party.Name,
		CustomerBvn:      "22222222222", // Default dummy BVN to ensure accounts are generated in sandbox/testing
	})
	if err != nil {
		return queries.PartyWallet{}, fmt.Errorf("monnify reserved account: %w", err)
	}

	// Serialize the account numbers slice to JSONB.
	accountNumbersJSON, err := json.Marshal(resp.AccountNumbers)
	if err != nil {
		return queries.PartyWallet{}, fmt.Errorf("marshal account numbers: %w", err)
	}

	wallet, err := s.queries.CreatePartyWallet(ctx, queries.CreatePartyWalletParams{
		PartyID:          party.ID,
		AccountReference: accountReference,
		AccountNumbers:   accountNumbersJSON,
	})
	if err != nil {
		return queries.PartyWallet{}, fmt.Errorf("persist party wallet: %w", err)
	}

	return wallet, nil
}

// GetPartyBasicInfo retrieves basic party info.
func (s *PartiesService) GetPartyBasicInfo(ctx context.Context, partyID int16) *queries.PartyBasicInfoWithVerifications {
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
	if partyRow.IsVerified.Bool && s.pageVerificationsService != nil {
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

		if partyRow.IsVerified.Bool && s.pageVerificationsService != nil {
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

// GetPartyByShortName returns a party matching the given short name from the cached parties list.
func (s *PartiesService) GetPartyByShortName(ctx context.Context, shortName string) (*queries.PartyWithVerifications, error) {
	// Retrieve all parties (cached)
	parties, err := s.ListParties(ctx)
	if err != nil {
		return nil, err
	}

	// Match short name case-insensitively
	for _, p := range parties {
		if strings.EqualFold(p.ShortName, shortName) {
			partyCopy := p
			return &partyCopy, nil
		}
	}

	return nil, pgx.ErrNoRows
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
		if p.IsVerified.Bool && s.pageVerificationsService != nil {
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
	PositionCode string  `json:"position_code"`
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
	TotalMembers   int64               `json:"total_members"`
	SampleMembers  []PartySampleMember `json:"sample_members"`
	Officials      []PartyOfficialCard `json:"officials"`
	IsUserMember   bool                `json:"is_user_member"`
}

// GetPartySampleMemberAvatars retrieves sample member avatars for a party, cached in Redis.
func (s *PartiesService) GetPartySampleMemberAvatars(ctx context.Context, partyID int16) ([]PartySampleMember, error) {
	cacheKey := fmt.Sprintf("%s%d", db.RedisParties5MemberAvatars, partyID)

	// Try to get from Redis
	if cachedData, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		var sampleMembers []PartySampleMember
		if err := json.Unmarshal([]byte(cachedData), &sampleMembers); err == nil {
			return sampleMembers, nil
		}
	}

	// Fetch sample member avatars from the database
	avatars, err := s.queries.GetPartySampleMemberAvatars(ctx, partyID)
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
			posName := "Official"
			if positionID == constants.PartyPositionChairmanID {
				posName = "Chairman"
			} else if positionID == constants.PartyPositionSecretaryID {
				posName = "Secretary"
			}

			vacantOfficial := PartyOfficialCard{
				PositionID:   positionID,
				PositionName: posName,
				IsVacant:     true,
			}
			// Cache vacant card
			if data, marshalErr := json.Marshal(vacantOfficial); marshalErr == nil {
				_ = s.rdb.Set(ctx, cacheKey, data, db.RedisSevenDaysTTL).Err()
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
		_ = s.rdb.Set(ctx, cacheKey, data, db.RedisSevenDaysTTL).Err()
	}

	return &official, nil
}

// GetPartyCards returns all active parties enriched with real member counts,
// sample member avatars, top national leadership positions, and the user's membership status.
func (s *PartiesService) GetPartyCards(ctx context.Context, userPartyID int16) ([]PartyCard, error) {
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
		if avatars, err := s.GetPartySampleMemberAvatars(ctx, p.ID); err == nil {
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

	// 4. Build final PartyCard list
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
			TotalMembers:   memberCountsMap[p.ID],
			SampleMembers:  sampleMembers,
			Officials:      officials,
			IsUserMember:   userPartyID > 0 && p.ID == userPartyID,
		})
	}

	return cards, nil
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
	return s.queries.DeleteParty(ctx, int16(id))
}

// GetPartyWallet retrieves the wallet associated with a party.
func (s *PartiesService) GetPartyWallet(ctx context.Context, partyID int16) (queries.PartyWallet, error) {
	return s.queries.GetPartyWalletByPartyID(ctx, partyID)
}

// GetPartyWalletTransactions returns a paginated list of wallet transactions
// for the given party, most recent first.
func (s *PartiesService) GetPartyWalletTransactions(ctx context.Context, partyID int16, limit, offset int32) ([]queries.PartyWalletTransaction, error) {
	wallet, err := s.queries.GetPartyWalletByPartyID(ctx, partyID)
	if err != nil {
		return nil, fmt.Errorf("wallet not found for party %d: %w", partyID, err)
	}

	return s.queries.ListWalletTransactions(ctx, queries.ListWalletTransactionsParams{
		WalletID: wallet.ID,
		Limit:    limit,
		Offset:   offset,
	})
}

// ── Webhook-facing methods (called by the webhook handler) ───────────────────

// GetWalletByAccountReference looks up a wallet by the Monnify account reference.
func (s *PartiesService) GetWalletByAccountReference(ctx context.Context, accountReference string) (queries.PartyWallet, error) {
	return s.queries.GetPartyWalletByAccountReference(ctx, accountReference)
}

// CreditWallet credits a wallet and records the transaction in a single
// logical operation (two sequential statements — production code should wrap
// these in a DB transaction if you want full ACID guarantees).
//
// amountKobo must be positive.
// It is idempotent: if transactionReference already exists, it returns the
// existing transaction without crediting again.
func (s *PartiesService) CreditWallet(
	ctx context.Context,
	walletID int64,
	amountKobo int64,
	transactionReference string,
	payerName, payerAccountNumber, payerBankCode, narration string,
	rawPayload []byte,
) (queries.PartyWalletTransaction, error) {
	// Idempotency check.
	existing, err := s.queries.GetWalletTransactionByReference(ctx, transactionReference)
	if err == nil {
		// Transaction already processed — return early.
		return existing, nil
	}

	// Credit the balance.
	updatedWallet, err := s.queries.CreditPartyWallet(ctx, queries.CreditPartyWalletParams{
		BalanceKobo: amountKobo,
		ID:          walletID,
	})
	if err != nil {
		return queries.PartyWalletTransaction{}, fmt.Errorf("credit wallet: %w", err)
	}

	// Persist the ledger entry.
	txn, err := s.queries.CreateWalletTransaction(ctx, queries.CreateWalletTransactionParams{
		WalletID:             walletID,
		TransactionReference: transactionReference,
		Type:                 "credit",
		TransactionCategory:  "wallet_funding",
		AmountKobo:           amountKobo,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            utils.PgTextFromString(payerName),
		PayerAccountNumber:   utils.PgTextFromString(payerAccountNumber),
		PayerBankCode:        utils.PgTextFromString(payerBankCode),
		Narration:            utils.PgTextFromString(narration),
		RawPayload:           rawPayload,
	})
	if err != nil {
		return queries.PartyWalletTransaction{}, fmt.Errorf("record transaction: %w", err)
	}

	return txn, nil
}

// WithdrawFromWallet debits a party wallet and records the withdrawal as a
// "debit" transaction. If the wallet has insufficient funds, an error is returned.
//
// transactionReference must be unique per withdrawal request (caller generates it).
// bankAccountNumber / bankCode are the destination account for the payout.
func (s *PartiesService) WithdrawFromWallet(
	ctx context.Context,
	partyID int16,
	amountKobo int64,
	transactionReference string,
	bankAccountNumber, bankCode, narration string,
) (queries.PartyWalletTransaction, error) {
	if amountKobo <= 0 {
		return queries.PartyWalletTransaction{}, fmt.Errorf("withdrawal amount must be positive")
	}

	// Get the wallet
	wallet, err := s.queries.GetPartyWalletByPartyID(ctx, partyID)
	if err != nil {
		return queries.PartyWalletTransaction{}, fmt.Errorf("wallet not found: %w", err)
	}

	// Idempotency: check for duplicate reference
	existing, err := s.queries.GetWalletTransactionByReference(ctx, transactionReference)
	if err == nil {
		return existing, nil
	}

	// Attempt to debit (query returns error / no rows if balance is insufficient)
	updatedWallet, err := s.queries.DebitPartyWallet(ctx, queries.DebitPartyWalletParams{
		BalanceKobo: amountKobo,
		ID:          wallet.ID,
	})
	if err != nil {
		return queries.PartyWalletTransaction{}, fmt.Errorf("insufficient funds or debit failed: %w", err)
	}

	// Record the ledger entry
	txn, err := s.queries.CreateWalletTransaction(ctx, queries.CreateWalletTransactionParams{
		WalletID:             wallet.ID,
		TransactionReference: transactionReference,
		Type:                 "debit",
		TransactionCategory:  "wallet_withdrawal",
		AmountKobo:           amountKobo,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            utils.PgTextFromString(""),
		PayerAccountNumber:   utils.PgTextFromString(bankAccountNumber),
		PayerBankCode:        utils.PgTextFromString(bankCode),
		Narration:            utils.PgTextFromString(narration),
		RawPayload:           nil,
	})
	if err != nil {
		return queries.PartyWalletTransaction{}, fmt.Errorf("record withdrawal transaction: %w", err)
	}

	return txn, nil
}

// ProvisionMissingWallets finds all political parties that do not have a wallet
// and provisions a Monnify reserved virtual account for each.
func (s *PartiesService) ProvisionMissingWallets(ctx context.Context) (int, int, error) {
	PartiesWithNoWallet, err := s.queries.ListPartiesWithoutWallet(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to fetch parties without wallets: %w", err)
	}

	success := 0
	failed := 0
	for _, party := range PartiesWithNoWallet {
		if _, walletErr := s.CreatePartyWallet(ctx, party); walletErr != nil {
			slog.Warn("failed to provision party wallet",
				"party_id", party.ID,
				"party", party.ShortName,
				"err", walletErr)
			failed++
		} else {
			success++
		}
	}
	return success, failed, nil
}

// GetGlobalSlotPrice retrieves the app-wide slot price in Kobo.
// Defaults to 100,000 Kobo (1,000 NGN) if not set.
func (s *PartiesService) GetGlobalSlotPrice(ctx context.Context) (int64, error) {
	setting, err := s.queries.GetSystemSetting(ctx, "slot_cost_kobo")
	if err != nil {
		// Fallback to default of 1000 NGN (100,000 Kobo) if the record is missing.
		return 100000, nil
	}

	var price int64
	if err := json.Unmarshal(setting.Value, &price); err != nil {
		return 0, fmt.Errorf("failed to unmarshal slot price setting: %w", err)
	}

	return price, nil
}

// UpdateGlobalSlotPrice sets the app-wide slot price in Kobo.
func (s *PartiesService) UpdateGlobalSlotPrice(ctx context.Context, priceKobo int64) (int64, error) {
	if priceKobo < 0 {
		return 0, fmt.Errorf("slot price cannot be negative")
	}

	valBytes, err := json.Marshal(priceKobo)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal slot price: %w", err)
	}

	_, err = s.queries.UpdateSystemSetting(ctx, queries.UpdateSystemSettingParams{
		Key:   "slot_cost_kobo",
		Value: valBytes,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to update slot price setting: %w", err)
	}

	return priceKobo, nil
}

// GetPartySlotPrice calculates the customized slot price for a given party,
// applying their discount percentage to the global slot price.
func (s *PartiesService) GetPartySlotPrice(ctx context.Context, partyID int16) (int64, error) {
	globalPrice, err := s.GetGlobalSlotPrice(ctx)
	if err != nil {
		return 0, err
	}

	party, err := s.GetPartyByID(ctx, partyID)
	if err != nil {
		return 0, fmt.Errorf("failed to get party: %w", err)
	}

	var discount float64
	if party.DiscountPercentage.Valid {
		if err := party.DiscountPercentage.Scan(&discount); err != nil {
			discount = 0.0
		}
	}

	if discount <= 0.0 {
		return globalPrice, nil
	}

	if discount >= 100.0 {
		return 0, nil
	}

	finalPrice := float64(globalPrice) * (1.0 - (discount / 100.0))
	return int64(finalPrice), nil
}

// BuySlots debits the party wallet and adds slots directly to the party's balance.
// This is executed as a database transaction.
func (s *PartiesService) BuySlots(ctx context.Context, partyID int16, quantity int32) (queries.Party, error) {
	if quantity <= 0 {
		return queries.Party{}, fmt.Errorf("quantity must be positive")
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

	// Fetch custom slot cost for the party inside transaction
	globalPriceSetting, err := txQueries.GetSystemSetting(ctx, "slot_cost_kobo")
	globalPrice := int64(100000)
	if err == nil {
		_ = json.Unmarshal(globalPriceSetting.Value, &globalPrice)
	}

	party, err := txQueries.GetPartyByID(ctx, partyID)
	if err != nil {
		return queries.Party{}, fmt.Errorf("failed to get party: %w", err)
	}

	var discount float64
	if party.DiscountPercentage.Valid {
		_ = party.DiscountPercentage.Scan(&discount)
	}

	unitPrice := globalPrice
	if discount > 0.0 && discount < 100.0 {
		unitPrice = int64(float64(globalPrice) * (1.0 - (discount / 100.0)))
	} else if discount >= 100.0 {
		unitPrice = 0
	}

	totalCost := unitPrice * int64(quantity)

	// Get wallet details
	wallet, err := txQueries.GetPartyWalletByPartyID(ctx, partyID)
	if err != nil {
		return queries.Party{}, fmt.Errorf("wallet not found for party: %w", err)
	}

	if wallet.BalanceKobo < totalCost {
		return queries.Party{}, fmt.Errorf("insufficient wallet balance: required %d kobo, have %d kobo", totalCost, wallet.BalanceKobo)
	}

	// Debit the wallet
	updatedWallet, err := txQueries.DebitPartyWallet(ctx, queries.DebitPartyWalletParams{
		BalanceKobo: totalCost,
		ID:          wallet.ID,
	})
	if err != nil {
		return queries.Party{}, fmt.Errorf("wallet debit failed: %w", err)
	}

	// Log financial transaction in party_wallet_transactions
	txRef := fmt.Sprintf("slot-purchase-%d-%d", partyID, time.Now().UnixNano())
	_, err = txQueries.CreateWalletTransaction(ctx, queries.CreateWalletTransactionParams{
		WalletID:             wallet.ID,
		TransactionReference: txRef,
		Type:                 "debit",
		TransactionCategory:  "slot_purchase",
		AmountKobo:           totalCost,
		BalanceAfterKobo:     updatedWallet.BalanceKobo,
		PayerName:            utils.PgTextFromString(""),
		PayerAccountNumber:   utils.PgTextFromString(""),
		PayerBankCode:        utils.PgTextFromString(""),
		Narration:            utils.PgTextFromString(fmt.Sprintf("Purchased %d polling agent slots", quantity)),
		RawPayload:           []byte("{}"),
	})
	if err != nil {
		return queries.Party{}, fmt.Errorf("failed to log slot purchase transaction: %w", err)
	}

	// Add slots directly to parties table
	updatedParty, err := txQueries.AddPartySlots(ctx, queries.AddPartySlotsParams{
		Slots: quantity,
		ID:    partyID,
	})
	if err != nil {
		return queries.Party{}, fmt.Errorf("failed to increment party slots: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return queries.Party{}, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Invalidate the cache for the party since their slots have changed
	s.InvalidatePartyCache(ctx, partyID)

	return updatedParty, nil
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
		Type:                 "debit",
		TransactionCategory:  "allowance_deposit",
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
// It also invalidates the cache for the party.
func (s *PartiesService) UpdatePartyIsVerified(ctx context.Context, partyID int16, isVerified bool) error {
	err := s.queries.UpdatePartyIsVerified(ctx, queries.UpdatePartyIsVerifiedParams{
		ID:         partyID,
		IsVerified: pgtype.Bool{Bool: isVerified, Valid: true},
	})
	if err != nil {
		return err
	}

	// Invalidate cache
	s.InvalidatePartyCache(ctx, partyID)

	return nil
}

// InvalidatePartyCache invalidates the Redis cache for a given party and the global parties list.
func (s *PartiesService) InvalidatePartyCache(ctx context.Context, partyID int16) {
	redisPartyInfo := fmt.Sprintf("%s%d", db.RedisPartyInfo, partyID)
	redisPartyBasicInfo := fmt.Sprintf("%s%d", db.RedisPartyBasicInfo, partyID)

	s.rdb.Del(ctx, redisPartyInfo)
	s.rdb.Del(ctx, redisPartyBasicInfo)
	s.rdb.Del(ctx, db.RedisPartiesList)
}

// --start-- party chapters
// GetOrCreateNationalChapter retrieves the national chapter for a party in a specific country,
// and creates one if it doesn't already exist.
func (s *PartiesService) GetOrCreateNationalChapter(ctx context.Context, partyID, countryID int16) (int32, error) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisNationalChapter, partyID, countryID)

	// Try to get from Redis
	if valStr, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if val, err := strconv.ParseInt(valStr, 10, 32); err == nil {
			return int32(val), nil
		}
	}

	natChapterID, err := s.queries.GetOrCreateNationalChapter(ctx, queries.GetOrCreateNationalChapterParams{
		PartyID:   partyID,
		CountryID: pgtype.Int2{Int16: countryID, Valid: true},
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get or create national chapter: %w", err)
	}

	// Cache and return
	_ = s.rdb.Set(ctx, cacheKey, natChapterID, db.RedisOneEightyDaysTTL).Err()
	return natChapterID, nil
}

// GetOrCreateZonalChapter retrieves the zonal chapter for a party in a specific geopolitical zone,
// and creates one if it doesn't already exist.
func (s *PartiesService) GetOrCreateZonalChapter(ctx context.Context, partyID, zonalID int16) (int32, error) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisZonalChapter, partyID, zonalID)

	// Try to get from Redis
	if valStr, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if val, err := strconv.ParseInt(valStr, 10, 32); err == nil {
			return int32(val), nil
		}
	}

	zonalChapterID, err := s.queries.GetOrCreateZonalChapter(ctx, queries.GetOrCreateZonalChapterParams{
		PartyID: partyID,
		ZonalID: pgtype.Int2{Int16: zonalID, Valid: true},
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get or create zonal chapter: %w", err)
	}

	_ = s.rdb.Set(ctx, cacheKey, zonalChapterID, db.RedisOneEightyDaysTTL).Err()
	return zonalChapterID, nil
}

// GetOrCreateStateChapter retrieves the state chapter for a party in a specific state,
// and creates one if it doesn't already exist.
func (s *PartiesService) GetOrCreateStateChapter(ctx context.Context, partyID, stateID int16) (int32, error) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisStateChapter, partyID, stateID)

	// Try to get from Redis
	if valStr, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if val, err := strconv.ParseInt(valStr, 10, 32); err == nil {
			return int32(val), nil
		}
	}

	stateChapterID, err := s.queries.GetOrCreateStateChapter(ctx, queries.GetOrCreateStateChapterParams{
		PartyID: partyID,
		StateID: pgtype.Int2{Int16: stateID, Valid: true},
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get or create state chapter: %w", err)
	}

	_ = s.rdb.Set(ctx, cacheKey, stateChapterID, db.RedisOneEightyDaysTTL).Err()
	return stateChapterID, nil
}

// GetOrCreateLGAChapter retrieves the LGA chapter for a party in a specific LGA,
// and creates one if it doesn't already exist.
func (s *PartiesService) GetOrCreateLGAChapter(ctx context.Context, partyID int16, lgaID int32) (int32, error) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisLGAChapter, partyID, lgaID)

	// Try to get from Redis
	if valStr, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if val, err := strconv.ParseInt(valStr, 10, 32); err == nil {
			return int32(val), nil
		}
	}

	lgaChapterID, err := s.queries.GetOrCreateLGAChapter(ctx, queries.GetOrCreateLGAChapterParams{
		PartyID: partyID,
		ID:      lgaID,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get or create LGA chapter: %w", err)
	}

	_ = s.rdb.Set(ctx, cacheKey, lgaChapterID, db.RedisOneEightyDaysTTL).Err()
	return lgaChapterID, nil
}

// GetOrCreateWardChapter retrieves the Ward chapter for a party in a specific Ward,
// and creates one (as well as ensuring its parent LGA chapter exists) if it doesn't already exist.
func (s *PartiesService) GetOrCreateWardChapter(ctx context.Context, partyID int16, wardID int32) (int32, error) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisWardChapter, partyID, wardID)

	// Try to get from Redis
	if valStr, err := s.rdb.Get(ctx, cacheKey).Result(); err == nil {
		if val, err := strconv.ParseInt(valStr, 10, 32); err == nil {
			return int32(val), nil
		}
	}

	wardChapterID, err := s.queries.GetOrCreateWardChapter(ctx, queries.GetOrCreateWardChapterParams{
		PartyID: partyID,
		ID:      wardID,
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get or create Ward chapter: %w", err)
	}

	// Ensure parent LGA chapter also exists
	if wardChapter, getErr := s.queries.GetPartyChapterByID(ctx, wardChapterID); getErr == nil && wardChapter.LgaID.Valid {
		_, _ = s.GetOrCreateLGAChapter(ctx, partyID, wardChapter.LgaID.Int32)
	}

	_ = s.rdb.Set(ctx, cacheKey, wardChapterID, db.RedisOneEightyDaysTTL).Err()
	return wardChapterID, nil
}

// GetChapterMemberCount retrieves the number of active members in a chapter.
// It checks Redis first and falls back to the database if not found.
func (s *PartiesService) GetChapterMemberCount(ctx context.Context, partyID int16, chapterID int32) (int64, error) {
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

// InvalidateChapterMemberCount removes the cached member count for a chapter.
func (s *PartiesService) InvalidateChapterMemberCount(ctx context.Context, partyID int16, chapterID int32) {
	cacheKey := fmt.Sprintf("%s%d:%d", db.RedisChapterMemberCount, partyID, chapterID)
	err := s.rdb.Del(ctx, cacheKey).Err()
	if err != nil {
		slog.Error("Failed to invalidate chapter member count in redis", "error", err, "partyID", partyID, "chapterID", chapterID)
	}
}

//--end-- party chapters

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
	}

	// Revoke party-scoped administrative roles (party_admin, super_party_admin)
	_ = s.usersService.StripPartyAdminRoles(ctx, userID, userFid)

	// Remove the user's active party affiliation from the users table
	err = s.usersService.UpdateUserParty(ctx, userID, nil, userFid)
	if err != nil {
		return fmt.Errorf("failed to clear user party_id: %w", err)
	}

	return nil
}

// JoinParty allows a user to become a new party member.
func (s *PartiesService) JoinParty(ctx context.Context, partyID int16, chapterID int32, userID, userFid int64) error {
	if partyID <= 0 {
		return fmt.Errorf("invalid party ID: must be greater than zero")
	}

	// 1. Fetch the user details to check their current party affiliation.
	user, err := s.usersService.GetUserByFakeID(ctx, userFid)
	if err != nil {
		return fmt.Errorf("failed to fetch user details: %w", err)
	}

	// 2. Reject if user is affiliated with a different party.
	// Users must explicitly leave their current party before joining a different one.
	if user.PartyID.Valid && user.PartyID.Int16 != partyID {
		return fmt.Errorf("you are already a member of a different party; you must leave your current party before joining another one")
	}

	// 3. Resolve the chapter the user is joining.
	// If chapterID is 0, default directly to the national chapter.
	// Users can later drill down to state, LGA, or ward chapters via dialogs in the UI.
	var finalChapterID int32 = chapterID
	if finalChapterID == 0 {
		natChapterID, err := s.GetOrCreateNationalChapter(ctx, partyID, constants.NigeriaCountryID)
		if err != nil {
			return fmt.Errorf("failed to resolve national chapter: %w", err)
		}

		finalChapterID = natChapterID
	}

	// 4. Insert the new membership record directly.
	err = s.queries.AddPartyMembership(ctx, queries.AddPartyMembershipParams{
		UserID:    userID,
		PartyID:   partyID,
		ChapterID: finalChapterID,
	})
	if err != nil {
		return fmt.Errorf("failed to add party membership: %w", err)
	}

	// Invalidate cache of chapter member count
	s.InvalidateChapterMemberCount(ctx, partyID, finalChapterID)

	// 5. Log the milestone in party_member_milestones for audit trails and user activity timeline.
	_ = s.queries.AddPartyMemberMilestone(ctx, queries.AddPartyMemberMilestoneParams{
		UserID:        userID,
		PartyID:       partyID,
		ChapterID:     pgtype.Int4{Int32: finalChapterID, Valid: true},
		MilestoneType: constants.MilestoneTypeJoined,
		Metadata:      []byte("{}"),
	})

	// 6. Update the user's active party affiliation in the users table (if not already set)
	if !user.PartyID.Valid || user.PartyID.Int16 != partyID {
		err = s.usersService.UpdateUserParty(ctx, userID, &partyID, userFid)
		if err != nil {
			return fmt.Errorf("failed to update user party_id: %w", err)
		}
	}

	// 7. Notify party and chapter officials asynchronously
	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		// Aggregate daily member joins under a single rollup alert
		groupKey := constants.GroupKeyPartyNewMembers(partyID, finalChapterID)

		// send notification to party and chapter officials asynchronously
		_, _ = s.notificationsService.CreatePartyNotification(bgCtx, notifications.CreatePartyNotificationInput{
			PartyID:     partyID,
			ActorUserID: &userID,
			ChapterID:   &finalChapterID,
			Category:    constants.PartyNotificationCategoryMembership,
			Type:        constants.NotificationTypeNewMemberJoined,
			Priority:    constants.NotificationPriorityNormal,
			GroupKey:    &groupKey,
			Metadata:    map[string]any{},
		})
	}()

	return nil
}

// GetMarketingPlansByType returns marketing plans of a specific type
func (s *PartiesService) GetMarketingPlansByType(ctx context.Context, campaignType string) ([]queries.Plan, error) {
	return s.queries.GetMarketingPlansByType(ctx, campaignType)
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

	if electionGroup.ElectionDate.Valid {
		electionTime := electionGroup.ElectionDate.Time
		today := time.Now().Truncate(24 * time.Hour)
		electionDateOnly := electionTime.Truncate(24 * time.Hour)

		if !electionDateOnly.After(today) {
			return queries.PartyMarketingCampaign{}, fmt.Errorf("one can't create an agent marketing campaign for an election group with election_date as today or in the past")
		}
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
		Type:                 "debit",
		TransactionCategory:  "marketing_campaign",
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

// ProcessDailyMarketingCampaignDeductions deducts daily marketing campaign budgets and marks expired campaigns as completed.
func (s *PartiesService) ProcessDailyMarketingCampaignDeductions(ctx context.Context) ([]queries.PartyMarketingCampaign, error) {
	return s.queries.ProcessDailyMarketingCampaignDeductions(ctx)
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

// --start-- party positions & officials

// ListPartyPositions returns all positions (default and custom for this party), optionally filtered by chapter level.
func (s *PartiesService) ListPartyPositions(ctx context.Context, partyID int16, chapterType *string) ([]queries.PartyPosition, error) {
	arg := queries.ListPartyPositionsParams{
		PartyID: pgtype.Int2{Int16: partyID, Valid: true},
	}
	if chapterType != nil && *chapterType != "" {
		arg.ChapterType = pgtype.Text{String: *chapterType, Valid: true}
	}
	return s.queries.ListPartyPositions(ctx, arg)
}

// GetPartyPositionByID returns a single position by ID.
func (s *PartiesService) GetPartyPositionByID(ctx context.Context, id int32, partyID int16) (queries.PartyPosition, error) {
	return s.queries.GetPartyPositionByID(ctx, queries.GetPartyPositionByIDParams{
		ID:      id,
		PartyID: pgtype.Int2{Int16: partyID, Valid: true},
	})
}

// CreatePartyCustomPosition creates a new custom position for the party.
func (s *PartiesService) CreatePartyCustomPosition(ctx context.Context, arg queries.CreatePartyCustomPositionParams) (queries.PartyPosition, error) {
	return s.queries.CreatePartyCustomPosition(ctx, arg)
}

// UpdatePartyCustomPosition updates an existing custom position owned by the party.
func (s *PartiesService) UpdatePartyCustomPosition(ctx context.Context, arg queries.UpdatePartyCustomPositionParams) (queries.PartyPosition, error) {
	return s.queries.UpdatePartyCustomPosition(ctx, arg)
}

// DeletePartyCustomPosition deletes a custom position owned by the party.
func (s *PartiesService) DeletePartyCustomPosition(ctx context.Context, id int32, partyID int16) error {
	return s.queries.DeletePartyCustomPosition(ctx, queries.DeletePartyCustomPositionParams{
		ID:      id,
		PartyID: pgtype.Int2{Int16: partyID, Valid: true},
	})
}

// AssignPartyPosition assigns a member to a position in a chapter with occupancy checking.
func (s *PartiesService) AssignPartyPosition(ctx context.Context, arg queries.AssignPartyPositionParams) (queries.PartyPositionAssignment, error) {
	// Verify position exists and check max occupants
	pos, err := s.queries.GetPartyPositionByID(ctx, queries.GetPartyPositionByIDParams{
		ID:      arg.PositionID,
		PartyID: pgtype.Int2{Int16: arg.PartyID, Valid: true},
	})
	if err != nil {
		return queries.PartyPositionAssignment{}, fmt.Errorf("position not found: %w", err)
	}

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

	return s.queries.AssignPartyPosition(ctx, arg)
}

// UpdatePositionAssignment updates an assignment.
func (s *PartiesService) UpdatePositionAssignment(ctx context.Context, arg queries.UpdatePositionAssignmentParams) (queries.PartyPositionAssignment, error) {
	return s.queries.UpdatePositionAssignment(ctx, arg)
}

// VacatePositionAssignment vacates an active position assignment.
func (s *PartiesService) VacatePositionAssignment(ctx context.Context, id int64, partyID int16) (queries.PartyPositionAssignment, error) {
	return s.queries.VacatePositionAssignment(ctx, queries.VacatePositionAssignmentParams{
		ID:      id,
		PartyID: partyID,
	})
}

// ListChapterOfficials lists all position assignments for a given chapter.
func (s *PartiesService) ListChapterOfficials(ctx context.Context, partyID int16, chapterID int32, status *string) ([]queries.ListChapterOfficialsRow, error) {
	arg := queries.ListChapterOfficialsParams{
		PartyID:   partyID,
		ChapterID: chapterID,
	}
	if status != nil && *status != "" {
		arg.Status = pgtype.Text{String: *status, Valid: true}
	}
	return s.queries.ListChapterOfficials(ctx, arg)
}

// ListPartyOfficials lists officials across chapters with search and filters.
func (s *PartiesService) ListPartyOfficials(ctx context.Context, arg queries.ListPartyOfficialsParams) ([]queries.ListPartyOfficialsRow, error) {
	return s.queries.ListPartyOfficials(ctx, arg)
}

// ListMemberPositionAssignments lists positions held by a user in the party.
func (s *PartiesService) ListMemberPositionAssignments(ctx context.Context, partyID int16, userID int64) ([]queries.ListMemberPositionAssignmentsRow, error) {
	return s.queries.ListMemberPositionAssignments(ctx, queries.ListMemberPositionAssignmentsParams{
		PartyID: partyID,
		UserID:  userID,
	})
}
