package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

// RemapStateID converts old state_id (where FCT was 37 and Gombe..Zamfara were 15..36)
// to the new state_id (where FCT is 15 and Gombe..Zamfara are 16..37).
func RemapStateID(id int) int {
	if id == 37 {
		return 15
	}
	if id >= 15 && id <= 36 {
		return id + 1
	}
	return id
}

func main() {
	baseDir, err := os.Getwd()
	if err != nil {
		log.Fatalf("Failed to get working directory: %v", err)
	}

	migrationPath := filepath.Join(baseDir, "db", "migrations", "20260419105714_insert_cities.sql")
	if _, err := os.Stat(migrationPath); os.IsNotExist(err) {
		migrationPath = filepath.Join(baseDir, "apps", "api", "db", "migrations", "20260419105714_insert_cities.sql")
	}

	log.Printf("Updating cities migration at %s...", migrationPath)
	citiesUpdated, cityStateMap, err := updateCitiesSQL(migrationPath)
	if err != nil {
		log.Fatalf("Failed to update cities migration: %v", err)
	}
	log.Printf("Successfully updated %d city records in insert_cities.sql!", citiesUpdated)

	seedsDir := filepath.Join(baseDir, "scripts", "seeds")
	if _, err := os.Stat(seedsDir); os.IsNotExist(err) {
		seedsDir = filepath.Join(baseDir, "apps", "api", "scripts", "seeds")
	}

	log.Printf("Updating seed JSON files in %s...", seedsDir)
	jsonUpdated, err := updateSeedJSONFiles(seedsDir, cityStateMap)
	if err != nil {
		log.Fatalf("Failed to update seed JSON files: %v", err)
	}
	log.Printf("Successfully updated %d state references across seed JSON files!", jsonUpdated)

	log.Println("Done! All city state_ids and seed references are now synchronized.")
}

func updateCitiesSQL(migrationPath string) (int, map[int]int, error) {
	content, err := os.ReadFile(migrationPath)
	if err != nil {
		return 0, nil, fmt.Errorf("read migration file: %w", err)
	}

	// Pattern for insert tuples: (id, 'name', state_id, country_id, lat, lon...)
	// Matches tuples where country_id = 161 (Nigeria)
	re := regexp.MustCompile(`(\(\s*(\d+)\s*,\s*'(?:[^'\\]|\\.)*'\s*,\s*)(\d+)(\s*,\s*161\s*,)`)

	cityStateMap := make(map[int]int)
	updatedCount := 0

	newContent := re.ReplaceAllStringFunc(string(content), func(match string) string {
		sub := re.FindStringSubmatch(match)
		if len(sub) < 5 {
			return match
		}
		cityID, _ := strconv.Atoi(sub[2])
		oldStateID, _ := strconv.Atoi(sub[3])

		newStateID := RemapStateID(oldStateID)
		cityStateMap[cityID] = newStateID

		if newStateID != oldStateID {
			updatedCount++
		}
		return fmt.Sprintf("%s%d%s", sub[1], newStateID, sub[4])
	})

	if err := os.WriteFile(migrationPath, []byte(newContent), 0644); err != nil {
		return 0, nil, fmt.Errorf("write migration file: %w", err)
	}

	return updatedCount, cityStateMap, nil
}

func updateSeedJSONFiles(seedsDir string, cityStateMap map[int]int) (int, error) {
	entries, err := os.ReadDir(seedsDir)
	if err != nil {
		return 0, err
	}

	totalUpdated := 0
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}

		filePath := filepath.Join(seedsDir, entry.Name())
		data, err := os.ReadFile(filePath)
		if err != nil {
			log.Printf("Warning: failed to read %s: %v", entry.Name(), err)
			continue
		}

		var rawData interface{}
		if err := json.Unmarshal(data, &rawData); err != nil {
			log.Printf("Warning: failed to unmarshal %s: %v", entry.Name(), err)
			continue
		}

		records, isSlice := rawData.([]interface{})
		isSingleMap := false
		if !isSlice {
			if rec, isMap := rawData.(map[string]interface{}); isMap {
				records = []interface{}{rec}
				isSingleMap = true
			} else {
				continue
			}
		}

		fileUpdated := 0
		for _, item := range records {
			rec, ok := item.(map[string]interface{})
			if !ok {
				continue
			}

			// Update current_state based on current_city if city exists in map, or remap state ID
			if cityVal, hasCity := rec["current_city"]; hasCity && cityVal != nil {
				if cityID, ok := getInt(cityVal); ok {
					if newStateID, exists := cityStateMap[cityID]; exists {
						if cs, ok := getInt(rec["current_state"]); !ok || cs != newStateID {
							rec["current_state"] = newStateID
							fileUpdated++
						}
					}
				}
			} else if csVal, hasState := rec["current_state"]; hasState && csVal != nil {
				if cs, ok := getInt(csVal); ok {
					newCS := RemapStateID(cs)
					if newCS != cs {
						rec["current_state"] = newCS
						fileUpdated++
					}
				}
			}

			// Update state_of_origin if present
			if soVal, hasSO := rec["state_of_origin"]; hasSO && soVal != nil {
				if so, ok := getInt(soVal); ok {
					newSO := RemapStateID(so)
					if newSO != so {
						rec["state_of_origin"] = newSO
						fileUpdated++
					}
				}
			}
		}

		if fileUpdated > 0 {
			var toMarshal interface{} = records
			if isSingleMap && len(records) == 1 {
				toMarshal = records[0]
			}
			updatedJSON, err := json.MarshalIndent(toMarshal, "", "  ")
			if err != nil {
				log.Printf("Warning: failed to marshal %s: %v", entry.Name(), err)
				continue
			}
			if err := os.WriteFile(filePath, updatedJSON, 0644); err != nil {
				log.Printf("Warning: failed to write %s: %v", entry.Name(), err)
				continue
			}
			log.Printf("Updated %d record field(s) in %s", fileUpdated, entry.Name())
			totalUpdated += fileUpdated
		}
	}

	return totalUpdated, nil
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
