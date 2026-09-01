package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func escapeSQL(val string) string {
	return strings.ReplaceAll(val, "'", "''")
}

func sqlVal(val interface{}) string {
	if val == nil {
		return "NULL"
	}
	switch v := val.(type) {
	case string:
		return fmt.Sprintf("'%s'", escapeSQL(v))
	case []byte:
		return fmt.Sprintf("'%s'", escapeSQL(string(v)))
	case int, int8, int16, int32, int64:
		return fmt.Sprintf("%d", v)
	case float32:
		return strconv.FormatFloat(float64(v), 'f', -1, 32)
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case bool:
		if v {
			return "TRUE"
		}
		return "FALSE"
	default:
		return fmt.Sprintf("'%s'", escapeSQL(fmt.Sprintf("%v", v)))
	}
}

func buildBatchInsert(header string, values []string, onConflict string, batchSize int) string {
	if len(values) == 0 {
		return ""
	}

	var sb strings.Builder
	total := len(values)

	for i := 0; i < total; i += batchSize {
		end := i + batchSize
		if end > total {
			end = total
		}

		batchValues := values[i:end]
		sb.WriteString(header)
		sb.WriteString(" VALUES\n")
		for j, val := range batchValues {
			sb.WriteString(val)
			if j < len(batchValues)-1 {
				sb.WriteString(",\n")
			} else {
				sb.WriteString("\n")
			}
		}
		sb.WriteString(onConflict)
		sb.WriteString("\n\n")
	}

	return strings.TrimSpace(sb.String())
}

func updateMigrationFile(filePath, seedSQL string) error {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read %s: %w", filePath, err)
	}

	// Normalize CRLF to LF
	strContent := strings.ReplaceAll(string(content), "\r\n", "\n")

	// Clean up any previously generated seed section
	startMarker := "-- SEED DATA START"
	endMarker := "-- SEED DATA END"

	if startIdx := strings.Index(strContent, startMarker); startIdx != -1 {
		lineStart := strings.LastIndex(strContent[:startIdx], "\n")
		if lineStart == -1 {
			lineStart = 0
		}
		if endIdx := strings.Index(strContent[startIdx:], endMarker); endIdx != -1 {
			actualEndIdx := startIdx + endIdx + len(endMarker)
			for actualEndIdx < len(strContent) && (strContent[actualEndIdx] == '\n' || strContent[actualEndIdx] == '\r' || strContent[actualEndIdx] == ' ' || strContent[actualEndIdx] == ';') {
				actualEndIdx++
			}
			strContent = strings.TrimRight(strContent[:lineStart], "\n") + "\n\n" + strings.TrimLeft(strContent[actualEndIdx:], "\n")
		}
	}

	downMarker := "-- +goose Down"
	downIdx := strings.Index(strContent, downMarker)
	if downIdx == -1 {
		return fmt.Errorf("could not find '-- +goose Down' in %s", filePath)
	}

	if seedSQL == "" {
		log.Printf("No seed SQL generated for %s (0 records)", filePath)
		return nil
	}

	formattedSeed := fmt.Sprintf("\n\n-- SEED DATA START\n%s\n-- SEED DATA END\n\n", seedSQL)
	newContent := strings.TrimRight(strContent[:downIdx], "\n") + formattedSeed + strContent[downIdx:]

	if err := os.WriteFile(filePath, []byte(newContent), 0644); err != nil {
		return fmt.Errorf("failed to write %s: %w", filePath, err)
	}

	log.Printf("Successfully updated %s", filePath)
	return nil
}

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

	baseDir, err := os.Getwd()
	if err != nil {
		log.Fatalf("Failed to get current directory: %v", err)
	}

	migrationsDir := filepath.Join(baseDir, "db", "migrations")
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		migrationsDir = filepath.Join(baseDir, "apps", "api", "db", "migrations")
	}
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		log.Fatalf("Could not locate db/migrations directory starting from %s", baseDir)
	}

	// 1. Senatorial Districts
	generateSenatorialDistricts(db, filepath.Join(migrationsDir, "20260606100616_senatorial_districts.sql"))

	// 2. Federal Constituencies
	generateFederalConstituencies(db, filepath.Join(migrationsDir, "20260606101932_federal_constituencies.sql"))

	// 3. LGAs
	generateLGAs(db, filepath.Join(migrationsDir, "20260606103546_lgas.sql"))

	// 4. State Constituencies
	generateStateConstituencies(db, filepath.Join(migrationsDir, "20260606103635_state_constituencies.sql"))

	// 5. Wards
	generateWards(db, filepath.Join(migrationsDir, "20260606104125_wards.sql"))

	// 6. Polling Units
	generatePollingUnits(db, filepath.Join(migrationsDir, "20260606105854_polling_units.sql"))
}

