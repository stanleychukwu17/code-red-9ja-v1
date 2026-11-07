package utils_test

import (
	"net/url"
	"testing"

	"free9ja/api/internal/utils"

	"github.com/stretchr/testify/assert"
)

func TestParseQueryInt(t *testing.T) {
	q := url.Values{}
	q.Set("id", "42")
	q.Set("limit", "100")
	q.Set("negative", "-5")
	q.Set("invalid", "not-a-number")
	q.Set("empty", "  ")

	// Valid parsing
	assert.Equal(t, int(42), utils.ParseQueryInt[int](q, "id"))
	assert.Equal(t, int16(42), utils.ParseQueryInt[int16](q, "id"))
	assert.Equal(t, int32(100), utils.ParseQueryInt[int32](q, "limit"))
	assert.Equal(t, int64(-5), utils.ParseQueryInt[int64](q, "negative"))

	// Missing key with default
	assert.Equal(t, int32(20), utils.ParseQueryInt[int32](q, "missing", 20))

	// Missing key without default
	assert.Equal(t, int32(0), utils.ParseQueryInt[int32](q, "missing"))

	// Invalid value with default
	assert.Equal(t, int(15), utils.ParseQueryInt[int](q, "invalid", 15))

	// Invalid value without default
	assert.Equal(t, int(0), utils.ParseQueryInt[int](q, "invalid"))

	// Whitespace only with default
	assert.Equal(t, int64(50), utils.ParseQueryInt[int64](q, "empty", 50))
}

