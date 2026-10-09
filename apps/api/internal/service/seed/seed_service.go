package seedservice

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"strings"
	"time"

	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	authservice "free9ja/api/internal/service/auth"
	bodiesservice "free9ja/api/internal/service/bodies"
	partiesservice "free9ja/api/internal/service/parties"
	usersservice "free9ja/api/internal/service/users"
	"free9ja/api/internal/utils"
	"free9ja/api/internal/worker"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/sync/errgroup"
)

type SeedService struct {
	queries         *queries.Queries
	pool            *pgxpool.Pool
	rdb             *redis.Client
	taskDistributor worker.TaskDistributor
	authService     *authservice.AuthService
	bodiesService   *bodiesservice.BodiesService
	usersService    *usersservice.UsersService
	partiesService  *partiesservice.PartiesService
}

func NewSeedService(
	q *queries.Queries,
	pool *pgxpool.Pool,
	rdb *redis.Client,
	taskDistributor worker.TaskDistributor,
	authService *authservice.AuthService,
	bodiesService *bodiesservice.BodiesService,
	usersService *usersservice.UsersService,
	partiesService *partiesservice.PartiesService,
) *SeedService {
	return &SeedService{
		queries:         q,
		pool:            pool,
		rdb:             rdb,
		taskDistributor: taskDistributor,
		authService:     authService,
		bodiesService:   bodiesService,
		usersService:    usersService,
		partiesService:  partiesService,
	}
}

type SeedUserRequest struct {
	Num                int     `json:"num"`
	Email              string  `json:"email"`
	Avatar             string  `json:"avatar"`
	Phone              *string `json:"phone"`
	Username           *string `json:"username"`
	Password           string  `json:"password"`
	LastName           string  `json:"last_name"`
	FirstName          string  `json:"first_name"`
	MiddleName         *string `json:"middle_name"`
	Gender             string  `json:"gender"`
	DateOfBirth        string  `json:"date_of_birth"`
	CurrentCountry     int16   `json:"current_country"`
	CurrentState       int16   `json:"current_state"`
	CurrentLga         *int32  `json:"current_lga"`
	CurrentWard        *int32  `json:"current_ward"`
	CurrentCity        *int32  `json:"current_city"`
	PollingUnitID      *int32  `json:"polling_unit_id"`
	StateOfOrigin      *int16  `json:"state_of_origin"`
	PartyID            *int16  `json:"party_id"`
	AccountStatus      string  `json:"account_status"`
	IsVerified         bool    `json:"is_verified"`
	VerificationTypeID *int16  `json:"verification_type_id"`
	IsPolitician       bool    `json:"is_politician"`
}

