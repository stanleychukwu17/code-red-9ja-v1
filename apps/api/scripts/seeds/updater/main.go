package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"path/filepath"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/nyaruka/phonenumbers"
)

type UserRecord map[string]interface{}

type GeoData struct {
	// state_id -> []lga_id
	lgasByState map[int16][]int32
	// lga_id -> []ward_id
	wardsByLga map[int32][]int32
	// ward_id -> []pu_id
	pusByWard map[int32][]int32
	// state_id -> []city_id
	citiesByState map[int16][]int32
	// all states
	allStates []int16
}

func loadGeoData(db *sql.DB) (*GeoData, error) {
	log.Println("Loading geo data from database...")

	geo := &GeoData{
		lgasByState:   make(map[int16][]int32),
		wardsByLga:    make(map[int32][]int32),
		pusByWard:     make(map[int32][]int32),
		citiesByState: make(map[int16][]int32),
	}

	// 1. States (Nigeria = country_id 161)
	sRows, err := db.Query("SELECT id FROM c_states WHERE country_id = 161 ORDER BY id")
	if err != nil {
		return nil, fmt.Errorf("query states: %w", err)
	}
	defer sRows.Close()
	for sRows.Next() {
		var sid int16
		if err := sRows.Scan(&sid); err == nil {
			geo.allStates = append(geo.allStates, sid)
		}
	}
	sRows.Close()

	// 2. Cities
	cRows, err := db.Query("SELECT id, state_id FROM c_cities WHERE country_id = 161 ORDER BY id")
	if err != nil {
		return nil, fmt.Errorf("query cities: %w", err)
	}
	defer cRows.Close()
	for cRows.Next() {
		var cid int32
		var sid int16
		if err := cRows.Scan(&cid, &sid); err == nil {
			geo.citiesByState[sid] = append(geo.citiesByState[sid], cid)
		}
	}
	cRows.Close()

	// 3. LGAs
	lRows, err := db.Query("SELECT id, state_id FROM lgas ORDER BY id")
	if err != nil {
		return nil, fmt.Errorf("query lgas: %w", err)
	}
	defer lRows.Close()
	for lRows.Next() {
		var lid int32
		var sid int16
		if err := lRows.Scan(&lid, &sid); err == nil {
			geo.lgasByState[sid] = append(geo.lgasByState[sid], lid)
		}
	}
	lRows.Close()

	// 4. Wards
	wRows, err := db.Query("SELECT id, lga_id FROM wards ORDER BY id")
	if err != nil {
		return nil, fmt.Errorf("query wards: %w", err)
	}
	defer wRows.Close()
	for wRows.Next() {
		var wid, lid int32
		if err := wRows.Scan(&wid, &lid); err == nil {
			geo.wardsByLga[lid] = append(geo.wardsByLga[lid], wid)
		}
	}
	wRows.Close()

	// 5. Polling Units
	pRows, err := db.Query("SELECT id, ward_id FROM polling_units ORDER BY id")
	if err != nil {
		return nil, fmt.Errorf("query pus: %w", err)
	}
	defer pRows.Close()
	for pRows.Next() {
		var puid, wid int32
		if err := pRows.Scan(&puid, &wid); err == nil {
			geo.pusByWard[wid] = append(geo.pusByWard[wid], puid)
		}
	}
	pRows.Close()

	log.Printf("Loaded: %d states, %d cities across states, %d LGAs across states, %d Wards with mappings, %d Wards with PUs\n",
		len(geo.allStates), len(geo.citiesByState), len(geo.lgasByState), len(geo.wardsByLga), len(geo.pusByWard))

	return geo, nil
}

// pickParty assigns a party ID based on requested ratio:
// ADC (17): 35%, APC (1): 25%, NDC (7): 15%, PDP (10): 8%, Minor parties: 7%, Non-partisan: 10%
func pickParty(rng *rand.Rand, minorPartyIDs []int16) *int16 {
	roll := rng.Intn(100) // 0 to 99
	var pid int16
	switch {
	case roll < 35: // 35% ADC
		pid = 17
		return &pid
	case roll < 60: // 25% APC (35 to 59)
		pid = 1
		return &pid
	case roll < 75: // 15% NDC (60 to 74)
		pid = 7
		return &pid
	case roll < 83: // 8% PDP (75 to 82)
		pid = 10
		return &pid
	case roll < 90: // 7% Minor parties (83 to 89)
		if len(minorPartyIDs) > 0 {
			pid = minorPartyIDs[rng.Intn(len(minorPartyIDs))]
			return &pid
		}
		pid = 6 // LP
		return &pid
	default: // 10% Non-partisan (90 to 99)
		return nil
	}
}

