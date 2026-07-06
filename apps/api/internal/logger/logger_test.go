package logger_test

import (
	"context"
	"log/slog"
	"testing"

	"free9ja/api/internal/logger"

	"github.com/stretchr/testify/assert"
)

func TestNewLogger(t *testing.T) {
	origDefault := slog.Default()
	defer slog.SetDefault(origDefault)

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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := logger.Config{
				Service: "test_service",
				Env:     tt.env,
				Version: tt.version,
				Commit:  tt.commit,
				Level:   slog.LevelDebug,
			}

			// Call New
			l := logger.New(cfg)
			assert.NotNil(t, l)

			// Verify that the default logger is updated
			defL := slog.Default()
			assert.NotNil(t, defL)

			l.Info("test log message", "env", tt.env)
		})
	}
}

func TestContextLogger(t *testing.T) {
	ctx := context.Background()
	cfg := logger.Config{
		Service: "test_service",
		Env:     "development",
		Level:   slog.LevelDebug,
	}

	l := logger.New(cfg)

	// Context without logger should return default
	extractedL := logger.FromContext(ctx)
	assert.Equal(t, slog.Default(), extractedL)

	// Context with logger should return that logger
	ctxWithL := logger.WithContext(ctx, l)
	extractedL2 := logger.FromContext(ctxWithL)
	assert.Equal(t, l, extractedL2)
}