// SeedUsers registers a batch of new users from a seed request.
// It handles password hashing, database insertion, generates fake IDs, caches user details in Redis,
// and optionally appends user verification badges (e.g., for politicians).
// SeedUsers registers a batch of new users from a seed request using high-throughput batching.
// It pre-computes password hashes, caches country data in-memory, executes chunked pgx.Batch transactions,
// populates secondary tables (more_info, verifications, phones, badges) in a pipelined batch,
// and bulk-updates Redis registration mappings.
func (s *SeedService) SeedUsers(ctx context.Context, users []SeedUserRequest) (string, error) {
	if len(users) == 0 {
		return "No users provided to seed", nil
	}

	// 1. Precompute bcrypt hashes for distinct passwords in the batch.
	passwordHashes := make(map[string]string)
	for i := range users {
		pwd := users[i].Password
		if _, exists := passwordHashes[pwd]; !exists {
			hashed, err := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
			if err != nil {
				return "", fmt.Errorf("failed to hash password for seed users: %w", err)
			}
			passwordHashes[pwd] = string(hashed)
		}
	}

	// 2. In-memory cache for country data to eliminate redundant DB/Redis round-trips during phone validation.
	countryCache := make(map[int16]queries.GetCountryByIDRow)

	// In-memory cache for party chapters across tiers (national, state, lga, ward)
	nationalChapters := make(map[int16]int32)
	stateChapters := make(map[string]int32)
	lgaChapters := make(map[string]int32)
	wardChapters := make(map[string]int32)

	chapRows, chapErr := s.pool.Query(ctx, `SELECT id, party_id, chapter_type, state_id, lga_id, ward_id FROM party_chapters`)
	if chapErr == nil {
		for chapRows.Next() {
			var cid int32
			var pid int16
			var cType string
			var sid *int16
			var lid *int32
			var wid *int32
			if err := chapRows.Scan(&cid, &pid, &cType, &sid, &lid, &wid); err == nil {
				switch cType {
				case "national":
					nationalChapters[pid] = cid
				case "state":
					if sid != nil {
						stateChapters[fmt.Sprintf("%d:%d", pid, *sid)] = cid
					}
				case "lga":
					if lid != nil {
						lgaChapters[fmt.Sprintf("%d:%d", pid, *lid)] = cid
					}
				case "ward":
					if wid != nil {
						wardChapters[fmt.Sprintf("%d:%d", pid, *wid)] = cid
					}
				}
			}
		}
		chapRows.Close()
	}

	// preparedUser holds validated and pre-parsed fields (DOB, normalized phone numbers)
	// paired with the raw request. This avoids re-parsing/re-validating across multiple batch
	// stages and ensures invalid data fails fast before database transactions are opened.
	type preparedUser struct {
		user           SeedUserRequest
		dob            time.Time
		formattedPhone string
		phoneCode      string
		rawPhoneInput  string
	}

	// 3. Process in chunks of 500 records per transaction
	const batchSize = 500
	totalInserted := 0
	for i := 0; i < len(users); i += batchSize {
		end := i + batchSize
		if end > len(users) {
			end = len(users)
		}
		chunkRaw := users[i:end]

		// Prepare user data for this chunk
		chunk := make([]preparedUser, 0, len(chunkRaw))
		for _, u := range chunkRaw {
			dob, err := time.Parse(time.DateOnly, u.DateOfBirth)
			if err != nil {
				return "", fmt.Errorf("invalid dob format for user %s: %w", u.Email, err)
			}

			var formattedPhone, rawPhoneInput, phoneCode string
			if u.Phone != nil && *u.Phone != "" {
				rawPhoneInput = *u.Phone
				c, exists := countryCache[u.CurrentCountry]
				if !exists {
					fetched, err := s.bodiesService.CheckCountry(ctx, u.CurrentCountry)
					if err != nil {
						return "", fmt.Errorf("failed to fetch country for user %s: %w", u.Email, err)
					}
					countryCache[u.CurrentCountry] = fetched
					c = fetched
				}
				phoneCode = c.Phonecode
				fp, err := utils.ValidatePhoneForCountry(rawPhoneInput, c.Iso2)
				if err != nil {
					return "", fmt.Errorf("invalid phone for user %s: %w", u.Email, err)
				}
				formattedPhone = fp
			}

			chunk = append(chunk, preparedUser{
				user:           u,
				dob:            dob,
				formattedPhone: formattedPhone,
				phoneCode:      phoneCode,
				rawPhoneInput:  rawPhoneInput,
			})
		}

		// Begin transaction for chunk
		tx, err := s.pool.Begin(ctx)
		if err != nil {
			return "", fmt.Errorf("failed to begin batch transaction: %w", err)
		}

		// Stage A: Primary batch - bulk insert into users table returning ID
		userBatch := &pgx.Batch{}
		for _, prepUser := range chunk {
			u := prepUser.user
			hashed := passwordHashes[u.Password]

			var usernameVal pgtype.Text
			if u.Username != nil {
				usernameVal = utils.PgTextFromString(strings.ToLower(strings.TrimSpace(*u.Username)))
			}
			middleNameVal := utils.PgTextFromPtr(u.MiddleName)
			phoneVal := utils.PgTextFromString(prepUser.formattedPhone)

			accountStatus := u.AccountStatus
			if accountStatus == "" {
				accountStatus = "active"
			}

			var partyIDVal pgtype.Int2
			if u.PartyID != nil && *u.PartyID > 0 {
				partyIDVal = utils.PgInt2FromPtrNullable(u.PartyID)
			}
			isVerifiedVal := u.IsVerified && u.VerificationTypeID != nil

			userBatch.Queue(`
				INSERT INTO users (
					email, avatar, phone, username, password_hash, last_name, first_name, middle_name,
					gender, date_of_birth, current_country, current_state, current_city, current_lga,
					current_ward, polling_unit_id,
					state_of_origin, account_status, party_id, is_politician, is_verified
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
				ON CONFLICT (email) DO NOTHING
				RETURNING id
			`,
				strings.ToLower(strings.TrimSpace(u.Email)),
				u.Avatar,
				phoneVal,
				usernameVal,
				hashed,
				u.LastName,
				u.FirstName,
				middleNameVal,
				u.Gender,
				prepUser.dob,
				u.CurrentCountry,
				u.CurrentState,
				u.CurrentCity,
				u.CurrentLga,
				u.CurrentWard,
				u.PollingUnitID,
				u.StateOfOrigin,
				accountStatus,
				partyIDVal,
				u.IsPolitician,
				isVerifiedVal,
			)
		}

		userBatchResults := tx.SendBatch(ctx, userBatch)
		type insertedUserMeta struct {
			id             int64
			fakeID         int64
			user           SeedUserRequest
			formattedPhone string
			phoneCode      string
			rawPhoneInput  string
		}
		var inserted []insertedUserMeta

		// Read back generated IDs from the primary batch, generate fake IDs,
		// and collect metadata for newly inserted users (skipping any existing email conflicts).
		for _, prepUser := range chunk {
			var newID int64
			err := userBatchResults.QueryRow().Scan(&newID)
			if err != nil {
				if err == pgx.ErrNoRows {
					// User already existed via email ON CONFLICT DO NOTHING, skip
					continue
				}
				userBatchResults.Close()
				_ = tx.Rollback(ctx)
				return "", fmt.Errorf("failed inserting user %s: %w", prepUser.user.Email, err)
			}
			fakeID := utils.GenerateFakeID(newID)
			inserted = append(inserted, insertedUserMeta{
				id:             newID,
				fakeID:         fakeID,
				user:           prepUser.user,
				formattedPhone: prepUser.formattedPhone,
				phoneCode:      prepUser.phoneCode,
				rawPhoneInput:  prepUser.rawPhoneInput,
			})
		}
		if err := userBatchResults.Close(); err != nil {
			_ = tx.Rollback(ctx)
			return "", fmt.Errorf("failed closing user batch: %w", err)
		}

		// Stage B: Secondary batch for related tables
		if len(inserted) > 0 {
			secBatch := &pgx.Batch{}
			for _, insertedUser := range inserted {
				// 1. Update fake_id
				secBatch.Queue("UPDATE users SET fake_id = $1 WHERE id = $2", insertedUser.fakeID, insertedUser.id)

				// 2. Insert phone number (if formattedPhone is present)
				if insertedUser.formattedPhone != "" {
					secBatch.Queue(`
						INSERT INTO users_phone_numbers (user_id, phone, phonecode, raw_input, on_whatsapp, is_default)
						VALUES ($1, $2, $3, $4, false, true)
						ON CONFLICT (phone) DO NOTHING
					`, insertedUser.id, insertedUser.formattedPhone, insertedUser.phoneCode, insertedUser.rawPhoneInput)
				}

				// 3. Custom verification badge (if requested)
				if insertedUser.user.IsVerified && insertedUser.user.VerificationTypeID != nil {
					secBatch.Queue(`
						INSERT INTO pages_verified (page_type, page_id, verification_type_id)
						VALUES ($1, $2, $3)
						ON CONFLICT (page_type, page_id, verification_type_id)
						DO UPDATE SET verified_at = CURRENT_TIMESTAMP
					`, db.PageTypeUser, insertedUser.id, *insertedUser.user.VerificationTypeID)
				}

				// 4. Politician badge (verification_type_id = 2)
				if insertedUser.user.IsPolitician {
					secBatch.Queue(`
						INSERT INTO pages_verified (page_type, page_id, verification_type_id)
						VALUES ($1, $2, 2)
						ON CONFLICT (page_type, page_id, verification_type_id)
						DO UPDATE SET verified_at = CURRENT_TIMESTAMP
					`, db.PageTypeUser, insertedUser.id)
				}

				// 5. Multi-tier Party Membership Enrollment down to Ward level
				if insertedUser.user.PartyID != nil && *insertedUser.user.PartyID > 0 {
					pID := *insertedUser.user.PartyID

					// 5a. National Chapter
					natID, exists := nationalChapters[pID]
					if !exists {
						var newNatID int32
						err := tx.QueryRow(ctx, `
							INSERT INTO party_chapters (party_id, chapter_type, country_id)
							VALUES ($1, 'national', 161)
							ON CONFLICT (party_id, country_id) WHERE chapter_type = 'national'
							DO UPDATE SET party_id = EXCLUDED.party_id
							RETURNING id
						`, pID).Scan(&newNatID)
						if err == nil {
							nationalChapters[pID] = newNatID
							natID = newNatID
						}
					}
					if natID > 0 {
						secBatch.Queue(`
							INSERT INTO party_membership (user_id, party_id, chapter_id, status)
							VALUES ($1, $2, $3, 'active')
							ON CONFLICT (user_id, party_id, chapter_id) DO NOTHING
						`, insertedUser.id, pID, natID)
					}

					// 5b. State Chapter
					if insertedUser.user.CurrentState > 0 {
						stKey := fmt.Sprintf("%d:%d", pID, insertedUser.user.CurrentState)
						stID, exists := stateChapters[stKey]
						if !exists {
							var newStID int32
							err := tx.QueryRow(ctx, `
								INSERT INTO party_chapters (party_id, chapter_type, state_id)
								VALUES ($1, 'state', $2)
								ON CONFLICT (party_id, state_id) WHERE chapter_type = 'state'
								DO UPDATE SET party_id = EXCLUDED.party_id
								RETURNING id
							`, pID, insertedUser.user.CurrentState).Scan(&newStID)
							if err == nil {
								stateChapters[stKey] = newStID
								stID = newStID
							}
						}
						if stID > 0 {
							secBatch.Queue(`
								INSERT INTO party_membership (user_id, party_id, chapter_id, status)
								VALUES ($1, $2, $3, 'active')
								ON CONFLICT (user_id, party_id, chapter_id) DO NOTHING
							`, insertedUser.id, pID, stID)
						}
					}

					// 5c. LGA Chapter
					if insertedUser.user.CurrentLga != nil && *insertedUser.user.CurrentLga > 0 {
						lgaKey := fmt.Sprintf("%d:%d", pID, *insertedUser.user.CurrentLga)
						lgaCID, exists := lgaChapters[lgaKey]
						if !exists {
							var newLgaCID int32
							err := tx.QueryRow(ctx, `
								INSERT INTO party_chapters (party_id, chapter_type, state_id, lga_id)
								SELECT $1, 'lga', l.state_id, l.id
								FROM lgas l WHERE l.id = $2
								ON CONFLICT (party_id, lga_id) WHERE chapter_type = 'lga'
								DO UPDATE SET party_id = EXCLUDED.party_id
								RETURNING id
							`, pID, *insertedUser.user.CurrentLga).Scan(&newLgaCID)
							if err == nil {
								lgaChapters[lgaKey] = newLgaCID
								lgaCID = newLgaCID
							}
						}
						if lgaCID > 0 {
							secBatch.Queue(`
								INSERT INTO party_membership (user_id, party_id, chapter_id, status)
								VALUES ($1, $2, $3, 'active')
								ON CONFLICT (user_id, party_id, chapter_id) DO NOTHING
							`, insertedUser.id, pID, lgaCID)
						}
					}

					// 5d. Ward Chapter
					if insertedUser.user.CurrentWard != nil && *insertedUser.user.CurrentWard > 0 {
						wardKey := fmt.Sprintf("%d:%d", pID, *insertedUser.user.CurrentWard)
						wardCID, exists := wardChapters[wardKey]
						if !exists {
							var newWardCID int32
							err := tx.QueryRow(ctx, `
								INSERT INTO party_chapters (party_id, chapter_type, state_id, lga_id, ward_id)
								SELECT $1, 'ward', w.state_id, w.lga_id, w.id
								FROM wards w WHERE w.id = $2
								ON CONFLICT (party_id, ward_id) WHERE chapter_type = 'ward'
								DO UPDATE SET party_id = EXCLUDED.party_id
								RETURNING id
							`, pID, *insertedUser.user.CurrentWard).Scan(&newWardCID)
							if err == nil {
								wardChapters[wardKey] = newWardCID
								wardCID = newWardCID
							}
						}
						if wardCID > 0 {
							secBatch.Queue(`
								INSERT INTO party_membership (user_id, party_id, chapter_id, status)
								VALUES ($1, $2, $3, 'active')
								ON CONFLICT (user_id, party_id, chapter_id) DO NOTHING
							`, insertedUser.id, pID, wardCID)
						}
					}
				}
			}

			// Send the secondary batch pipeline to Postgres
			secBatchResults := tx.SendBatch(ctx, secBatch)

			// Drain and check execution status for each queued statement
			for j := 0; j < secBatch.Len(); j++ {
				if _, err := secBatchResults.Exec(); err != nil {
					secBatchResults.Close()
					_ = tx.Rollback(ctx)
					return "", fmt.Errorf("failed executing secondary batch: %w", err)
				}
			}

			// Ensure the batch reader is closed and the connection pipeline is cleanly reset
			if err := secBatchResults.Close(); err != nil {
				_ = tx.Rollback(ctx)
				return "", fmt.Errorf("failed closing secondary batch: %w", err)
			}
		}

		// Commit transaction for this chunk of records
		if err := tx.Commit(ctx); err != nil {
			return "", fmt.Errorf("failed to commit batch transaction: %w", err)
		}

		totalInserted += len(inserted)
	}

	return fmt.Sprintf("Users seeded successfully (%d created)", totalInserted), nil
}

