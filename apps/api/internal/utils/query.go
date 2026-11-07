package utils

import (
	"net/url"
	"strconv"
	"strings"
)

// Integer defines a type constraint matching any signed or unsigned integer type.
type Integer interface {
	~int | ~int8 | ~int16 | ~int32 | ~int64 |
		~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64
}

// ParseQueryInt parses an integer value from url.Values by key.
// Returns the parsed integer if present and valid; otherwise returns defaultVal (or zero if omitted).
func ParseQueryInt[T Integer](q url.Values, key string, defaultVal ...T) T {
	val := strings.TrimSpace(q.Get(key))
	if val == "" {
		if len(defaultVal) > 0 {
			return defaultVal[0]
		}
		var zero T
		return zero
	}

	v, err := strconv.ParseInt(val, 10, 64)
	if err != nil {
		if len(defaultVal) > 0 {
			return defaultVal[0]
		}
		var zero T
		return zero
	}

	return T(v)
}

