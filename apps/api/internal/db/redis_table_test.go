package db

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAllRedisPrefixes_NoDuplicatesAndNonEmpty(t *testing.T) {
	seen := make(map[string]bool)

	for _, prefix := range AllRedisPrefixes {
		assert.NotEmpty(t, prefix, "Redis prefix should not be empty")
		assert.False(t, seen[prefix], "Duplicate Redis prefix found: %s", prefix)
		seen[prefix] = true
	}

	assert.Equal(t, 91, len(AllRedisPrefixes), "AllRedisPrefixes count should match total defined Redis key constants")
}