func generateSenatorialDistricts(db *sql.DB, filePath string) {
	rows, err := db.Query(`
		SELECT id, name, code, description, coalition_center, state_id, state_name, status 
		FROM senatorial_districts 
		ORDER BY id ASC
	`)
	if err != nil {
		log.Printf("Error querying senatorial_districts: %v", err)
		return
	}
	defer rows.Close()

	var values []string

	for rows.Next() {
		var id, stateID int
		var name, stateName string
		var code, description, coalitionCenter, status sql.NullString

		if err := rows.Scan(&id, &name, &code, &description, &coalitionCenter, &stateID, &stateName, &status); err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}

		cCode := interface{}(nil)
		if code.Valid {
			cCode = code.String
		}
		cDesc := interface{}(nil)
		if description.Valid {
			cDesc = description.String
		}
		cCoal := interface{}(nil)
		if coalitionCenter.Valid {
			cCoal = coalitionCenter.String
		}
		cStatus := "active"
		if status.Valid {
			cStatus = status.String
		}

		rowTuple := fmt.Sprintf(
			"(%d, %s, %s, %s, %s, %d, %s, %s)",
			id, sqlVal(name), sqlVal(cCode), sqlVal(cDesc), sqlVal(cCoal), stateID, sqlVal(stateName), sqlVal(cStatus),
		)
		values = append(values, rowTuple)
	}

	header := "INSERT INTO senatorial_districts (id, name, code, description, coalition_center, state_id, state_name, status)"
	onConflict := "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, description = EXCLUDED.description, coalition_center = EXCLUDED.coalition_center, state_id = EXCLUDED.state_id, state_name = EXCLUDED.state_name, status = EXCLUDED.status;"

	sqlResult := buildBatchInsert(header, values, onConflict, 1000)

	log.Printf("Generated %d senatorial districts seeds", len(values))
	if err := updateMigrationFile(filePath, sqlResult); err != nil {
		log.Printf("Failed to update senatorial districts migration: %v", err)
	}
}

func generateFederalConstituencies(db *sql.DB, filePath string) {
	rows, err := db.Query(`
		SELECT id, name, code, state_id, state_name, senatorial_district_id, senatorial_district_name, status 
		FROM federal_constituencies 
		ORDER BY id ASC
	`)
	if err != nil {
		log.Printf("Error querying federal_constituencies: %v", err)
		return
	}
	defer rows.Close()

	var values []string

	for rows.Next() {
		var id, stateID int
		var name, stateName string
		var code, sdName, status sql.NullString
		var sdID sql.NullInt64

		if err := rows.Scan(&id, &name, &code, &stateID, &stateName, &sdID, &sdName, &status); err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}

		cCode := interface{}(nil)
		if code.Valid {
			cCode = code.String
		}
		cSdID := interface{}(nil)
		if sdID.Valid {
			cSdID = sdID.Int64
		}
		cSdName := interface{}(nil)
		if sdName.Valid {
			cSdName = sdName.String
		}
		cStatus := "active"
		if status.Valid {
			cStatus = status.String
		}

		rowTuple := fmt.Sprintf(
			"(%d, %s, %s, %d, %s, %s, %s, %s)",
			id, sqlVal(name), sqlVal(cCode), stateID, sqlVal(stateName), sqlVal(cSdID), sqlVal(cSdName), sqlVal(cStatus),
		)
		values = append(values, rowTuple)
	}

	header := "INSERT INTO federal_constituencies (id, name, code, state_id, state_name, senatorial_district_id, senatorial_district_name, status)"
	onConflict := "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, state_id = EXCLUDED.state_id, state_name = EXCLUDED.state_name, senatorial_district_id = EXCLUDED.senatorial_district_id, senatorial_district_name = EXCLUDED.senatorial_district_name, status = EXCLUDED.status;"

	sqlResult := buildBatchInsert(header, values, onConflict, 1000)

	log.Printf("Generated %d federal constituencies seeds", len(values))
	if err := updateMigrationFile(filePath, sqlResult); err != nil {
		log.Printf("Failed to update federal constituencies migration: %v", err)
	}
}