type PartyAdminsData struct {
	ID              int16   `json:"id"` // partyID
	PartyAdmin      []int64 `json:"party_admin"`
	SuperPartyAdmin []int64 `json:"super_party_admin"`
}

type SeedAdminsRequest struct {
	SuperAdmins []int64                      `json:"super_admins"`
	Admins      []int64                      `json:"admins"`
	Parties     []map[string]PartyAdminsData `json:"parties"`
}

// SeedAdmins assigns system-wide admin roles, as well as party admin and super party admin roles to existing users.
// For party roles, it first joins the user to the specified party.
// All role assignments are processed concurrently.
func (s *SeedService) SeedAdmins(ctx context.Context, req SeedAdminsRequest) (string, error) {
	eg, ctx := errgroup.WithContext(ctx)
	eg.SetLimit(25)

	// system admin who assigns
	systemAdminID := int64(1)

	// Process super admins
	for _, superAdminID := range req.SuperAdmins {
		eg.Go(func() error {
			// get the fake id for the user
			fakeIDData, err := s.queries.GetFakeIDByUserID(ctx, superAdminID)
			if err != nil {
				return fmt.Errorf("failed to fetch fake ID for super admin %d: %w", superAdminID, err)
			}
			fakeID := fakeIDData.Int64

			// assign super_admin role
			err = s.usersService.AssignUserRole(ctx, superAdminID, fakeID, "super_admin", systemAdminID)
			if err != nil {
				return fmt.Errorf("failed to assign super_admin role to user %d: %w", superAdminID, err)
			}
			fmt.Println("assigned super_admin to id", superAdminID)
			return nil
		})
	}

	// Process system admins
	for _, adminID := range req.Admins {
		eg.Go(func() error {
			// get the fake id for the user
			fakeIDData, err := s.queries.GetFakeIDByUserID(ctx, adminID)
			if err != nil {
				return fmt.Errorf("failed to fetch fake ID for user %d: %w", adminID, err)
			}
			fakeID := fakeIDData.Int64

			// assign admin role
			err = s.usersService.AssignUserRole(ctx, adminID, fakeID, "admin", systemAdminID)
			if err != nil {
				return fmt.Errorf("failed to assign admin role to user %d: %w", adminID, err)
			}
			fmt.Println("assigned admin to id", adminID)
			return nil
		})
	}

	// Process party admins
	for _, partyMap := range req.Parties {
		for _, partyData := range partyMap {
			partyID := partyData.ID

			// Process party_admin
			for _, pAdminID := range partyData.PartyAdmin {
				eg.Go(func() error {
					// get the fake id for the user
					fakeIDData, err := s.queries.GetFakeIDByUserID(ctx, pAdminID)
					if err != nil {
						return fmt.Errorf("failed to fetch fake ID for party admin %d: %w", pAdminID, err)
					}
					fakeID := fakeIDData.Int64

					// Check user details: if user is affiliated with a different party, leave it first
					user, err := s.usersService.GetUserByFakeID(ctx, fakeID)
					if err == nil && user.PartyID.Valid && user.PartyID.Int16 > 0 && user.PartyID.Int16 != partyID {
						_ = s.partiesService.LeaveParty(ctx, user.PartyID.Int16, pAdminID, fakeID)
					}

					// join party
					err = s.partiesService.JoinParty(ctx, partiesservice.JoinPartyParams{
						PartyID: partyID, ChapterType: "national", UserID: pAdminID, UserFID: fakeID,
					})
					if err != nil {
						return fmt.Errorf("failed to join party for user %d: %w", pAdminID, err)
					}

					// assign role
					err = s.usersService.AssignUserRole(ctx, pAdminID, fakeID, "party_admin", systemAdminID)
					if err != nil {
						return fmt.Errorf("failed to assign party_admin role to user %d: %w", pAdminID, err)
					}
					fmt.Println("assigned party_admin to id", pAdminID)
					return nil
				})
			}

			// Process super_party_admin
			for _, spAdminID := range partyData.SuperPartyAdmin {
				eg.Go(func() error {
					// get the fake id for the user
					fakeIDData, err := s.queries.GetFakeIDByUserID(ctx, spAdminID)
					if err != nil {
						return fmt.Errorf("failed to fetch fake ID for super party admin %d: %w", spAdminID, err)
					}
					fakeID := fakeIDData.Int64

					// Check user details: if user is affiliated with a different party, leave it first
					user, err := s.usersService.GetUserByFakeID(ctx, fakeID)
					if err == nil && user.PartyID.Valid && user.PartyID.Int16 > 0 && user.PartyID.Int16 != partyID {
						_ = s.partiesService.LeaveParty(ctx, user.PartyID.Int16, spAdminID, fakeID)
					}

					// join party
					err = s.partiesService.JoinParty(ctx, partiesservice.JoinPartyParams{
						PartyID: partyID, ChapterType: "national", UserID: spAdminID, UserFID: fakeID,
					})
					if err != nil {
						return fmt.Errorf("failed to join party for user %d: %w", spAdminID, err)
					}

					// assign super_party_admin role
					err = s.usersService.AssignUserRole(ctx, spAdminID, fakeID, "super_party_admin", systemAdminID)
					if err != nil {
						return fmt.Errorf("failed to assign super_party_admin role to user %d: %w", spAdminID, err)
					}
					fmt.Println("assigned super_party_admin to id", spAdminID)
					return nil
				})
			}
		}
	}

	// wait for all goroutines to finish
	if err := eg.Wait(); err != nil {
		return "", err
	}

	return "Admins seeded successfully", nil
}

