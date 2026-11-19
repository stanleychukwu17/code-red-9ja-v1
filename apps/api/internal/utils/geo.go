package utils

import (
	"math"
)

const earthRadiusMeters = 6371000.0 // Mean Earth radius in meters

// HaversineDistanceMeters calculates the great-circle distance in meters between two coordinates (lat, lon) in degrees.
func HaversineDistanceMeters(lat1, lon1, lat2, lon2 float64) float64 {
	// Convert coordinate differences from degrees to radians
	dLat := (lat2 - lat1) * (math.Pi / 180.0)
	dLon := (lon2 - lon1) * (math.Pi / 180.0)

	// Convert latitudes from degrees to radians for trigonometric functions
	radLat1 := lat1 * (math.Pi / 180.0)
	radLat2 := lat2 * (math.Pi / 180.0)

	// Haversine formula: calculates the square of half the chord length between the points
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(radLat1)*math.Cos(radLat2)*math.Sin(dLon/2)*math.Sin(dLon/2)

	// Angular distance in radians around the spherical Earth surface
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	// Multiply angular distance by Earth's radius (6,371,000m) to get distance in meters
	return earthRadiusMeters * c
}

// IsWithinDistance checks if (lat1, lon1) is within maxDistanceMeters of (lat2, lon2).
func IsWithinDistance(lat1, lon1, lat2, lon2, maxDistanceMeters float64) bool {
	return HaversineDistanceMeters(lat1, lon1, lat2, lon2) <= maxDistanceMeters
}

// the formulas were adapted from here https://www.movable-type.co.uk/scripts/latlong.html
// and this for the haversine formula https://en.wikipedia.org/wiki/Haversine_formula
// this website has other formulas for calculating distances between two points on a sphere or ellipsoid
// so use it wisely when you need to
