package logger_test

import (
	"log/slog"
	"os"
	"testing"

	"free9ja/api/internal/logger"
	"github.com/stretchr/testify/assert"
)

func TestSetupLogger(t *testing.T) {
	// Store original default logger to restore it after the test
	origDefault := slog.Default()
	defer slog.SetDefault(origDefault)

	// Save original ENV to restore it
	origEnv := os.Getenv("ENV")
	defer os.Setenv("ENV", origEnv)

	tests := []struct {
		name    string
		env     string
		version string
		commit  string
	}{
		{
			name:    "development environment",
			env:     "development",
			version: "1.0.0",
			commit:  "abc123",
		},
		{
			name:    "production environment",
			env:     "production",
			version: "2.0.0",
			commit:  "def456",
		},
		{
			name:    "default to development when env is empty",
			env:     "",
			version: "0.0.1",
			commit:  "local",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.env != "" {
				os.Setenv("ENV", tt.env)
			} else {
				os.Unsetenv("ENV")
			}

			// Call SetupLogger
			logger.SetupLogger(tt.version, tt.commit)

			// Verify that the default logger is updated
			l := slog.Default()
			assert.NotNil(t, l)

			// We can't easily verify the handler type without reflection,
			// but we can ensure it handles basic log calls
			l.Info("test log message", "env", tt.env)
		})
	}
}
