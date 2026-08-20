package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"os"
	"path/filepath"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:password@localhost:5432/test_db?sslmode=disable"
	}

	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	// 1. Fetch valid state IDs
	stateRows, err := db.Query("SELECT id, country_id FROM c_states")
	if err != nil {
		log.Fatalf("Failed to query c_states: %v", err)
	}
	defer stateRows.Close()

	validStates := make(map[int]int) // state_id -> country_id

	for stateRows.Next() {
		var id, countryID int
		if err := stateRows.Scan(&id, &countryID); err == nil {
			validStates[id] = countryID
		}
	}

	// 2. Fetch valid LGA IDs
	lgaRows, err := db.Query("SELECT id, state_id FROM lgas")
	if err != nil {
		log.Fatalf("Failed to query lgas: %v", err)
	}
	defer lgaRows.Close()

	validLGAs := make(map[int]int) // lga_id -> state_id

	for lgaRows.Next() {
		var id, stateID int
		if err := lgaRows.Scan(&id, &stateID); err == nil {
			validLGAs[id] = stateID
		}
	}

	// 3. Fetch valid City IDs
	cityRows, err := db.Query("SELECT id, state_id, country_id FROM c_cities")
	if err != nil {
		log.Fatalf("Failed to query c_cities: %v", err)
	}
	defer cityRows.Close()

	validCities := make(map[int]int) // city_id -> state_id

	for cityRows.Next() {
		var id, stateID, countryID int
		if err := cityRows.Scan(&id, &stateID, &countryID); err == nil {
			validCities[id] = stateID
		}
	}

	// 4. Fetch valid Country IDs
	countryRows, err := db.Query("SELECT id FROM c_countries")
	if err != nil {
		log.Fatalf("Failed to query c_countries: %v", err)
	}
	defer countryRows.Close()

	validCountries := make(map[int]bool)
	for countryRows.Next() {
		var id int
		if err := countryRows.Scan(&id); err == nil {
			validCountries[id] = true
		}
	}

	// Inspect seed files
	seedFiles := []string{
		"1-users.json",
		"1.2-politicians.json",
		"1.3-celebrities.json",
		"1.4-10kusers.json",
		"1.5-admins.json",
		"1.6-superadmins.json",
		"seed_users.json",
	}

	baseDir, _ := os.Getwd()
	seedsDir := filepath.Join(baseDir, "scripts", "seeds")

	totalErrors := 0

	for _, fileName := range seedFiles {
		filePath := filepath.Join(seedsDir, fileName)
		data, err := os.ReadFile(filePath)
		if err != nil {
			log.Printf("Could not read file %s: %v", fileName, err)
			continue
		}

		var rawRecords []map[string]interface{}
		if err := json.Unmarshal(data, &rawRecords); err != nil {
			var singleRecord map[string]interface{}
			if err2 := json.Unmarshal(data, &singleRecord); err2 == nil {
				rawRecords = []map[string]interface{}{singleRecord}
			} else {
				log.Printf("Failed to parse JSON %s: %v", fileName, err)
				continue
			}
		}

		invalidStateCount := 0
		invalidLGACount := 0
		invalidCityCount := 0
		invalidStateOfOriginCount := 0
		invalidCountryCount := 0

		for _, rec := range rawRecords {
			// Check current_country
			if cc, ok := getInt(rec["current_country"]); ok {
				if !validCountries[cc] {
					invalidCountryCount++
				}
			}

			// Check current_state
			if cs, ok := getInt(rec["current_state"]); ok {
				if _, valid := validStates[cs]; !valid {
					invalidStateCount++
				}
			}

			// Check current_lga
			if cl, ok := getIntPtr(rec["current_lga"]); ok && cl != nil {
				if _, valid := validLGAs[*cl]; !valid {
					invalidLGACount++
				}
			}

			// Check current_city
			if cc, ok := getIntPtr(rec["current_city"]); ok && cc != nil {
				if _, valid := validCities[*cc]; !valid {
					invalidCityCount++
				}
			}

			// Check state_of_origin
			if so, ok := getIntPtr(rec["state_of_origin"]); ok && so != nil {
				if cID, valid := validStates[*so]; !valid || cID != 161 {
					invalidStateOfOriginCount++
				}
			}
		}

		fileErrors := invalidCountryCount + invalidStateCount + invalidLGACount + invalidCityCount + invalidStateOfOriginCount
		totalErrors += fileErrors

		log.Printf("File %s (%d records) audit: invalid country=%d, state=%d, lga=%d, city=%d, state_of_origin=%d [TOTAL ERRORS: %d]",
			fileName, len(rawRecords), invalidCountryCount, invalidStateCount, invalidLGACount, invalidCityCount, invalidStateOfOriginCount, fileErrors)
	}

	if totalErrors == 0 {
		log.Println("SUCCESS: ALL seed files passed FK validation with 0 errors!")
	} else {
		log.Printf("WARNING: Found %d total FK errors across seed files.", totalErrors)
	}
}

func getInt(val interface{}) (int, bool) {
	if val == nil {
		return 0, false
	}
	switch v := val.(type) {
	case float64:
		return int(v), true
	case int:
		return v, true
	default:
		return 0, false
	}
}

func getIntPtr(val interface{}) (*int, bool) {
	if val == nil {
		return nil, true
	}
	if i, ok := getInt(val); ok {
		return &i, true
	}
	return nil, false
}
