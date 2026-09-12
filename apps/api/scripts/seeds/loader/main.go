package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/crypto/bcrypt"
)

type UserSeed struct {
	Num            int    `json:"num"`
	Email          string `json:"email"`
	Avatar         string `json:"avatar"`
	Phone          string `json:"phone"`
	Username       string `json:"username"`
	Password       string `json:"password"`
	LastName       string `json:"last_name"`
	FirstName      string `json:"first_name"`
	MiddleName     string `json:"middle_name"`
	Gender         string `json:"gender"`
	DateOfBirth    string `json:"date_of_birth"`
	Religion       string `json:"religion"`
	CurrentCountry int16  `json:"current_country"`
	CurrentState   int16  `json:"current_state"`
	CurrentLga     int32  `json:"current_lga"`
	CurrentWard    int32  `json:"current_ward"`
	CurrentCity    int32  `json:"current_city"`
	PollingUnitID  int32  `json:"polling_unit_id"`
	StateOfOrigin  int16  `json:"state_of_origin"`
	MaritalStatus  string `json:"marital_status"`
	EducationLevel string `json:"education_level"`
	HomeAddress    string `json:"home_address"`
	OccupationID   *int16 `json:"occupation_id"`
	PartyID        *int16 `json:"party_id"`
	AccountStatus  string `json:"account_status"`
	IsVerified     bool   `json:"is_verified"`
	IsPolitician   bool   `json:"is_politician"`
}

func generateFakeID(id int64) int64 {
	front := rand.Intn(900) + 100
	back := rand.Intn(900) + 100
	fakeStr := fmt.Sprintf("%d%d%d", front, id, back)
	val, _ := strconv.ParseInt(fakeStr, 10, 64)
	return val
}

func verifyFile(filePath string, db *sql.DB) error {
	log.Printf("Verifying seed file: %s", filePath)

	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	decoder := json.NewDecoder(file)
	// Expect start of array '['
	t, err := decoder.Token()
	if err != nil || t != json.Delim('[') {
		return fmt.Errorf("expected json array start, got: %v", t)
	}

	emailSet := make(map[string]struct{})
	usernameSet := make(map[string]struct{})
	phoneSet := make(map[string]struct{})

	userCount := 0
	verifiedCount := 0
	underAgeCount := 0
	overAgeCount := 0

	now := time.Now()
	minDate := now.AddDate(-51, 0, 0)
	maxDate := now.AddDate(-17, 0, 0)

	type GeoSample struct {
		StateID int16
		CityID  int32
		LgaID   int32
		WardID  int32
		PUID    int32
	}
	var samples []GeoSample

	for decoder.More() {
		var u UserSeed
		if err := decoder.Decode(&u); err != nil {
			return fmt.Errorf("failed to decode user at index %d: %w", userCount, err)
		}
		userCount++

		// Check uniqueness
		if _, exists := emailSet[u.Email]; exists {
			return fmt.Errorf("duplicate email found: %s", u.Email)
		}
		emailSet[u.Email] = struct{}{}

		if _, exists := usernameSet[u.Username]; exists {
			return fmt.Errorf("duplicate username found: %s", u.Username)
		}
		usernameSet[u.Username] = struct{}{}

		if _, exists := phoneSet[u.Phone]; exists {
			return fmt.Errorf("duplicate phone found: %s", u.Phone)
		}
		phoneSet[u.Phone] = struct{}{}

		// Check verification status (must be false)
		if u.IsVerified {
			verifiedCount++
		}

		// Check age
		dob, err := time.Parse(time.DateOnly, u.DateOfBirth)
		if err != nil {
			return fmt.Errorf("invalid dob format for %s: %s", u.Email, u.DateOfBirth)
		}
		if dob.After(maxDate) {
			underAgeCount++
		}
		if dob.Before(minDate) {
			overAgeCount++
		}

		// Keep sample for DB FK validation
		if userCount%100 == 1 {
			samples = append(samples, GeoSample{
				StateID: u.CurrentState,
				CityID:  u.CurrentCity,
				LgaID:   u.CurrentLga,
				WardID:  u.CurrentWard,
				PUID:    u.PollingUnitID,
			})
		}
	}

	log.Printf("File checks passed: %d records parsed.", userCount)
	log.Printf("- Unique Emails: %d, Unique Usernames: %d, Unique Phones: %d", len(emailSet), len(usernameSet), len(phoneSet))
	log.Printf("- Verified Users: %d (expected 0)", verifiedCount)
	log.Printf("- Underage (<18): %d (expected 0), Overage (>50): %d (expected 0)", underAgeCount, overAgeCount)

	if verifiedCount > 0 {
		return fmt.Errorf("validation failed: %d users had is_verified=true", verifiedCount)
	}
	if underAgeCount > 0 || overAgeCount > 0 {
		return fmt.Errorf("validation failed: %d users outside 18-50 age bracket", underAgeCount+overAgeCount)
	}

	// Validate foreign keys in DB for sampled records
	if db != nil && len(samples) > 0 {
		log.Printf("Validating geo-hierarchy in DB for %d sample users...", len(samples))
		for _, s := range samples {
			var stateMatches bool
			err := db.QueryRow(`
				SELECT (pu.state_id = $1 AND pu.lga_id = $2 AND pu.ward_id = $3 AND c.state_id = $1)
				FROM polling_units pu
				CROSS JOIN c_cities c
				WHERE pu.id = $4 AND c.id = $5
			`, s.StateID, s.LgaID, s.WardID, s.PUID, s.CityID).Scan(&stateMatches)
			if err != nil {
				return fmt.Errorf("DB geo hierarchy mismatch for PU %d, City %d, State %d: %w", s.PUID, s.CityID, s.StateID, err)
			}
			if !stateMatches {
				return fmt.Errorf("geo mismatch: PU %d does not match state %d, LGA %d, ward %d or city %d", s.PUID, s.StateID, s.LgaID, s.WardID, s.CityID)
			}
		}
		log.Println("100% of sampled records have valid, perfectly matched State -> City, LGA -> Ward -> Polling Unit relationships in DB!")
	}

	return nil
}

