package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestGetClientIP(t *testing.T) {
	tests := []struct {
		name       string
		headers    map[string]string
		remoteAddr string
		expectedIP string
	}{
		{
			name: "CF-Connecting-IP takes priority over X-Forwarded-For and X-Real-IP behind Cloudflare and ALB",
			headers: map[string]string{
				"CF-Connecting-IP": "102.89.23.45",
				"X-Forwarded-For":  "198.51.100.5, 172.31.0.1",
				"X-Real-IP":        "198.51.100.5",
			},
			remoteAddr: "10.0.0.2:8080",
			expectedIP: "102.89.23.45",
		},
		{
			name: "True-Client-IP used when CF-Connecting-IP is absent",
			headers: map[string]string{
				"True-Client-IP":  "102.89.23.99",
				"X-Forwarded-For": "198.51.100.5",
			},
			remoteAddr: "10.0.0.2:8080",
			expectedIP: "102.89.23.99",
		},
		{
			name: "X-Forwarded-For multiple IPs returns first",
			headers: map[string]string{
				"X-Forwarded-For": "203.0.113.195, 70.41.3.18, 150.172.238.178",
			},
			remoteAddr: "192.168.1.1:12345",
			expectedIP: "203.0.113.195",
		},
		{
			name: "X-Real-IP used when X-Forwarded-For is missing",
			headers: map[string]string{
				"X-Real-IP": "198.51.100.1",
			},
			remoteAddr: "192.168.1.1:12345",
			expectedIP: "198.51.100.1",
		},
		{
			name:       "Fallback to RemoteAddr without headers",
			headers:    map[string]string{},
			remoteAddr: "192.168.1.50:54321",
			expectedIP: "192.168.1.50",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			for k, v := range tt.headers {
				req.Header.Set(k, v)
			}
			req.RemoteAddr = tt.remoteAddr

			ip := GetClientIP(req)
			if ip != tt.expectedIP {
				t.Errorf("GetClientIP() = %v, want %v", ip, tt.expectedIP)
			}
		})
	}
}

func TestRateLimit_FailOpenWhenRedisNil(t *testing.T) {
	handler := RateLimit(nil, 10, time.Minute)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}))

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
	}
}