func ensureGeoHierarchy(u UserRecord, geo *GeoData, rng *rand.Rand) {
	// Normalize country to 161 (Nigeria)
	u["current_country"] = 161

	// Validate/assign current_state
	var stateID int16
	if sVal, ok := u["current_state"]; ok && sVal != nil {
		if sNum, ok := sVal.(float64); ok && sNum >= 1 && sNum <= 37 {
			stateID = int16(sNum)
		}
	}
	if stateID == 0 {
		stateID = geo.allStates[rng.Intn(len(geo.allStates))]
		u["current_state"] = stateID
	}

	// Validate/assign current_city
	cities := geo.citiesByState[stateID]
	var cityID int32
	if cVal, ok := u["current_city"]; ok && cVal != nil {
		if cNum, ok := cVal.(float64); ok && cNum > 0 {
			cityID = int32(cNum)
		}
	}
	if cityID == 0 && len(cities) > 0 {
		cityID = cities[rng.Intn(len(cities))]
		u["current_city"] = cityID
	}

	// Validate/assign current_lga
	lgas := geo.lgasByState[stateID]
	var lgaID int32
	if lVal, ok := u["current_lga"]; ok && lVal != nil {
		if lNum, ok := lVal.(float64); ok && lNum > 0 {
			candLGA := int32(lNum)
			// check if candLGA belongs to this state
			for _, validLGA := range lgas {
				if validLGA == candLGA {
					lgaID = candLGA
					break
				}
			}
		}
	}
	if lgaID == 0 && len(lgas) > 0 {
		lgaID = lgas[rng.Intn(len(lgas))]
		u["current_lga"] = lgaID
	}

	// Assign current_ward
	wards := geo.wardsByLga[lgaID]
	var wardID int32
	if wVal, ok := u["current_ward"]; ok && wVal != nil {
		if wNum, ok := wVal.(float64); ok && wNum > 0 {
			candWard := int32(wNum)
			for _, validWard := range wards {
				if validWard == candWard {
					wardID = candWard
					break
				}
			}
		}
	}
	if wardID == 0 && len(wards) > 0 {
		wardID = wards[rng.Intn(len(wards))]
		u["current_ward"] = wardID
	}

	// Assign polling_unit_id
	pus := geo.pusByWard[wardID]
	var puID int32
	if pVal, ok := u["polling_unit_id"]; ok && pVal != nil {
		if pNum, ok := pVal.(float64); ok && pNum > 0 {
			candPU := int32(pNum)
			for _, validPU := range pus {
				if validPU == candPU {
					puID = candPU
					break
				}
			}
		}
	}
	if puID == 0 && len(pus) > 0 {
		puID = pus[rng.Intn(len(pus))]
		u["polling_unit_id"] = puID
	}

	// Also ensure state_of_origin is a valid Nigerian state
	if sooVal, ok := u["state_of_origin"]; !ok || sooVal == nil {
		u["state_of_origin"] = stateID
	} else if sooNum, ok := sooVal.(float64); !ok || sooNum < 1 || sooNum > 37 {
		u["state_of_origin"] = stateID
	}
}

var validPrefixes = []string{"0803", "0806", "0813", "0816", "0802", "0805", "0703", "0706", "0810", "0814", "0818", "0903"}
var phoneCounter = 1000000

func ensureValidPhone(u UserRecord, usedPhones map[string]bool, emailToPhone map[string]string, rng *rand.Rand) {
	email, _ := u["email"].(string)
	if email != "" && emailToPhone[email] != "" {
		u["phone"] = emailToPhone[email]
		return
	}

	if pVal, ok := u["phone"]; ok && pVal != nil {
		if pStr, ok := pVal.(string); ok && pStr != "" {
			num, err := phonenumbers.Parse(pStr, "NG")
			if err == nil && phonenumbers.IsValidNumber(num) {
				formatted := phonenumbers.Format(num, phonenumbers.E164)
				if !usedPhones[formatted] {
					usedPhones[formatted] = true
					if email != "" {
						emailToPhone[email] = pStr
					}
					return
				}
			}
		}
	}

	// Generate a unique, valid Nigerian phone number
	for {
		prefix := validPrefixes[rng.Intn(len(validPrefixes))]
		phoneCounter++
		candidate := fmt.Sprintf("%s%07d", prefix, phoneCounter%10000000)
		num, err := phonenumbers.Parse(candidate, "NG")
		if err == nil && phonenumbers.IsValidNumber(num) {
			formatted := phonenumbers.Format(num, phonenumbers.E164)
			if !usedPhones[formatted] {
				usedPhones[formatted] = true
				u["phone"] = candidate
				if email != "" {
					emailToPhone[email] = candidate
				}
				return
			}
		}
	}
}

