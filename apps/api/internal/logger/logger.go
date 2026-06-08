package logger

import (
	"log/slog"
	"os"
	"time"

	"github.com/lmittmann/tint"
)

// SetupLogger initializes the default slog logger with the tint handler
// for colorized structured logging.
func SetupLogger(version, commit string) *slog.Logger {
	env := os.Getenv("ENV") // Get environment from environment variable
	if env == "" {
		env = "development"
	}

	// ---- HANDLER ----
	var handler slog.Handler

	// If in production or staging, use JSON handler for structured logging
	// Otherwise, use tint for pretty, colorful output for local development

	switch env {
	case "development":
		handler = tint.NewHandler(os.Stdout, &tint.Options{
			Level: slog.LevelDebug,
			// AddSource: false,
			AddSource:  true,
			TimeFormat: time.Kitchen,

			// optional: customize how things look
			ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
				return a
			},
		})

	default: // staging, production
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		})
	}

	// ---- LOGGER ----
	logger := slog.New(handler).With("env", env)

	if env == "production" || env == "staging" {
		logger = logger.With(
			"version", version,
			"commit", commit,
		)
	}

	slog.SetDefault(logger)
	return logger
}
