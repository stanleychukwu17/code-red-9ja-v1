package geo

import (
	"testing"
)

func TestNewGeoIPService_FileNotFound(t *testing.T) {
	_, err := NewGeoIPService("non-existent-file.mmdb")
	if err == nil {
		t.Error("expected error when database file does not exist, got nil")
	}
}