func loadAdminParties(filePath string) map[int]int16 {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil
	}
	var req struct {
		Parties []map[string]struct {
			ID              int16   `json:"id"`
			PartyAdmin      []int64 `json:"party_admin"`
			SuperPartyAdmin []int64 `json:"super_party_admin"`
		} `json:"parties"`
	}
	if err := json.Unmarshal(data, &req); err != nil {
		return nil
	}
	res := make(map[int]int16)
	for _, pMap := range req.Parties {
		for _, pData := range pMap {
			for _, id := range pData.PartyAdmin {
				res[int(id)] = pData.ID
			}
			for _, id := range pData.SuperPartyAdmin {
				res[int(id)] = pData.ID
			}
		}
	}
	return res
}

func main() {
	defaultDB := os.Getenv("DATABASE_URL")
	if defaultDB == "" {
		defaultDB = "postgres://postgres:password@localhost:5432/free9ja_db?sslmode=disable"
	}

	db, err := sql.Open("pgx", defaultDB)
	if err != nil {
		log.Fatalf("Failed to open DB: %v", err)
	}
	defer db.Close()

	geo, err := loadGeoData(db)
	if err != nil {
		log.Fatalf("Failed to load geo data: %v", err)
	}

	// Minor party IDs (excluding ADC=17, APC=1, NDC=7, PDP=10)
	minorPartyIDs := []int16{2, 3, 4, 5, 6, 8, 9, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22}

	rng := rand.New(rand.NewSource(42))

	seedsDir := "scripts/seeds"
	if _, err := os.Stat(seedsDir); os.IsNotExist(err) {
		seedsDir = "apps/api/scripts/seeds"
	}

	usedPhones := make(map[string]bool)
	emailToPhone := make(map[string]string)
	adminParties := loadAdminParties(filepath.Join(seedsDir, "1.5-admins.json"))

	// 1. Process 1.2-politicians.json (highest priority, preserve phones & affiliations)
	processPoliticians(filepath.Join(seedsDir, "1.2-politicians.json"), geo, rng, usedPhones, emailToPhone)

	// 2. Process 1.3-celebrities.json
	processCelebrities(filepath.Join(seedsDir, "1.3-celebrities.json"), geo, rng, usedPhones, emailToPhone)

	// 3. Process 1-users.json
	processUsers(filepath.Join(seedsDir, "1-users.json"), geo, minorPartyIDs, rng, usedPhones, emailToPhone)

	// 4. Process seed_users.json
	if _, err := os.Stat(filepath.Join(seedsDir, "seed_users.json")); err == nil {
		processUsers(filepath.Join(seedsDir, "seed_users.json"), geo, minorPartyIDs, rng, usedPhones, emailToPhone)
	}

	// 5. Process 1.4-10kusers.json
	process10kUsers(filepath.Join(seedsDir, "1.4-10kusers.json"), geo, minorPartyIDs, rng, usedPhones, emailToPhone, adminParties)

	log.Println("All target seed files successfully updated!")
}

func process10kUsers(filePath string, geo *GeoData, minorPartyIDs []int16, rng *rand.Rand, usedPhones map[string]bool, emailToPhone map[string]string, adminParties map[int]int16) {
	log.Printf("Processing %s...", filepath.Base(filePath))
	data, err := os.ReadFile(filePath)
	if err != nil {
		log.Fatalf("Failed to read %s: %v", filePath, err)
	}

	var users []UserRecord
	if err := json.Unmarshal(data, &users); err != nil {
		log.Fatalf("Failed to unmarshal %s: %v", filePath, err)
	}

	partyCounts := make(map[string]int)

	for _, u := range users {
		// If user is designated as an admin in 1.5-admins.json, assign their respective party
		if numVal, ok := u["num"].(float64); ok {
			if targetPID, exists := adminParties[int(numVal)]; exists {
				u["party_id"] = targetPID
			}
		}

		// Keep existing party affiliation if already set, otherwise assign
		if pVal, ok := u["party_id"]; !ok || pVal == nil {
			p := pickParty(rng, minorPartyIDs)
			if p != nil {
				u["party_id"] = *p
				partyCounts[fmt.Sprintf("%d", *p)]++
			} else {
				u["party_id"] = nil
				partyCounts["null"]++
			}
		} else {
			partyCounts[fmt.Sprintf("%v", u["party_id"])]++
		}

		// Ensure valid LGA, Ward, PU, City hierarchy
		ensureGeoHierarchy(u, geo, rng)
		ensureValidPhone(u, usedPhones, emailToPhone, rng)
	}

	out, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal %s: %v", filePath, err)
	}

	if err := os.WriteFile(filePath, out, 0644); err != nil {
		log.Fatalf("Failed to write %s: %v", filePath, err)
	}

	log.Printf("Saved %s (%d records). Party distribution: %v\n", filepath.Base(filePath), len(users), partyCounts)
}