func generateLGAs(db *sql.DB, filePath string) {
	rows, err := db.Query(`
		SELECT id, name, code, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name, status 
		FROM lgas 
		ORDER BY id ASC
	`)
	if err != nil {
		log.Printf("Error querying lgas: %v", err)
		return
	}
	defer rows.Close()

	var values []string

	for rows.Next() {
		var id, stateID int
		var name, code, stateName string
		var sdName, fcName, status sql.NullString
		var sdID, fcID sql.NullInt64

		if err := rows.Scan(&id, &name, &code, &stateID, &stateName, &sdID, &sdName, &fcID, &fcName, &status); err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}

		cSdID := interface{}(nil)
		if sdID.Valid {
			cSdID = sdID.Int64
		}
		cSdName := interface{}(nil)
		if sdName.Valid {
			cSdName = sdName.String
		}
		cFcID := interface{}(nil)
		if fcID.Valid {
			cFcID = fcID.Int64
		}
		cFcName := interface{}(nil)
		if fcName.Valid {
			cFcName = fcName.String
		}
		cStatus := "active"
		if status.Valid {
			cStatus = status.String
		}

		rowTuple := fmt.Sprintf(
			"(%d, %s, %s, %d, %s, %s, %s, %s, %s, %s)",
			id, sqlVal(name), sqlVal(code), stateID, sqlVal(stateName), sqlVal(cSdID), sqlVal(cSdName), sqlVal(cFcID), sqlVal(cFcName), sqlVal(cStatus),
		)
		values = append(values, rowTuple)
	}

	header := "INSERT INTO lgas (id, name, code, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name, status)"
	onConflict := "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, state_id = EXCLUDED.state_id, state_name = EXCLUDED.state_name, senatorial_district_id = EXCLUDED.senatorial_district_id, senatorial_district_name = EXCLUDED.senatorial_district_name, federal_constituency_id = EXCLUDED.federal_constituency_id, federal_constituency_name = EXCLUDED.federal_constituency_name, status = EXCLUDED.status;"

	sqlResult := buildBatchInsert(header, values, onConflict, 1000)

	log.Printf("Generated %d lgas seeds", len(values))
	if err := updateMigrationFile(filePath, sqlResult); err != nil {
		log.Printf("Failed to update lgas migration: %v", err)
	}
}

func generateStateConstituencies(db *sql.DB, filePath string) {
	rows, err := db.Query(`
		SELECT id, name, code, lga_id, lga_name, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name, status 
		FROM state_constituencies 
		ORDER BY id ASC
	`)
	if err != nil {
		log.Printf("Error querying state_constituencies: %v", err)
		return
	}
	defer rows.Close()

	var values []string

	for rows.Next() {
		var id, lgaID, stateID int
		var name, lgaName, stateName string
		var code, sdName, fcName, status sql.NullString
		var sdID, fcID sql.NullInt64

		if err := rows.Scan(&id, &name, &code, &lgaID, &lgaName, &stateID, &stateName, &sdID, &sdName, &fcID, &fcName, &status); err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}

		cCode := interface{}(nil)
		if code.Valid {
			cCode = code.String
		}
		cSdID := interface{}(nil)
		if sdID.Valid {
			cSdID = sdID.Int64
		}
		cSdName := interface{}(nil)
		if sdName.Valid {
			cSdName = sdName.String
		}
		cFcID := interface{}(nil)
		if fcID.Valid {
			cFcID = fcID.Int64
		}
		cFcName := interface{}(nil)
		if fcName.Valid {
			cFcName = fcName.String
		}
		cStatus := "active"
		if status.Valid {
			cStatus = status.String
		}

		rowTuple := fmt.Sprintf(
			"(%d, %s, %s, %d, %s, %d, %s, %s, %s, %s, %s, %s)",
			id, sqlVal(name), sqlVal(cCode), lgaID, sqlVal(lgaName), stateID, sqlVal(stateName), sqlVal(cSdID), sqlVal(cSdName), sqlVal(cFcID), sqlVal(cFcName), sqlVal(cStatus),
		)
		values = append(values, rowTuple)
	}

	header := "INSERT INTO state_constituencies (id, name, code, lga_id, lga_name, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name, status)"
	onConflict := "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, lga_id = EXCLUDED.lga_id, lga_name = EXCLUDED.lga_name, state_id = EXCLUDED.state_id, state_name = EXCLUDED.state_name, senatorial_district_id = EXCLUDED.senatorial_district_id, senatorial_district_name = EXCLUDED.senatorial_district_name, federal_constituency_id = EXCLUDED.federal_constituency_id, federal_constituency_name = EXCLUDED.federal_constituency_name, status = EXCLUDED.status;"

	sqlResult := buildBatchInsert(header, values, onConflict, 1000)

	log.Printf("Generated %d state constituencies seeds", len(values))
	if err := updateMigrationFile(filePath, sqlResult); err != nil {
		log.Printf("Failed to update state constituencies migration: %v", err)
	}
}