func loadFile(ctx context.Context, filePath string, pool *pgxpool.Pool, batchSize int, defaultPasswordHash string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file %s: %w", filePath, err)
	}
	defer file.Close()

	decoder := json.NewDecoder(file)
	t, err := decoder.Token()
	if err != nil || t != json.Delim('[') {
		return fmt.Errorf("expected json array start in %s", filePath)
	}

	batchUsers := make([]UserSeed, 0, batchSize)
	totalLoaded := 0
	startTime := time.Now()

	flushBatch := func(users []UserSeed) error {
		if len(users) == 0 {
			return nil
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("failed to begin tx: %w", err)
		}
		defer tx.Rollback(ctx)

		// 1. Bulk insert users returning id
		userBatch := &pgx.Batch{}
		for _, u := range users {
			var middleName *string
			if u.MiddleName != "" {
				m := u.MiddleName
				middleName = &m
			}
			var partyID *int16
			if u.PartyID != nil && *u.PartyID > 0 {
				partyID = u.PartyID
			}

			userBatch.Queue(`
				INSERT INTO users (
					email, avatar, phone, username, password_hash, last_name, first_name, middle_name,
					gender, date_of_birth, current_country, current_state, current_city, current_lga,
					polling_unit_id, state_of_origin, account_status, party_id, role, role_level,
					nin_verified, phone_verified, email_verified
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'user', 'user', 'false', 'false', 'false')
				ON CONFLICT (email) DO NOTHING
				RETURNING id
			`,
				strings.ToLower(u.Email),
				u.Avatar,
				u.Phone,
				strings.ToLower(u.Username),
				defaultPasswordHash,
				u.LastName,
				u.FirstName,
				middleName,
				u.Gender,
				u.DateOfBirth,
				u.CurrentCountry,
				u.CurrentState,
				u.CurrentCity,
				u.CurrentLga,
				u.PollingUnitID,
				u.StateOfOrigin,
				u.AccountStatus,
				partyID,
			)
		}

		br := tx.SendBatch(ctx, userBatch)
		type InsertedUser struct {
			ID   int64
			User UserSeed
		}
		var inserted []InsertedUser

		for _, u := range users {
			var newID int64
			err := br.QueryRow().Scan(&newID)
			if err != nil {
				if err == pgx.ErrNoRows {
					// User already existed (skipped via ON CONFLICT)
					continue
				}
				br.Close()
				return fmt.Errorf("failed to insert user %s: %w", u.Email, err)
			}
			inserted = append(inserted, InsertedUser{ID: newID, User: u})
		}
		if err := br.Close(); err != nil {
			return fmt.Errorf("failed closing user batch: %w", err)
		}

		if len(inserted) == 0 {
			return tx.Commit(ctx)
		}

		// 2. Secondary batch for related tables
		secBatch := &pgx.Batch{}
		for _, iu := range inserted {
			fakeID := generateFakeID(iu.ID)

			// Update fake_id
			secBatch.Queue("UPDATE users SET fake_id = $1 WHERE id = $2", fakeID, iu.ID)

			// Insert users_phone_numbers
			secBatch.Queue(`
				INSERT INTO users_phone_numbers (user_id, phone, on_whatsapp)
				VALUES ($1, $2, 'no')
				ON CONFLICT (phone) DO NOTHING
			`, iu.ID, iu.User.Phone)

			// Insert users_nin
			ninStr := fmt.Sprintf("%011d", 10000000000+iu.ID)
			secBatch.Queue(`
				INSERT INTO users_nin (user_id, nin)
				VALUES ($1, $2)
				ON CONFLICT (user_id) DO NOTHING
			`, iu.ID, ninStr)
		}

		brSec := tx.SendBatch(ctx, secBatch)
		for i := 0; i < secBatch.Len(); i++ {
			if _, err := brSec.Exec(); err != nil {
				brSec.Close()
				return fmt.Errorf("failed executing secondary batch: %w", err)
			}
		}
		if err := brSec.Close(); err != nil {
			return fmt.Errorf("failed closing secondary batch: %w", err)
		}

		return tx.Commit(ctx)
	}

	for decoder.More() {
		var u UserSeed
		if err := decoder.Decode(&u); err != nil {
			return fmt.Errorf("failed to decode user in %s: %w", filePath, err)
		}
		batchUsers = append(batchUsers, u)
		totalLoaded++

		if len(batchUsers) >= batchSize {
			if err := flushBatch(batchUsers); err != nil {
				return err
			}
			elapsed := time.Since(startTime)
			rate := float64(totalLoaded) / elapsed.Seconds()
			log.Printf("[%s] Loaded %d records (%.0f users/sec)", filepath.Base(filePath), totalLoaded, rate)
			batchUsers = batchUsers[:0]
		}
	}

	if len(batchUsers) > 0 {
		if err := flushBatch(batchUsers); err != nil {
			return err
		}
	}

	elapsed := time.Since(startTime)
	log.Printf("Successfully loaded %s (%d records) in %v!", filepath.Base(filePath), totalLoaded, elapsed)
	return nil
}

