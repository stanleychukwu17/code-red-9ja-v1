package middleware

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// rateLimitScript is an atomic Lua script to check and increment rate limit in Redis.
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

// GetClientIP extracts the client's actual IP address from the incoming HTTP request.
// It prioritizes Cloudflare headers (CF-Connecting-IP, True-Client-IP) when behind Cloudflare + AWS ALB,
// then standard proxy headers (X-Forwarded-For, X-Real-IP), before falling back to RemoteAddr.
func GetClientIP(r *http.Request) string {
	// 1. Cloudflare header (highest priority and cannot be spoofed by client when proxied through Cloudflare)
	cfIP := strings.TrimSpace(r.Header.Get("CF-Connecting-IP"))
	if cfIP != "" {
		return cfIP
	}

	// 2. Cloudflare Enterprise / CDN fallback header
	trueClientIP := strings.TrimSpace(r.Header.Get("True-Client-IP"))
	if trueClientIP != "" {
		return trueClientIP
	}

	// 3. X-Forwarded-For (ALB appends client and proxy IPs here)
	forwardedFor := r.Header.Get("X-Forwarded-For")
	if forwardedFor != "" {
		ips := strings.Split(forwardedFor, ",")
		if len(ips) > 0 {
			ip := strings.TrimSpace(ips[0])
			if ip != "" {
				return ip
			}
		}
	}

	// 4. X-Real-IP
	realIP := strings.TrimSpace(r.Header.Get("X-Real-IP"))
	if realIP != "" {
		return realIP
	}

	// 5. Fallback to direct RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return strings.TrimSpace(r.RemoteAddr)
	}
	return strings.TrimSpace(ip)
}

// CheckRateLimit checks whether a key has exceeded the limit within the given time window.
// If Redis is nil or returns an error, it fails open (returns false, err).
func CheckRateLimit(ctx context.Context, rdb *redis.Client, key string, limit int, window time.Duration) (bool, error) {
	if rdb == nil {
		return false, nil // Fail open if Redis is not configured
	}

	windowSecs := int(window.Seconds())
	if windowSecs <= 0 {
		windowSecs = 1
	}

	allowed, err := rateLimitScript.Run(ctx, rdb, []string{key}, limit, windowSecs).Int()
	if err != nil {
		return false, err // Fail open on Redis error
	}
	return allowed == 0, nil
}

// RateLimit creates an HTTP middleware that rate limits requests based on client IP.
func RateLimit(rdb *redis.Client, limit int, window time.Duration, keyPrefix ...string) func(http.Handler) http.Handler {
	prefix := "rate_limit:ip"
	if len(keyPrefix) > 0 && keyPrefix[0] != "" {
		prefix = keyPrefix[0]
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := GetClientIP(r)
			key := fmt.Sprintf("%s:%s", prefix, ip)

			limited, err := CheckRateLimit(r.Context(), rdb, key, limit, window)
			if err != nil {
				slog.Error("Rate limit check error", "ip", ip, "err", err)
			}

			if limited {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				_ = json.NewEncoder(w).Encode(map[string]any{
					"success": false,
					"message": "Too many requests. Please try again later.",
					"data":    nil,
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