type PartyVoteShare struct {
	PartyShortName string  `json:"party_short_name"`
	VoteShare      float64 `json:"vote_share"`
}

type SimulateElectionResultsRequest struct {
	Limit           int32            `json:"limit"`            // max PUs to populate (0 = all)
	MinVotesPerPU   int32            `json:"min_votes_per_pu"` // optional min votes (default 100)
	MaxVotesPerPU   int32            `json:"max_votes_per_pu"` // optional max votes (default 750)
	TriggerRealtime *bool            `json:"trigger_realtime"` // dispatch Asynq tasks (default true)
	RunFullRollup   bool             `json:"run_full_rollup"`  // immediately run sequential rollup queries (default false)
	PartyShares     []PartyVoteShare `json:"party_shares"`     // optional target national vote share per party
}

type SimulateResultsResponse struct {
	ElectionID            int32  `json:"election_id"`
	ElectionName          string `json:"election_name"`
	Scope                 string `json:"scope"`
	SimulatedPollingUnits int    `json:"simulated_polling_units"`
	PartiesCount          int    `json:"parties_count"`
	Message               string `json:"message"`
}

type candidateResultItem struct {
	PartyShortName string `json:"party_short_name"`
	VoteCount      int32  `json:"vote_count"`
}

// SimulateElectionResults creates mock consensus final results for all eligible polling units
// of an election using all active political parties and automatically triggers the cascading real-time rollups or full sequential reconciliation.
func (s *SeedService) SimulateElectionResults(ctx context.Context, electionID int32, req SimulateElectionResultsRequest) (*SimulateResultsResponse, error) {
	election, err := s.queries.GetElectionInstanceByID(ctx, electionID)
	if err != nil {
		return nil, fmt.Errorf("election %d not found: %w", electionID, err)
	}

	activeParties, err := s.queries.ListParties(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch active parties: %w", err)
	}
	if len(activeParties) == 0 {
		return nil, fmt.Errorf("no active political parties found in database")
	}

	var partyShortNames []string
	for _, p := range activeParties {
		if p.ShortName != "" {
			partyShortNames = append(partyShortNames, p.ShortName)
		}
	}

	limit := req.Limit
	if limit == 0 {
		limit = 1000 // Sensible default when omitted or 0 in Swagger UI JSON
	} else if limit < 0 {
		limit = 0 // 0 signals SQL query to query all eligible polling units
	}

	pus, err := s.queries.GetEligiblePollingUnitsForElection(ctx, queries.GetEligiblePollingUnitsForElectionParams{
		ID:      electionID,
		Column2: limit,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to query eligible polling units: %w", err)
	}
	if len(pus) == 0 {
		return nil, fmt.Errorf("no eligible polling units found for election scope '%s'", election.Scope)
	}

	minVotes := req.MinVotesPerPU
	if minVotes <= 0 {
		minVotes = 100
	}
	maxVotes := req.MaxVotesPerPU
	if maxVotes < minVotes {
		maxVotes = minVotes + 500
	}

	triggerRealtime := true
	if req.TriggerRealtime != nil {
		triggerRealtime = *req.TriggerRealtime
	}

	// ── Step 1: Resolve national target shares ──────────────────────────────
	// Normalize the caller-supplied party_shares into fractions that sum to 1.0.
	// Unspecified active parties share whatever fraction is left over equally.
	nationalShares := make(map[string]float64) // upper(shortName) → [0,1]
	if len(req.PartyShares) > 0 {
		hasLargeVal := false
		for _, s := range req.PartyShares {
			if s.VoteShare > 1.0 {
				hasLargeVal = true
				break
			}
		}

		specifiedMap := make(map[string]float64)
		var totalSpecified float64
		for _, s := range req.PartyShares {
			name := strings.TrimSpace(s.PartyShortName)
			if name == "" || s.VoteShare <= 0 {
				continue
			}
			val := s.VoteShare
			if hasLargeVal {
				val /= 100.0
			}
			specifiedMap[strings.ToUpper(name)] = val
			totalSpecified += val
		}

		var unspecified []string
		for _, name := range partyShortNames {
			if _, ok := specifiedMap[strings.ToUpper(name)]; !ok {
				unspecified = append(unspecified, name)
			}
		}

		remaining := 1.0 - totalSpecified
		if remaining > 0 && len(unspecified) > 0 {
			// Randomly distribute the remaining share among unspecified parties
			// using exponential random weights (Dirichlet-like). This ensures
			// some marginal parties get a bigger slice while others are tiny —
			// just like real elections where not all minor parties are equal.
			rAlloc := rand.New(rand.NewSource(int64(electionID) + 77777))
			rawWeights := make([]float64, len(unspecified))
			var totalRaw float64
			for i := range unspecified {
				// Exponential random variable: -ln(U) gives a distribution
				// whose normalized values follow a Dirichlet(1,...,1).
				u := rAlloc.Float64()
				if u < 1e-10 {
					u = 1e-10
				}
				rawWeights[i] = -math.Log(u)
				totalRaw += rawWeights[i]
			}
			for i, name := range unspecified {
				nationalShares[strings.ToUpper(name)] = remaining * (rawWeights[i] / totalRaw)
			}
			for name, val := range specifiedMap {
				nationalShares[name] = val
			}
		} else {
			// Specified shares exceed 100% — normalize proportionally
			var sumAll float64
			for _, val := range specifiedMap {
				sumAll += val
			}
			if sumAll > 0 {
				for name, val := range specifiedMap {
					nationalShares[name] = val / sumAll
				}
			}
			for _, name := range partyShortNames {
				if _, ok := nationalShares[strings.ToUpper(name)]; !ok {
					nationalShares[strings.ToUpper(name)] = 0.0
				}
			}
		}
	}
	useTargetShares := len(nationalShares) > 0

	// ── Step 2: Build state-level regional strength modifiers ────────────────
	// For each (party, state) pair we draw a log-normal multiplier so that
	// every party has clear stronghold states and weak states. A multiplier
	// of 2.0 means the party gets roughly twice its national share in that
	// state; 0.3 means it's crushed there. The modifiers are seeded
	// deterministically per (party, state) so repeated runs are consistent.
	//
	// Log-normal parameters (μ=0, σ=0.8) produce a distribution whose
	// median is 1.0, mean ≈ 1.38, and tail extends to ~4× — realistic for
	// Nigerian electoral geography where one party can dominate a zone.
	type statePartyKey struct {
		stateID  int32
		partyIdx int
	}
	regionalMod := make(map[statePartyKey]float64)
	if useTargetShares {
		const lnSigma = 0.85 // controls spread; higher = more extreme strongholds
		for _, pu := range pus {
			sid := pu.StateID
			for i, name := range partyShortNames {
				key := statePartyKey{stateID: sid, partyIdx: i}
				if _, exists := regionalMod[key]; !exists {
					// Deterministic seed: combine state and party index so every
					// run with the same inputs yields the same regional pattern.
					seed := int64(sid)*1000 + int64(i) + int64(electionID)*100000
					rState := rand.New(rand.NewSource(seed))
					// Box-Muller to get a standard normal, then scale
					u1, u2 := rState.Float64(), rState.Float64()
					if u1 < 1e-9 {
						u1 = 1e-9
					}
					z := math.Sqrt(-2*math.Log(u1)) * math.Cos(2*math.Pi*u2)
					mod := math.Exp(lnSigma * z) // log-normal, median=1
					if mod < 0.10 {
						mod = 0.10 // floor: party always gets at least a tiny slice
					}
					regionalMod[key] = mod
					_ = name // used via partyShortNames index
				}
			}
		}
	}

	eg, ctx := errgroup.WithContext(ctx)
	eg.SetLimit(30)

	for _, pu := range pus {
		pu := pu
		eg.Go(func() error {
			r := rand.New(rand.NewSource(time.Now().UnixNano() + int64(pu.ID)))
			votesCast := minVotes + r.Int31n(maxVotes-minVotes+1)
			rejectedVotes := r.Int31n(votesCast/20 + 1)
			validVotes := votesCast - rejectedVotes
			accreditedVoters := votesCast + r.Int31n(40) + 10

			// ── Step 3: Compute per-PU weights ──────────────────────────────
			// weight = national_share × state_regional_mod × PU_jitter
			// PU jitter is ±12% so local variation exists within a state but
			// the state-level modifier is what drives macro-geography.
			weights := make([]float64, len(partyShortNames))
			var sumWeights float64

			for i, shortName := range partyShortNames {
				if useTargetShares {
					nShare := nationalShares[strings.ToUpper(shortName)]
					if nShare > 0 {
						regKey := statePartyKey{stateID: pu.StateID, partyIdx: i}
						stateMod := regionalMod[regKey]         // geographic stronghold factor
						puJitter := 0.88 + (r.Float64() * 0.24) // ±12% local noise
						weights[i] = nShare * stateMod * puJitter * 1000.0
					} else {
						weights[i] = 0.0
					}
				} else {
					// No target shares — pure random baseline
					weights[i] = float64(r.Int31n(100) + 5)
				}
				sumWeights += weights[i]
			}

			candItems := make([]candidateResultItem, len(partyShortNames))
			var allocatedVotes int32
			maxPartyIdx := 0
			var maxPartyVotes int32 = -1

			for i, shortName := range partyShortNames {
				var v int32
				if sumWeights > 0 {
					v = int32(float64(validVotes) * weights[i] / sumWeights)
				}
				candItems[i] = candidateResultItem{
					PartyShortName: shortName,
					VoteCount:      v,
				}
				allocatedVotes += v
				if v > maxPartyVotes {
					maxPartyVotes = v
					maxPartyIdx = i
				}
			}
			if len(candItems) > 0 {
				candItems[maxPartyIdx].VoteCount += (validVotes - allocatedVotes)
			}

			candJSON, err := json.Marshal(candItems)
			if err != nil {
				return fmt.Errorf("failed to marshal candidate results: %w", err)
			}

			_, err = s.queries.UpsertPollingUnitFinalResult(ctx, queries.UpsertPollingUnitFinalResultParams{
				ElectionID:               election.ID,
				ElectionGroupID:          election.ElectionGroupID,
				PollingUnitID:            pu.ID,
				StateID:                  pgtype.Int2{Int16: int16(pu.StateID), Valid: true},
				SenatorialDistrictID:     pu.SenatorialDistrictID,
				FederalConstituencyID:    pu.FederalConstituencyID,
				StateConstituencyID:      pu.StateConstituencyID,
				LgaID:                    pgtype.Int4{Int32: pu.LgaID, Valid: true},
				WardID:                   pgtype.Int4{Int32: pu.WardID, Valid: true},
				PollingUnitResultID:      pgtype.Int8{Valid: false},
				AccreditedVoters:         accreditedVoters,
				VotesCast:                votesCast,
				ValidVotes:               validVotes,
				RejectedVotes:            rejectedVotes,
				CandidateResults:         candJSON,
				MatchingSubmissionsCount: 1,
				TotalSubmissionsCount:    1,
			})
			if err != nil {
				return fmt.Errorf("failed to upsert polling unit final result for PU %d: %w", pu.ID, err)
			}

			if triggerRealtime && s.taskDistributor != nil {
				_ = s.taskDistributor.DistributeTaskRollupSingleWard(ctx, &worker.RollupSingleWardPayload{
					ElectionID:            election.ID,
					WardID:                pu.WardID,
					LGAID:                 pu.LgaID,
					StateID:               int16(pu.StateID),
					StateConstituencyID:   pu.StateConstituencyID.Int32,
					FederalConstituencyID: pu.FederalConstituencyID.Int32,
					SenatorialDistrictID:  pu.SenatorialDistrictID.Int32,
				})
				if pu.StateConstituencyID.Valid && pu.StateConstituencyID.Int32 > 0 {
					_ = s.taskDistributor.DistributeTaskRollupSingleStateConstituency(ctx, &worker.RollupSingleStateConstituencyPayload{
						ElectionID:          election.ID,
						StateConstituencyID: pu.StateConstituencyID.Int32,
					})
				}
			}
			return nil
		})
	}

	if err := eg.Wait(); err != nil {
		return nil, err
	}

	if req.RunFullRollup {
		_ = s.queries.RollupWardFinalResults(ctx)
		_ = s.queries.RollupStateConstituencyFinalResults(ctx)
		_ = s.queries.RollupLGAFinalResults(ctx)
		_ = s.queries.RollupFederalConstituencyFinalResults(ctx)
		_ = s.queries.RollupSenatorialDistrictFinalResults(ctx)
		_ = s.queries.RollupStateFinalResults(ctx)
		_ = s.queries.RollupElectionFinalResults(ctx)
	}

	return &SimulateResultsResponse{
		ElectionID:            election.ID,
		ElectionName:          election.Name,
		Scope:                 election.Scope,
		SimulatedPollingUnits: len(pus),
		PartiesCount:          len(partyShortNames),
		Message:               fmt.Sprintf("Successfully simulated results for %d polling units across %d active parties in election '%s' (scope: %s)", len(pus), len(partyShortNames), election.Name, election.Scope),
	}, nil
}

// FlushRedis removes all application cache keys matching the defined Redis prefixes in db.AllRedisPrefixes.
// It safely scans keys in batches and deletes them using Redis pipelines for optimal performance without blocking the Redis server.
func (s *SeedService) FlushRedis(ctx context.Context) (string, error) {
	var totalDeleted int64

	// 1. Loop through every key prefix defined in db.AllRedisPrefixes (e.g. "user:info:", "register:email_otp:", "countries:all")
	for _, prefix := range db.AllRedisPrefixes {
		// 2. Build the matching pattern for Redis:
		// If the prefix ends with a colon (e.g. "user:info:"), add a wildcard "*" -> "user:info:*" to match all user keys.
		// If it's an exact key name (e.g. "countries:all"), match that exact key.
		pattern := prefix
		if strings.HasSuffix(prefix, ":") {
			pattern = prefix + "*"
		}

		var keys []string

		// 3. Use SCAN instead of KEYS:
		// Redis KEYS command blocks the entire Redis server until complete.
		// SCAN uses a non-blocking cursor, retrieving keys in chunks of 500 without locking Redis.
		iter := s.rdb.Scan(ctx, 0, pattern, 500).Iterator()

		for iter.Next(ctx) {
			keys = append(keys, iter.Val())

			// 4. Batch Deletion with Pipeline:
			// Once we accumulate 500 keys in memory, send a single batch (Pipeline) to Redis.
			// Pipeline queues up all DEL commands and sends them in 1 network round-trip instead of 500 separate network requests.
			if len(keys) >= 500 {
				pipe := s.rdb.Pipeline()
				for _, k := range keys {
					pipe.Del(ctx, k)
				}
				cmds, err := pipe.Exec(ctx)
				if err != nil && err != redis.Nil {
					return "", fmt.Errorf("failed to delete keys for pattern %s: %w", pattern, err)
				}
				totalDeleted += int64(len(cmds))
				keys = keys[:0] // reset slice for next batch while preserving allocated memory
			}
		}

		// Check if there was an error during scanning
		if err := iter.Err(); err != nil {
			return "", fmt.Errorf("failed scanning pattern %s: %w", pattern, err)
		}

		// 5. Delete any remaining leftover keys in the current prefix batch (e.g., if there were 42 keys left)
		if len(keys) > 0 {
			pipe := s.rdb.Pipeline()
			for _, k := range keys {
				pipe.Del(ctx, k)
			}
			cmds, err := pipe.Exec(ctx)
			if err != nil && err != redis.Nil {
				return "", fmt.Errorf("failed to delete remaining keys for pattern %s: %w", pattern, err)
			}
			totalDeleted += int64(len(cmds))
		}
	}

	return fmt.Sprintf("Redis cache cleared successfully (%d keys deleted)", totalDeleted), nil
}