func generateWards(db *sql.DB, filePath string) {
	rows, err := db.Query(`
		SELECT id, name, code, lga_id, lga_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name, state_constituency_id, state_constituency_name, state_id, state_name, status, mongo_id 
		FROM wards 
		ORDER BY id ASC
	`)
	if err != nil {
		log.Printf("Error querying wards: %v", err)
		return
	}
	defer rows.Close()

	var values []string

	for rows.Next() {
		var id, lgaID, stateID int
		var name, code, lgaName, stateName string
		var sdName, fcName, scName, status, mongoID sql.NullString
		var sdID, fcID, scID sql.NullInt64

		if err := rows.Scan(&id, &name, &code, &lgaID, &lgaName, &sdID, &sdName, &fcID, &fcName, &scID, &scName, &stateID, &stateName, &status, &mongoID); err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}

		cSdID := interface{}(nil)
		if sdID.Valid {
			cSdID = sdID.Int64
		}
		cSdName := interface{}(nil)
		if sdName.Valid {
			cSdName = sdName.String
		}
		cFcID := interface{}(nil)
		if fcID.Valid {
			cFcID = fcID.Int64
		}
		cFcName := interface{}(nil)
		if fcName.Valid {
			cFcName = fcName.String
		}
		cScID := interface{}(nil)
		if scID.Valid {
			cScID = scID.Int64
		}
		cScName := interface{}(nil)
		if scName.Valid {
			cScName = scName.String
		}
		cStatus := "active"
		if status.Valid {
			cStatus = status.String
		}
		cMongoID := interface{}(nil)
		if mongoID.Valid {
			cMongoID = mongoID.String
		}

		rowTuple := fmt.Sprintf(
			"(%d, %s, %s, %d, %s, %s, %s, %s, %s, %s, %s, %d, %s, %s, %s)",
			id, sqlVal(name), sqlVal(code), lgaID, sqlVal(lgaName), sqlVal(cSdID), sqlVal(cSdName), sqlVal(cFcID), sqlVal(cFcName), sqlVal(cScID), sqlVal(cScName), stateID, sqlVal(stateName), sqlVal(cStatus), sqlVal(cMongoID),
		)
		values = append(values, rowTuple)
	}

	header := "INSERT INTO wards (id, name, code, lga_id, lga_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name, state_constituency_id, state_constituency_name, state_id, state_name, status, mongo_id)"
	onConflict := "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, lga_id = EXCLUDED.lga_id, lga_name = EXCLUDED.lga_name, senatorial_district_id = EXCLUDED.senatorial_district_id, senatorial_district_name = EXCLUDED.senatorial_district_name, federal_constituency_id = EXCLUDED.federal_constituency_id, federal_constituency_name = EXCLUDED.federal_constituency_name, state_constituency_id = EXCLUDED.state_constituency_id, state_constituency_name = EXCLUDED.state_constituency_name, state_id = EXCLUDED.state_id, state_name = EXCLUDED.state_name, status = EXCLUDED.status, mongo_id = EXCLUDED.mongo_id;"

	sqlResult := buildBatchInsert(header, values, onConflict, 1000)

	log.Printf("Generated %d wards seeds", len(values))
	if err := updateMigrationFile(filePath, sqlResult); err != nil {
		log.Printf("Failed to update wards migration: %v", err)
	}
}

