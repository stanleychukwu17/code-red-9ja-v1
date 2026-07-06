package main

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"ip-service/geo"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestGetIP(t *testing.T) {
	tests := []struct {
		name       string
		headers    map[string]string
		remoteAddr string
		expected   string
	}{
		{
			name:       "X-Forwarded-For simple",
			headers:    map[string]string{"X-Forwarded-For": "203.0.113.195"},
			remoteAddr: "192.0.2.1:1234",
			expected:   "203.0.113.195",
		},
		{
			name:       "X-Forwarded-For multiple IPs",
			headers:    map[string]string{"X-Forwarded-For": "203.0.113.195, 70.41.3.18, 150.172.238.178"},
			remoteAddr: "192.0.2.1:1234",
			expected:   "203.0.113.195",
		},
		{
			name:       "X-Real-IP",
			headers:    map[string]string{"X-Real-IP": "203.0.113.196"},
			remoteAddr: "192.0.2.1:1234",
			expected:   "203.0.113.196",
		},
		{
			name:       "RemoteAddr fallback",
			headers:    map[string]string{},
			remoteAddr: "192.0.2.1:1234",
			expected:   "192.0.2.1",
		},
		{
			name:       "RemoteAddr without port",
			headers:    map[string]string{},
			remoteAddr: "192.0.2.1",
			expected:   "192.0.2.1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, _ := http.NewRequest("GET", "/", nil)
			for k, v := range tt.headers {
				req.Header.Set(k, v)
			}
			req.RemoteAddr = tt.remoteAddr

			ip := getIP(req)
			if ip != tt.expected {
				t.Errorf("expected %s, got %s", tt.expected, ip)
			}
		})
	}
}

func TestIPHandler_JSONResponse(t *testing.T) {
	// Disable rate limiting for this test
	rdb = nil

	req, _ := http.NewRequest("GET", "/", nil)
	req.RemoteAddr = "192.0.2.1:1234"
	req.Header.Set("User-Agent", "Mozilla/5.0")

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(ipHandler)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}

	var response map[string]string
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	if err != nil {
		t.Fatalf("failed to parse JSON response: %v", err)
	}

	if response["ip"] != "192.0.2.1" {
		t.Errorf("expected ip to be 192.0.2.1, got %s", response["ip"])
	}
}

func TestIPHandler_CurlResponse(t *testing.T) {
	rdb = nil

	req, _ := http.NewRequest("GET", "/", nil)
	req.RemoteAddr = "192.0.2.1:1234"
	req.Header.Set("User-Agent", "curl/7.64.1")

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(ipHandler)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}

	expected := "192.0.2.1\n"
	if rr.Body.String() != expected {
		t.Errorf("expected plain text %q, got %q", expected, rr.Body.String())
	}
}

func TestIPHandler_RateLimiting(t *testing.T) {
	// Start miniredis
	mr, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}
	defer mr.Close()

	// Configure redis client pointing to miniredis
	rdb = redis.NewClient(&redis.Options{
		Addr: mr.Addr(),
	})
	defer rdb.Close()

	// Setup config
	cfg.RateLimitReqs = 3
	cfg.RateLimitWindow = 10 * time.Second

	handler := http.HandlerFunc(ipHandler)

	// Make 3 requests (within limit)
	for i := 0; i < 3; i++ {
		req, _ := http.NewRequest("GET", "/", nil)
		req.RemoteAddr = "192.0.2.2:1234"
		req.Header.Set("User-Agent", "Mozilla/5.0")

		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("request %d: expected status 200, got %d", i+1, rr.Code)
		}
	}

	// 4th request should be rate limited (429)
	req, _ := http.NewRequest("GET", "/", nil)
	req.RemoteAddr = "192.0.2.2:1234"
	req.Header.Set("User-Agent", "Mozilla/5.0")

	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusTooManyRequests {
		t.Errorf("expected status 429, got %d", rr.Code)
	}

	var response map[string]string
	_ = json.Unmarshal(rr.Body.Bytes(), &response)
	if !strings.Contains(response["error"], "Too many requests") {
		t.Errorf("expected error message to contain 'Too many requests', got %q", response["error"])
	}
}

type mockGeoIPService struct {
	lookupFunc func(ip net.IP) (*geo.Location, error)
}

func (m *mockGeoIPService) Lookup(ip net.IP) (*geo.Location, error) {
	if m.lookupFunc != nil {
		return m.lookupFunc(ip)
	}
	return nil, fmt.Errorf("not implemented")
}

func (m *mockGeoIPService) Close() error {
	return nil
}

func TestIPHandler_JSONResponseWithGeo(t *testing.T) {
	// Disable rate limiting
	rdb = nil

	// Set up mock GeoIP service
	mockLocation := &geo.Location{
		City:        "Lagos",
		Country:     "Nigeria",
		CountryCode: "NG",
		Latitude:    6.5244,
		Longitude:   3.3792,
		Timezone:    "Africa/Lagos",
	}

	geoSvc = &mockGeoIPService{
		lookupFunc: func(ip net.IP) (*geo.Location, error) {
			if ip.String() == "197.210.64.1" {
				return mockLocation, nil
			}
			return nil, fmt.Errorf("address not found")
		},
	}
	defer func() { geoSvc = nil }()

	req, _ := http.NewRequest("GET", "/", nil)
	req.RemoteAddr = "197.210.64.1:1234"
	req.Header.Set("User-Agent", "Mozilla/5.0")

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(ipHandler)
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}

	type Response struct {
		IP       string        `json:"ip"`
		Location *geo.Location `json:"location"`
	}

	var response Response
	err := json.Unmarshal(rr.Body.Bytes(), &response)
	if err != nil {
		t.Fatalf("failed to parse JSON response: %v", err)
	}

	if response.IP != "197.210.64.1" {
		t.Errorf("expected ip to be 197.210.64.1, got %s", response.IP)
	}

	if response.Location == nil {
		t.Fatal("expected location data in response, got nil")
	}

	if response.Location.City != "Lagos" || response.Location.Country != "Nigeria" || response.Location.CountryCode != "NG" {
		t.Errorf("unexpected location data: %+v", response.Location)
	}
}
