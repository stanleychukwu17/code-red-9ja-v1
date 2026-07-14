package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"ip-service/config"
	"ip-service/geo"

	"github.com/redis/go-redis/v9"
)

var (
	rdb    *redis.Client
	cfg    config.Config
	geoSvc geo.GeoIPService
)

// rateLimitScript is an atomic Lua script to check and increment rate limit in Redis
var rateLimitScript = redis.NewScript(`
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('incr', key)
if current == 1 then
    redis.call('expire', key, window)
end

if current > limit then
    return 0
else
    return 1
end
`)

// getIP extracts the client's actual IP address from the incoming HTTP request.
// It handles scenarios where the application is deployed behind a reverse proxy,
// load balancer, or CDN by checking standard forwarding headers (X-Forwarded-For, X-Real-IP)
// before falling back to the raw remote address.
func getIP(r *http.Request) string {
	// Check X-Forwarded-For
	forwardedFor := r.Header.Get("X-Forwarded-For")
	if forwardedFor != "" {
		ips := strings.Split(forwardedFor, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return strings.TrimSpace(realIP)
	}

	// Fallback to RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		ip = r.RemoteAddr
	} else {
		ip = strings.TrimSpace(ip)
	}

	// Substitute loopback IP in development environment for easier local testing
	if cfg.AppEnv == "development" {
		parsedIP := net.ParseIP(ip)
		if ip == "::1" || ip == "127.0.0.1" || ip == "localhost" || (parsedIP != nil && parsedIP.IsLoopback()) {
			if cfg.DevMockIP != "" {
				return cfg.DevMockIP
			}
		}
	}

	return ip
}

// isRateLimited checks if the provided IP address has exceeded the configured
// request limit within the defined time window.
// It relies on Redis and an atomic Lua script to ensure thread-safe, distributed rate limiting.
// If Redis is unavailable, it gracefully fails open (allows the request).
func isRateLimited(ctx context.Context, ip string) (bool, error) {
	if rdb == nil {
		return false, nil // Redis not configured/connected, fail open
	}

	key := fmt.Sprintf("ip-service:rate:%s", ip)
	limit := cfg.RateLimitReqs
	window := int(cfg.RateLimitWindow.Seconds())

	allowed, err := rateLimitScript.Run(ctx, rdb, []string{key}, limit, window).Int()
	if err != nil {
		return false, err
	}

	return allowed == 0, nil
}

// ipHandler is the core HTTP handler that processes incoming requests.
// Its responsibilities are:
// 1. Identify the caller's IP address.
// 2. Enforce rate limits to protect the service.
// 3. Format the response appropriately (plain text for curl, JSON for others).
// 4. Augment the response with geographic location data if the GeoIP service is available.
func ipHandler(w http.ResponseWriter, r *http.Request) {
	ip := getIP(r)
	slog.Info("IP detection request received", "ip", ip, "method", r.Method, "path", r.URL.Path, "user_agent", r.UserAgent())

	// Perform rate limiting check
	limited, err := isRateLimited(r.Context(), ip)
	if err != nil {
		slog.Error("Rate limit check error", "ip", ip, "err", err)
		// Fail open: log the error and allow the request
	}

	if limited {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusTooManyRequests)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "Too many requests. Please try again later.",
		})
		return
	}

	// If the user agent is curl, return raw IP
	userAgent := r.Header.Get("User-Agent")
	if strings.Contains(strings.ToLower(userAgent), "curl") {
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprintln(w, ip)
		return
	}

	// Otherwise return JSON
	type Response struct {
		IP       string        `json:"ip"`
		Location *geo.Location `json:"location,omitempty"`
	}

	// Initialize the response structure with the client's IP address
	res := Response{
		IP: ip,
	}

	// If the geo-location service is available, attempt to look up geographic metadata
	if geoSvc != nil {
		parsedIP := net.ParseIP(ip)
		if parsedIP != nil {
			// Query the GeoIP database using the parsed IP address
			if loc, err := geoSvc.Lookup(parsedIP); err == nil {
				// Only attach the location object if it contains a country or city name
				if loc.Country != "" || loc.City != "" {
					res.Location = loc
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(res)
}

// corsMiddleware wraps an http.Handler to supply standard CORS headers and process preflight OPTIONS requests.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if origin != "" {
			if cfg.AppEnv == "production" || cfg.AppEnv == "staging" {
				// Parse host from origin
				host := origin
				// Strip the protocol (e.g. "https://" or "http://") to isolate the hostname and optional port
				host = strings.TrimPrefix(host, "https://")
				host = strings.TrimPrefix(host, "http://")
				// Strip the port number if it exists (e.g. ":443") to get just the hostname
				if idx := strings.Index(host, ":"); idx != -1 {
					host = host[:idx]
				}

				if host == "free9ja.com" || strings.HasSuffix(host, ".free9ja.com") {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Vary", "Origin")
				}
			} else {
				// In development/local, allow any origin
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}
		} else {
			// If no Origin header (e.g. direct curl), set * to allow it
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// main is the entry point of the application. It orchestrates the initialization phase:
// - Loads configuration from environment variables or .env files.
// - Sets up structured logging.
// - Establishes connections to external dependencies (Redis, GeoLite2 Database).
// - Registers HTTP handlers and starts the web server.
func main() {
	// Loads all the configuration required for the service
	cfg = config.LoadConfig()

	// Configure logger based on environment
	var handler slog.Handler
	if os.Getenv("APP_ENV") == "production" {
		// Use JSON format for structured logging in production to easily ingest into aggregators (e.g. ELK, Datadog)
		handler = slog.NewJSONHandler(os.Stdout, nil)
	} else {
		// Use human-readable text format for local development
		handler = slog.NewTextHandler(os.Stdout, nil)
	}

	// Apply the handler to the global default slog logger
	slog.SetDefault(slog.New(handler))

	// Initialize Redis
	rdb = redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		slog.Warn("Failed to connect to Redis. Rate limiting is disabled.", "addr", cfg.RedisAddr, "err", err)
		rdb = nil // Disable Redis rate limiting (fail open)
	} else {
		slog.Info("Successfully connected to Redis", "addr", cfg.RedisAddr)
	}

	// Initialize GeoIP Service
	var err error
	geoSvc, err = geo.NewGeoIPService(cfg.GeoLite2DBPath)
	if err != nil {
		slog.Warn("Failed to initialize GeoIP Service. Geolocation is disabled.", "db_path", cfg.GeoLite2DBPath, "err", err)
		geoSvc = nil
	} else {
		slog.Info("Successfully initialized GeoIP Service", "db_path", cfg.GeoLite2DBPath)
		defer geoSvc.Close()
	}

	// Create a new router
	http.Handle("/", corsMiddleware(http.HandlerFunc(ipHandler)))

	slog.Info("IP Service listening", "port", cfg.Port, "rate_limit_reqs", cfg.RateLimitReqs, "rate_limit_window", cfg.RateLimitWindow, "geoip_enabled", geoSvc != nil)

	if err := http.ListenAndServe(":"+cfg.Port, nil); err != nil {
		slog.Error("Server failed to start", "err", err)
		os.Exit(1)
	}
}