func generatePollingUnits(db *sql.DB, filePath string) {
	rows, err := db.Query(`
		SELECT id, name, code, pu_code, registration_area_id, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name, state_constituency_id, state_constituency_name, lga_id, lga_name, ward_id, ward_name, latitude, longitude, precise_location, formatted_address, google_place_id, status 
		FROM polling_units 
		ORDER BY id ASC
	`)
	if err != nil {
		log.Printf("Error querying polling_units: %v", err)
		return
	}
	defer rows.Close()

	var values []string

	for rows.Next() {
		var id, stateID, lgaID, wardID int
		var name, stateName, lgaName, wardName string
		var code, puCode, sdName, fcName, scName, preciseLoc, formattedAddr, googlePlaceID, status sql.NullString
		var regAreaID, sdID, fcID, scID sql.NullInt64
		var lat, long sql.NullFloat64

		if err := rows.Scan(&id, &name, &code, &puCode, &regAreaID, &stateID, &stateName, &sdID, &sdName, &fcID, &fcName, &scID, &scName, &lgaID, &lgaName, &wardID, &wardName, &lat, &long, &preciseLoc, &formattedAddr, &googlePlaceID, &status); err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}

		cCode := interface{}(nil)
		if code.Valid {
			cCode = code.String
		}
		cPuCode := interface{}(nil)
		if puCode.Valid {
			cPuCode = puCode.String
		}
		cRegAreaID := interface{}(nil)
		if regAreaID.Valid {
			cRegAreaID = regAreaID.Int64
		}
		cSdID := interface{}(nil)
		if sdID.Valid {
			cSdID = sdID.Int64
		}
		cSdName := interface{}(nil)
		if sdName.Valid {
			cSdName = sdName.String
		}
		cFcID := interface{}(nil)
		if fcID.Valid {
			cFcID = fcID.Int64
		}
		cFcName := interface{}(nil)
		if fcName.Valid {
			cFcName = fcName.String
		}
		cScID := interface{}(nil)
		if scID.Valid {
			cScID = scID.Int64
		}
		cScName := interface{}(nil)
		if scName.Valid {
			cScName = scName.String
		}
		cLat := interface{}(nil)
		if lat.Valid {
			cLat = lat.Float64
		}
		cLong := interface{}(nil)
		if long.Valid {
			cLong = long.Float64
		}
		cPreciseLoc := interface{}(nil)
		if preciseLoc.Valid {
			cPreciseLoc = preciseLoc.String
		}
		cFormattedAddr := interface{}(nil)
		if formattedAddr.Valid {
			cFormattedAddr = formattedAddr.String
		}
		cGooglePlaceID := interface{}(nil)
		if googlePlaceID.Valid {
			cGooglePlaceID = googlePlaceID.String
		}
		cStatus := "active"
		if status.Valid {
			cStatus = status.String
		}

		rowTuple := fmt.Sprintf(
			"(%d, %s, %s, %s, %s, %d, %s, %s, %s, %s, %s, %s, %s, %d, %s, %d, %s, %s, %s, %s, %s, %s, %s)",
			id, sqlVal(name), sqlVal(cCode), sqlVal(cPuCode), sqlVal(cRegAreaID), stateID, sqlVal(stateName), sqlVal(cSdID), sqlVal(cSdName), sqlVal(cFcID), sqlVal(cFcName), sqlVal(cScID), sqlVal(cScName), lgaID, sqlVal(lgaName), wardID, sqlVal(wardName), sqlVal(cLat), sqlVal(cLong), sqlVal(cPreciseLoc), sqlVal(cFormattedAddr), sqlVal(cGooglePlaceID), sqlVal(cStatus),
		)
		values = append(values, rowTuple)
	}

	header := "INSERT INTO polling_units (id, name, code, pu_code, registration_area_id, state_id, state_name, senatorial_district_id, senatorial_district_name, federal_constituency_id, federal_constituency_name, state_constituency_id, state_constituency_name, lga_id, lga_name, ward_id, ward_name, latitude, longitude, precise_location, formatted_address, google_place_id, status)"
	onConflict := "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, pu_code = EXCLUDED.pu_code, registration_area_id = EXCLUDED.registration_area_id, state_id = EXCLUDED.state_id, state_name = EXCLUDED.state_name, senatorial_district_id = EXCLUDED.senatorial_district_id, senatorial_district_name = EXCLUDED.senatorial_district_name, federal_constituency_id = EXCLUDED.federal_constituency_id, federal_constituency_name = EXCLUDED.federal_constituency_name, state_constituency_id = EXCLUDED.state_constituency_id, state_constituency_name = EXCLUDED.state_constituency_name, lga_id = EXCLUDED.lga_id, lga_name = EXCLUDED.lga_name, ward_id = EXCLUDED.ward_id, ward_name = EXCLUDED.ward_name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, precise_location = EXCLUDED.precise_location, formatted_address = EXCLUDED.formatted_address, google_place_id = EXCLUDED.google_place_id, status = EXCLUDED.status;"

	sqlResult := buildBatchInsert(header, values, onConflict, 1000)

	log.Printf("Generated %d polling units seeds", len(values))
	if err := updateMigrationFile(filePath, sqlResult); err != nil {
		log.Printf("Failed to update polling units migration: %v", err)
	}
}
