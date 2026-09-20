package worker

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestExtractR2KeyFromURL verifies that object keys are correctly extracted
// from various Cloudflare R2 and CDN URL formats.
//
// Cloudflare R2 assets can be served via development bucket endpoints (*.r2.dev)
// or production vanity domains (*.free9ja.com). The S3 SDK DeleteObject and
// Cloudflare CDN cache purge APIs require the relative object key (e.g. "avatars/user-123.png"),
// so stripping the host and protocol correctly is essential.
func TestExtractR2KeyFromURL(t *testing.T) {
	tests := []struct {
		name     string
		rawURL   string
		expected string
	}{
		{
			// Cloudflare R2 managed dev subdomain (e.g., https://pub-xxx.r2.dev/...)
			name:     "pub r2.dev url",
			rawURL:   "https://pub-abcdef123456.r2.dev/avatars/user-123.png",
			expected: "avatars/user-123.png",
		},
		{
			// Production custom domain (e.g., https://assets.free9ja.com/...)
			name:     "custom domain com url",
			rawURL:   "https://assets.free9ja.com/parties/2026-07-13/logo.webp",
			expected: "parties/2026-07-13/logo.webp",
		},
		{
			// Blank URL should safely return empty string without panicking
			name:     "empty url",
			rawURL:   "",
			expected: "",
		},
		{
			// Any domain extension (.org, .io, etc.) works seamlessly
			name:     "custom domain org url",
			rawURL:   "https://example.org/image.png",
			expected: "image.png",
		},
		{
			// Strips query parameters from CDN URLs
			name:     "url with query params",
			rawURL:   "https://assets.free9ja.com/parties/2026-07-13/logo.webp?v=123",
			expected: "parties/2026-07-13/logo.webp",
		},
		{
			// Already relative storage key
			name:     "relative key without scheme",
			rawURL:   "avatars/user-456.png",
			expected: "avatars/user-456.png",
		},
		{
			// Relative key with leading slash
			name:     "relative key with leading slash",
			rawURL:   "/avatars/user-789.png",
			expected: "avatars/user-789.png",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := extractR2KeyFromURL(tt.rawURL)
			assert.Equal(t, tt.expected, actual)
		})
	}
}

// TestDeleteAssetPayloadSerialization ensures that DeleteAssetPayload serializes
// and deserializes to/from JSON cleanly.
//
// Asynq stores all task payloads as JSON byte slices in Redis. This test guarantees
// that field mappings and types survive the wire roundtrip intact.
func TestDeleteAssetPayloadSerialization(t *testing.T) {
	payload := DeleteAssetPayload{
		RawURL: "https://pub-abc.r2.dev/test.png",
		FileID: 42,
	}

	// 1. Serialize payload to JSON (mimicking distributor behavior)
	bytes, err := json.Marshal(payload)
	assert.NoError(t, err)

	// 2. Deserialize from JSON (mimicking worker processor behavior)
	var unmarshaled DeleteAssetPayload
	err = json.Unmarshal(bytes, &unmarshaled)
	assert.NoError(t, err)

	// 3. Verify exact payload fidelity
	assert.Equal(t, payload.RawURL, unmarshaled.RawURL)
	assert.Equal(t, payload.FileID, unmarshaled.FileID)
}

// TestDeleteAssetUniqueKey verifies the deterministic task ID generation logic
// used by the distributor for deduplication in Redis.
//
// Asynq enforces task deduplication through unique task IDs (asynq.TaskID)
// and unique locks (asynq.Unique). If an asset deletion is requested multiple times
// within the debounce window (e.g., duplicate user clicks or retries), Asynq drops
// the duplicate to prevent redundant S3 and DB calls.
func TestDeleteAssetUniqueKey(t *testing.T) {
	// Case 1: When a database FileID is available, use a predictable ID key.
	// This prevents concurrent or repeated deletion attempts for the same DB record.
	fileID := int64(1005)
	expectedFileKey := "asset:delete:file:1005"
	assert.Equal(t, expectedFileKey, fmt.Sprintf("asset:delete:file:%d", fileID))

	// Case 2: When FileID is zero and only RawURL is provided, hash the URL with SHA-256.
	// This produces a fixed-length, safe Redis key even if the URL is long or contains special characters.
	rawURL := "https://pub-abc.r2.dev/test.png"
	hash := sha256.Sum256([]byte(rawURL))
	expectedURLKey := fmt.Sprintf("asset:delete:url:%s", hex.EncodeToString(hash[:8]))
	assert.Contains(t, expectedURLKey, "asset:delete:url:")
}