func processUsers(filePath string, geo *GeoData, minorPartyIDs []int16, rng *rand.Rand, usedPhones map[string]bool, emailToPhone map[string]string) {
	log.Printf("Processing %s...", filepath.Base(filePath))
	data, err := os.ReadFile(filePath)
	if err != nil {
		log.Fatalf("Failed to read %s: %v", filePath, err)
	}

	var users []UserRecord
	if err := json.Unmarshal(data, &users); err != nil {
		log.Fatalf("Failed to unmarshal %s: %v", filePath, err)
	}

	partyCounts := make(map[string]int)

	for _, u := range users {
		// Keep existing party affiliation if already set, otherwise assign
		if pVal, ok := u["party_id"]; !ok || pVal == nil {
			p := pickParty(rng, minorPartyIDs)
			if p != nil {
				u["party_id"] = *p
				partyCounts[fmt.Sprintf("%d", *p)]++
			} else {
				u["party_id"] = nil
				partyCounts["null"]++
			}
		}

		// Ensure valid LGA, Ward, PU, City hierarchy
		ensureGeoHierarchy(u, geo, rng)
		ensureValidPhone(u, usedPhones, emailToPhone, rng)
	}

	out, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal %s: %v", filePath, err)
	}

	if err := os.WriteFile(filePath, out, 0644); err != nil {
		log.Fatalf("Failed to write %s: %v", filePath, err)
	}

	log.Printf("Saved %s (%d records). Party distribution: %v\n", filepath.Base(filePath), len(users), partyCounts)
}

func processPoliticians(filePath string, geo *GeoData, rng *rand.Rand, usedPhones map[string]bool, emailToPhone map[string]string) {
	log.Printf("Processing %s...", filepath.Base(filePath))
	data, err := os.ReadFile(filePath)
	if err != nil {
		log.Fatalf("Failed to read %s: %v", filePath, err)
	}

	var users []UserRecord
	if err := json.Unmarshal(data, &users); err != nil {
		log.Fatalf("Failed to unmarshal %s: %v", filePath, err)
	}

	for _, u := range users {
		// Keep their existing party affiliation if already set, otherwise assign
		if pVal, ok := u["party_id"]; !ok || pVal == nil {
			p := pickParty(rng, []int16{6, 10, 2})
			if p != nil {
				u["party_id"] = *p
			} else {
				u["party_id"] = 17 // default to ADC if null
			}
		}

		// Ensure valid Ward and PU within their LGA
		ensureGeoHierarchy(u, geo, rng)
		ensureValidPhone(u, usedPhones, emailToPhone, rng)
	}

	out, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal %s: %v", filePath, err)
	}

	if err := os.WriteFile(filePath, out, 0644); err != nil {
		log.Fatalf("Failed to write %s: %v", filePath, err)
	}

	log.Printf("Saved %s (%d records)\n", filepath.Base(filePath), len(users))
}

func processCelebrities(filePath string, geo *GeoData, rng *rand.Rand, usedPhones map[string]bool, emailToPhone map[string]string) {
	log.Printf("Processing %s...", filepath.Base(filePath))
	data, err := os.ReadFile(filePath)
	if err != nil {
		log.Fatalf("Failed to read %s: %v", filePath, err)
	}

	var users []UserRecord
	if err := json.Unmarshal(data, &users); err != nil {
		log.Fatalf("Failed to unmarshal %s: %v", filePath, err)
	}

	for _, u := range users {
		// Keep their existing party affiliation if already set
		if pVal, ok := u["party_id"]; !ok || pVal == nil {
			p := pickParty(rng, []int16{6, 10, 2})
			if p != nil {
				u["party_id"] = *p
			}
		}

		// Ensure valid Ward and PU within their LGA
		ensureGeoHierarchy(u, geo, rng)
		ensureValidPhone(u, usedPhones, emailToPhone, rng)
	}

	out, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		log.Fatalf("Failed to marshal %s: %v", filePath, err)
	}

	if err := os.WriteFile(filePath, out, 0644); err != nil {
		log.Fatalf("Failed to write %s: %v", filePath, err)
	}

	log.Printf("Saved %s (%d records)\n", filepath.Base(filePath), len(users))
}