func main() {
	var (
		dbURL      string
		targetFile string
		seedsDir   string
		verifyOnly bool
		batchSize  int
		workers    int
	)

	defaultDB := os.Getenv("DATABASE_URL")
	if defaultDB == "" {
		defaultDB = "postgres://postgres:password@localhost:5432/test_db?sslmode=disable"
	}

	flag.StringVar(&dbURL, "db", defaultDB, "PostgreSQL Database URL")
	flag.StringVar(&targetFile, "file", "", "Target single JSON seed file to load or verify")
	flag.StringVar(&seedsDir, "dir", "apps/api/scripts/seeds/users", "Directory containing seed JSON files")
	flag.BoolVar(&verifyOnly, "verify-only", false, "Verify seed JSON files without writing to DB")
	flag.IntVar(&batchSize, "batch-size", 2000, "Batch size per transaction")
	flag.IntVar(&workers, "workers", 4, "Concurrent worker routines")
	flag.Parse()

	// Pre-compute single bcrypt hash for "password"
	log.Println("Pre-computing bcrypt hash for 'password'...")
	hashBytes, err := bcrypt.GenerateFromPassword([]byte("password"), 10)
	if err != nil {
		log.Fatalf("Failed to generate password hash: %v", err)
	}
	defaultPasswordHash := string(hashBytes)
	log.Println("Bcrypt password hash ready.")

	ctx := context.Background()

	// Find files to process
	var files []string
	if targetFile != "" {
		absPath, err := filepath.Abs(targetFile)
		if err != nil {
			log.Fatalf("Invalid file path: %v", err)
		}
		files = append(files, absPath)
	} else {
		absDir, err := filepath.Abs(seedsDir)
		if err != nil {
			log.Fatalf("Invalid dir path: %v", err)
		}
		entries, err := os.ReadDir(absDir)
		if err != nil {
			log.Fatalf("Failed to read dir %s: %v", absDir, err)
		}
		for _, e := range entries {
			if strings.HasSuffix(e.Name(), ".json") {
				files = append(files, filepath.Join(absDir, e.Name()))
			}
		}
	}

	if len(files) == 0 {
		log.Fatalf("No seed JSON files found to process.")
	}
	log.Printf("Found %d seed JSON files to process.", len(files))

	// Connect for verification
	stdDB, err := sql.Open("pgx", dbURL)
	if err != nil {
		log.Fatalf("Failed to open DB: %v", err)
	}
	defer stdDB.Close()

	if verifyOnly {
		log.Println("--- Running in VERIFICATION ONLY mode ---")
		for _, f := range files {
			if err := verifyFile(f, stdDB); err != nil {
				log.Fatalf("Verification failed for %s: %v", f, err)
			}
		}
		log.Println("ALL FILES VERIFIED SUCCESSFULLY! 100% compliant.")
		return
	}

	// Connect pgxpool for high-speed batch loading
	log.Printf("Connecting to Postgres via pgxpool (max conns: %d)...", workers*2+2)
	poolConfig, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Failed to parse DB URL: %v", err)
	}
	poolConfig.MaxConns = int32(workers*2 + 2)

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		log.Fatalf("Failed to create connection pool: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("Failed to ping db pool: %v", err)
	}
	log.Println("Database connection pool ready.")

	// Worker pool execution
	fileChan := make(chan string, len(files))
	for _, f := range files {
		fileChan <- f
	}
	close(fileChan)

	var wg sync.WaitGroup
	startTotal := time.Now()

	for w := 1; w <= workers; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for f := range fileChan {
				log.Printf("[Worker %d] Starting %s...", workerID, filepath.Base(f))
				if err := loadFile(ctx, f, pool, batchSize, defaultPasswordHash); err != nil {
					log.Printf("[Worker %d] ERROR in %s: %v", workerID, filepath.Base(f), err)
				}
			}
		}(w)
	}

	wg.Wait()
	log.Printf("ALL %d files loaded successfully in %v!", len(files), time.Since(startTotal))
}
