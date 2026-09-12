package main

import (
	"bufio"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// UserSeed matches the structure expected by the Free9ja API and database
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

type State struct {
	ID   int16
	Name string
}

type City struct {
	ID      int32
	Name    string
	StateID int16
}

type PollingUnit struct {
	ID      int32
	Name    string
	Code    string
	PUCode  string
	WardID  int32
	LgaID   int32
	StateID int16
}

type Party struct {
	ID        int16
	ShortName string
}

var maleFirstNames = []string{
	"Babatunde", "Oluwaseun", "Adebayo", "Femi", "Olumide", "Ayodeji", "Tunde", "Dapo",
	"Gbenga", "Kayode", "Tayo", "Kehinde", "Taiwo", "Kunle", "Segun", "Rotimi",
	"Folorunsho", "Oladipo", "Sunday", "Victor", "Emmanuel", "Samuel", "David", "Michael",
	"Chukwuma", "Chinedu", "Emeka", "Obinna", "Ifeanyi", "Nnamdi", "Chibuike", "Uche",
	"Kalu", "Onyeka", "Somtochukwu", "Tochukwu", "Ikechukwu", "Nonso", "Ebuka", "Chinonso",
	"Chidi", "Chisom", "Pascal", "Kingsley", "Ibrahim", "Musa", "Usman", "Abubakar",
	"Bello", "Garba", "Aminu", "Aliyu", "Sani", "Shehu", "Umar", "Balarabe",
	"Danjuma", "Yakubu", "Haruna", "Kabir", "Lawal", "Mansur", "Bashir", "Suleiman",
	"Efe", "Oghenekaro", "Osaro", "Osagie", "Tare", "Ebikeme", "Akpan", "Bassey",
	"Edet", "Okon", "Idongesit", "Terrence", "Terver", "Dozie", "Ochuko", "Godspower",
}

var femaleFirstNames = []string{
	"Folashade", "Yetunde", "Ronke", "Bisola", "Titilayo", "Funke", "Bukola", "Eniola",
	"Simisola", "Oluwakemi", "Morenike", "Bolanle", "Toyin", "Damilola", "Kemi", "Bisi",
	"Yewande", "Blessing", "Grace", "Mercy", "Faith", "Joy", "Ngozi", "Chioma",
	"Amaka", "Chiamaka", "Adaora", "Ifeoma", "Nkechi", "Uchenna", "Nneka", "Ogechi",
	"Chinyere", "Oluchi", "Chinwe", "Somadina", "Precious", "Chidinma", "Amarachi", "Vivian",
	"Cynthia", "Fatima", "Aisha", "Amina", "Maryam", "Zainab", "Halima", "Khadija",
	"Hauwa", "Bilkisu", "Hadiza", "Asmau", "Zubaida", "Safiya", "Ruqayya", "Nafisa",
	"Jamila", "Umma", "Rakiya", "Ejiro", "Orobosa", "Isoken", "Itohan", "Tari",
	"Eniye", "Idara", "Imaobong", "Aniefiok", "Emem", "Utibe", "Mfon", "Ekaette",
	"Nsikak", "Loveth", "Peace", "Patience",
}

var lastNames = []string{
	"Balogun", "Adeleke", "Adeyemi", "Babalola", "Ojo", "Awolowo", "Tinubu", "Akintola",
	"Ogunlesi", "Fasoranti", "Soyinka", "Oshodi", "Dosunmu", "Fashola", "Bankole", "Ajayi",
	"Alabi", "Afolayan", "Oladipo", "Sowore", "Sanwoolu", "Olanipekun", "Okafor", "Okeke",
	"Okonkwo", "Nnamani", "Nwosu", "Eze", "Obi", "Umeh", "Ojukwu", "Ekwueme",
	"Chukwu", "Anyaoku", "Okonjo", "Achebe", "Soludo", "Ihedioha", "Otti", "Nwachukwu",
	"Opara", "Igwe", "Onyema", "Dangote", "Rabiu", "Buhari", "Danfodio", "Ribadu",
	"Yaradua", "Sanusi", "Ganduje", "Tambuwal", "Kwankwaso", "Shettima", "Zulum", "Gwarzo",
	"Shagari", "Bello", "Marwa", "Jega", "Dasuki", "Bawa", "Gambari", "Clark",
	"Ibori", "Okowa", "Tompolo", "Asari", "Briggs", "Douglas", "Akpabio", "Attah",
	"Donald", "Duke", "Imoke", "Ayade", "Mark", "Akume", "Suswam", "Ortom",
}

var maritalStatuses = []string{"single", "married", "single", "married", "divorced", "widowed"}
var educationLevels = []string{"none", "primary", "secondary", "polytechnic", "bachelors", "bachelors", "masters", "phd"}
var streetNames = []string{"Independent", "Broad", "Commercial", "Airport", "Market", "Marina", "Victoria", "Ahmadu Bello", "Nnamdi Azikiwe", "Awolowo", "Herbert Macaulay", "Yakubu Gowon", "Bourdillon", "Adeola Odeku", "Ring", "Hospital", "Station", "Mission", "Unity", "Peace"}

func main() {
	var (
		dbURL      string
		outDir     string
		totalUsers int
		chunkSize  int
		isTest     bool
		startPart  int
	)

	defaultDB := os.Getenv("DATABASE_URL")
	if defaultDB == "" {
		defaultDB = "postgres://postgres:password@localhost:5432/test_db?sslmode=disable"
	}

	flag.StringVar(&dbURL, "db", defaultDB, "Postgres Database URL")
	flag.StringVar(&outDir, "out", "apps/api/scripts/seeds/users", "Output directory for JSON seed files")
	flag.IntVar(&totalUsers, "total", 25000000, "Total number of users to generate")
	flag.IntVar(&chunkSize, "chunk", 200000, "Number of users per JSON file")
	flag.BoolVar(&isTest, "test", false, "Run quick test generation (default: 2000 users)")
	flag.IntVar(&startPart, "start-part", 1, "Starting partition number")
	flag.Parse()

	if isTest {
		totalUsers = 2000
		chunkSize = 2000
		log.Printf("Running in TEST mode: generating %d users in 1 file", totalUsers)
	}

	// Resolve output directory
	absOutDir, err := filepath.Abs(outDir)
	if err != nil {
		log.Fatalf("Failed to resolve output dir: %v", err)
	}
	if err := os.MkdirAll(absOutDir, 0755); err != nil {
		log.Fatalf("Failed to create output dir %s: %v", absOutDir, err)
	}

	log.Printf("Connecting to database at %s...", dbURL)
	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		log.Fatalf("Failed to open db: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping db: %v", err)
	}
	log.Println("Database connection established.")

	// 1. Fetch Nigerian States (country_id = 161)
	log.Println("Loading Nigerian states from c_states...")
	rows, err := db.Query("SELECT id, name FROM c_states WHERE country_id = 161 ORDER BY id")
	if err != nil {
		log.Fatalf("Failed to query states: %v", err)
	}
	defer rows.Close()

	var states []State
	for rows.Next() {
		var s State
		if err := rows.Scan(&s.ID, &s.Name); err != nil {
			log.Fatalf("Failed to scan state: %v", err)
		}
		states = append(states, s)
	}
	rows.Close()
	log.Printf("Loaded %d Nigerian states.", len(states))

	// 2. Fetch Cities
	log.Println("Loading cities from c_cities...")
	cityRows, err := db.Query("SELECT id, name, state_id FROM c_cities WHERE country_id = 161 ORDER BY id")
	if err != nil {
		log.Fatalf("Failed to query cities: %v", err)
	}
	defer cityRows.Close()

	citiesByState := make(map[int16][]City)
	for cityRows.Next() {
		var c City
		if err := cityRows.Scan(&c.ID, &c.Name, &c.StateID); err != nil {
			log.Fatalf("Failed to scan city: %v", err)
		}
		citiesByState[c.StateID] = append(citiesByState[c.StateID], c)
	}
	cityRows.Close()
	log.Printf("Loaded cities across %d states.", len(citiesByState))

	// 3. Fetch Polling Units with LGA & Ward mappings
	log.Println("Loading polling units with ward & LGA mappings (this may take a few seconds)...")
	puRows, err := db.Query(`
		SELECT id, ward_id, lga_id, state_id 
		FROM polling_units 
		ORDER BY state_id, lga_id, ward_id, id
	`)
	if err != nil {
		log.Fatalf("Failed to query polling units: %v", err)
	}
	defer puRows.Close()

	pusByState := make(map[int16][]PollingUnit)
	totalPUs := 0
	for puRows.Next() {
		var pu PollingUnit
		if err := puRows.Scan(&pu.ID, &pu.WardID, &pu.LgaID, &pu.StateID); err != nil {
			log.Fatalf("Failed to scan polling unit: %v", err)
		}
		pusByState[pu.StateID] = append(pusByState[pu.StateID], pu)
		totalPUs++
	}
	puRows.Close()
	log.Printf("Loaded %d polling units across %d states.", totalPUs, len(pusByState))

	// 4. Fetch Political Parties
	log.Println("Loading political parties...")
	partyRows, err := db.Query("SELECT id, short_name FROM parties ORDER BY id")
	if err != nil {
		log.Fatalf("Failed to query parties: %v", err)
	}
	defer partyRows.Close()

	var parties []Party
	var otherPartyIDs []int16
	for partyRows.Next() {
		var p Party
		if err := partyRows.Scan(&p.ID, &p.ShortName); err != nil {
			log.Fatalf("Failed to scan party: %v", err)
		}
		parties = append(parties, p)
		// Track other parties (exclude top 4: APC=1, NDC=7, PDP=10, ADC=17)
		if p.ID != 1 && p.ID != 7 && p.ID != 10 && p.ID != 17 {
			otherPartyIDs = append(otherPartyIDs, p.ID)
		}
	}
	partyRows.Close()
	log.Printf("Loaded %d parties (%d other minor parties).", len(parties), len(otherPartyIDs))

	// Calculate state quotas for the target totalUsers
	// Full distribution (25M baseline):
	// Lagos (id: 24): 4,000,000 (16%)
	// Abuja FCT (id: 37): 3,500,000 (14%)
	// Kano (id: 19): 2,500,000 (10%)
	// Kaduna (id: 18): 1,750,000 (7%)
	// Rivers (id: 32): 1,750,000 (7%)
	// Remaining 32 States: 11,500,000 (~359,375 each) (46%)
	scale := float64(totalUsers) / 25000000.0
	stateQuotas := make(map[int16]int)
	allocatedUsers := 0

	topStates := map[int16]int{
		24: int(4000000.0 * scale), // Lagos
		37: int(3500000.0 * scale), // Abuja FCT
		19: int(2500000.0 * scale), // Kano
		18: int(1750000.0 * scale), // Kaduna
		32: int(1750000.0 * scale), // Rivers
	}

	for sID, count := range topStates {
		stateQuotas[sID] = count
		allocatedUsers += count
	}

	var remainingStates []int16
	for _, s := range states {
		if _, isTop := topStates[s.ID]; !isTop {
			remainingStates = append(remainingStates, s.ID)
		}
	}

	remainingUsers := totalUsers - allocatedUsers
	if len(remainingStates) > 0 {
		perState := remainingUsers / len(remainingStates)
		remainder := remainingUsers % len(remainingStates)
		for i, sID := range remainingStates {
			q := perState
			if i < remainder {
				q++
			}
			stateQuotas[sID] = q
			allocatedUsers += q
		}
	}

	log.Printf("State allocation complete. Total allocated: %d across %d states.", allocatedUsers, len(stateQuotas))

	// Pre-create flattened state assignment array for sequential user assignment
	log.Println("Building state scheduling queue...")
	stateQueue := make([]int16, 0, totalUsers)
	stateCounters := make(map[int16]int)
	for sID, count := range stateQuotas {
		stateCounters[sID] = count
	}

	for len(stateQueue) < totalUsers {
		added := false
		for _, s := range states {
			if stateCounters[s.ID] > 0 {
				stateQueue = append(stateQueue, s.ID)
				stateCounters[s.ID]--
				added = true
			}
		}
		if !added {
			break
		}
	}

	// Pre-calculate party targets scaled to totalUsers
	// ADC: 35% (8.75M / 25M)
	// APC: 22% (5.5M / 25M)
	// NDC: 10% (2.5M / 25M)
	// PDP: 5% (1.25M / 25M)
	// Minor parties: 3% (750k / 25M)
	// Non-partisan (nil): 25% (6.25M / 25M)
	adcCount := int(8750000.0 * scale)
	apcCount := int(5500000.0 * scale)
	ndcCount := int(2500000.0 * scale)
	pdpCount := int(1250000.0 * scale)
	minorCount := int(750000.0 * scale)

	adcID := int16(17)
	apcID := int16(1)
	ndcID := int16(7)
	pdpID := int16(10)

	// Round-robin counters for each state's polling units and cities
	puIndexByState := make(map[int16]int)
	cityIndexByState := make(map[int16]int)

	// Start generation
	numFiles := (totalUsers + chunkSize - 1) / chunkSize
	log.Printf("Generating %d users into %d files (%d per chunk)...", totalUsers, numFiles, chunkSize)

	rng := rand.New(rand.NewSource(42))
	startTime := time.Now()

	userSeq := 0
	for fileIdx := startPart; fileIdx < startPart+numFiles; fileIdx++ {
		fileName := fmt.Sprintf("users_part_%03d.json", fileIdx)
		filePath := filepath.Join(absOutDir, fileName)

		f, err := os.Create(filePath)
		if err != nil {
			log.Fatalf("Failed to create file %s: %v", filePath, err)
		}

		// Use an 8MB buffer for ultra-fast sequential disk writes
		bufWriter := bufio.NewWriterSize(f, 8*1024*1024)
		bufWriter.WriteString("[\n")

		usersInThisFile := chunkSize
		if userSeq+usersInThisFile > totalUsers {
			usersInThisFile = totalUsers - userSeq
		}

		for i := 0; i < usersInThisFile; i++ {
			userSeq++
			currIdx := userSeq - 1
			stateID := stateQueue[currIdx]

			// Pick Polling Unit round-robin for this state
			pus := pusByState[stateID]
			pu := pus[puIndexByState[stateID]%len(pus)]
			puIndexByState[stateID]++

			// Pick City round-robin for this state
			cities := citiesByState[stateID]
			cityID := int32(0)
			if len(cities) > 0 {
				cityID = cities[cityIndexByState[stateID]%len(cities)].ID
				cityIndexByState[stateID]++
			}

			// Determine gender and realistic name
			isMale := rng.Intn(2) == 0
			var firstName string
			if isMale {
				firstName = maleFirstNames[rng.Intn(len(maleFirstNames))]
			} else {
				firstName = femaleFirstNames[rng.Intn(len(femaleFirstNames))]
			}
			lastName := lastNames[rng.Intn(len(lastNames))]
			middleName := ""
			if rng.Intn(3) == 0 {
				if isMale {
					middleName = maleFirstNames[rng.Intn(len(maleFirstNames))]
				} else {
					middleName = femaleFirstNames[rng.Intn(len(femaleFirstNames))]
				}
			}

			// Generate DOB strictly between 18 and 50 years old (1976 to 2008)
			minAgeDays := 18 * 365
			maxAgeDays := 50 * 365
			randomDays := minAgeDays + rng.Intn(maxAgeDays-minAgeDays)
			dob := time.Now().AddDate(0, 0, -randomDays).Format(time.DateOnly)

			// Determine Religion based on State (Northern states heavier Islam, Southern heavier Christianity)
			religion := "christianity"
			isNorthern := stateID == 19 || stateID == 18 || stateID == 20 || stateID == 33 || stateID == 35 || stateID == 36 || stateID == 8
			if isNorthern {
				if rng.Intn(100) < 85 {
					religion = "islam"
				}
			} else {
				if rng.Intn(100) < 18 {
					religion = "islam"
				} else if rng.Intn(100) < 3 {
					religion = "traditional"
				}
			}

			// Determine Party ID based on quotas
			var partyID *int16
			if currIdx < adcCount {
				partyID = &adcID
			} else if currIdx < adcCount+apcCount {
				partyID = &apcID
			} else if currIdx < adcCount+apcCount+ndcCount {
				partyID = &ndcID
			} else if currIdx < adcCount+apcCount+ndcCount+pdpCount {
				partyID = &pdpID
			} else if currIdx < adcCount+apcCount+ndcCount+pdpCount+minorCount {
				if len(otherPartyIDs) > 0 {
					pID := otherPartyIDs[rng.Intn(len(otherPartyIDs))]
					partyID = &pID
				}
			} else {
				partyID = nil // Non-Partisan
			}

			street := streetNames[rng.Intn(len(streetNames))]
			homeAddr := fmt.Sprintf("%d %s Street", 1+rng.Intn(350), street)

			user := UserSeed{
				Num:            userSeq,
				Email:          fmt.Sprintf("%s.%s.%d@mail.ng", strings.ToLower(firstName), strings.ToLower(lastName), 10000000+userSeq),
				Avatar:         fmt.Sprintf("https://ui-avatars.com/api/?name=%s+%s&background=random&u=%d", firstName, lastName, userSeq),
				Phone:          fmt.Sprintf("+234802%08d", userSeq),
				Username:       fmt.Sprintf("%s_%s_%d", strings.ToLower(firstName), strings.ToLower(lastName), 10000000+userSeq),
				Password:       "password",
				LastName:       lastName,
				FirstName:      firstName,
				MiddleName:     middleName,
				Gender:         map[bool]string{true: "male", false: "female"}[isMale],
				DateOfBirth:    dob,
				Religion:       religion,
				CurrentCountry: 161,
				CurrentState:   stateID,
				CurrentLga:     pu.LgaID,
				CurrentWard:    pu.WardID,
				CurrentCity:    cityID,
				PollingUnitID:  pu.ID,
				StateOfOrigin:  stateID,
				MaritalStatus:  maritalStatuses[rng.Intn(len(maritalStatuses))],
				EducationLevel: educationLevels[rng.Intn(len(educationLevels))],
				HomeAddress:    homeAddr,
				OccupationID:   nil,
				PartyID:        partyID,
				AccountStatus:  "active",
				IsVerified:     false,
				IsPolitician:   false,
			}

			userJSON, err := json.Marshal(user)
			if err != nil {
				log.Fatalf("Failed to marshal user %d: %v", userSeq, err)
			}

			bufWriter.WriteString("  ")
			bufWriter.Write(userJSON)
			if i < usersInThisFile-1 {
				bufWriter.WriteString(",\n")
			} else {
				bufWriter.WriteString("\n")
			}
		}

		bufWriter.WriteString("]\n")
		bufWriter.Flush()
		f.Close()

		elapsed := time.Since(startTime)
		rate := float64(userSeq) / elapsed.Seconds()
		log.Printf("Written %s (%d/%d users, %.0f users/sec)", fileName, userSeq, totalUsers, rate)
	}

	totalElapsed := time.Since(startTime)
	log.Printf("All %d users generated successfully across %d files in %v!", totalUsers, numFiles, totalElapsed)
}
