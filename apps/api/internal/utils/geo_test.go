package utils

import (
	"math"
	"testing"
)

func TestHaversineDistanceMeters(t *testing.T) {
	// Test identical coordinates
	dist := HaversineDistanceMeters(6.5244, 3.3792, 6.5244, 3.3792)
	if dist != 0 {
		t.Errorf("expected 0 for identical points, got %f", dist)
	}

	// Test known distance: Lagos (6.5244, 3.3792) to Abuja (9.0765, 7.3986) ~ 536km
	distLagosAbuja := HaversineDistanceMeters(6.5244, 3.3792, 9.0765, 7.3986)
	if math.Abs(distLagosAbuja-536000) > 10000 { // within 10km tolerance
		t.Errorf("expected ~536,000m, got %f", distLagosAbuja)
	}

	// Test short distance: ~111m per 0.001 deg latitude
	distShort := HaversineDistanceMeters(6.5244, 3.3792, 6.5254, 3.3792)
	if math.Abs(distShort-111) > 2 {
		t.Errorf("expected ~111m, got %f", distShort)
	}

	// Test IsWithinDistance
	if !IsWithinDistance(6.5244, 3.3792, 6.5254, 3.3792, 150) {
		t.Errorf("expected points ~111m apart to be within 150m")
	}
	if IsWithinDistance(6.5244, 3.3792, 6.5254, 3.3792, 50) {
		t.Errorf("expected points ~111m apart NOT to be within 50m")
	}
}
