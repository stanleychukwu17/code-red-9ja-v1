package seedservice

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestParseElectionGroupJSON(t *testing.T) {
	// Locate election_group.json relative to repository root
	filePath := filepath.Join("..", "..", "..", "scripts", "seeds", "production", "elections", "2027-general-election", "election_group.json")
	data, err := os.ReadFile(filePath)
	require.NoError(t, err, "failed to read election_group.json")

	var groups []SeedElectionGroupRequest
	err = json.Unmarshal(data, &groups)
	require.NoError(t, err, "failed to unmarshal election_group.json")
	require.Len(t, groups, 2, "expected exactly 2 election groups")

	// Group 1
	require.Equal(t, "2027 Presidential and Senatorial Election", groups[0].Name)
	require.Equal(t, "2027-01-16", groups[0].ElectionDate)
	d1, err := time.Parse("2006-01-02", groups[0].ElectionDate)
	require.NoError(t, err)
	require.Equal(t, 2027, d1.Year())

	// Group 2
	require.Equal(t, "2027 Governorship and State House of Assembly Election", groups[1].Name)
	require.Equal(t, "2027-02-06", groups[1].ElectionDate)
	d2, err := time.Parse("2006-01-02", groups[1].ElectionDate)
	require.NoError(t, err)
	require.Equal(t, 2027, d2.Year())
}
