package geo

import (
	"net"

	"github.com/oschwald/geoip2-golang"
)

// Location represents the parsed location data from GeoIP
type Location struct {
	City        string  `json:"city,omitempty"`
	Country     string  `json:"country,omitempty"`
	CountryCode string  `json:"country_code,omitempty"`
	Latitude    float64 `json:"latitude,omitempty"`
	Longitude   float64 `json:"longitude,omitempty"`
	Timezone    string  `json:"timezone,omitempty"`
}

// GeoIPService defines the interface for IP location lookups
type GeoIPService interface {
	Lookup(ip net.IP) (*Location, error)
	Close() error
}

type maxMindService struct {
	reader *geoip2.Reader
}

// NewGeoIPService creates a new GeoIP service instance by opening the MaxMind database
func NewGeoIPService(dbPath string) (GeoIPService, error) {
	reader, err := geoip2.Open(dbPath)
	if err != nil {
		return nil, err
	}
	return &maxMindService{reader: reader}, nil
}

// Lookup queries the GeoIP2 database for the location of the given IP address
func (s *maxMindService) Lookup(ip net.IP) (*Location, error) {
	record, err := s.reader.City(ip)
	if err != nil {
		return nil, err
	}

	loc := &Location{
		City:        record.City.Names["en"],
		Country:     record.Country.Names["en"],
		CountryCode: record.Country.IsoCode,
		Latitude:    record.Location.Latitude,
		Longitude:   record.Location.Longitude,
		Timezone:    record.Location.TimeZone,
	}

	return loc, nil
}

// Close closes the underlying GeoIP2 database reader
func (s *maxMindService) Close() error {
	if s.reader != nil {
		return s.reader.Close()
	}
	return nil
}
