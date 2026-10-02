package utils

// Metadata is a fluent map[string]any builder for structured JSON payloads and metadata maps.
type Metadata map[string]any

// NewMetadata initializes an empty Metadata map.
func NewMetadata() Metadata {
	return make(Metadata)
}

// Set adds or overwrites a key-value pair and returns the Metadata instance.
func (m Metadata) Set(key string, val any) Metadata {
	m[key] = val
	return m
}

// SetIfNonEmpty sets a key-value pair only if the pointer is non-nil and the string is not empty.
func (m Metadata) SetIfNonEmpty(key string, val *string) Metadata {
	if val != nil && *val != "" {
		m[key] = *val
	}
	return m
}

// SetIfPresent sets a key-value pair only if the pointer is non-nil.
func (m Metadata) SetIfPresent(key string, val any) Metadata {
	if val != nil {
		m[key] = val
	}
	return m
}
