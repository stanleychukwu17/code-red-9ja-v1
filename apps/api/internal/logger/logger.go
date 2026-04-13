package logger

import (
	"io"
	"log/slog"
	"os"
	"time"

	"github.com/lmittmann/tint"
)

// SetupLogger initializes the default slog logger with the tint handler
// for colorized structured logging.
func SetupLogger(version, commit string) {

	// Get environment from environment variable
	env := os.Getenv("ENV")
	if env == "" {
		env = "development"
	}
	// Check if environment is development
	isDev := env == "development"

	// ---- HANDLER ----
	var handler slog.Handler
	var output io.Writer = os.Stdout

	if isDev {
		// Pretty, colorful output for local development
		handler = tint.NewHandler(output, &tint.Options{
			Level:      slog.LevelDebug, // show everything locally
			AddSource:  true,            // shows file:line (very useful for errors)
			TimeFormat: time.Kitchen,    // gives clean time like 11:04AM, but never use it in production

			// optional: customize how things look
			ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
				return a
			},
		})
	} else {
		handler = slog.NewJSONHandler(output, &slog.HandlerOptions{
			Level:     slog.LevelInfo,
			AddSource: false,
		})
	}

	// ---- LOGGER ----
	logger := slog.New(handler)
	if env == "production" {
		logger = logger.With(
			"version", version,
			"commit", commit,
		)
	}

	slog.SetDefault(logger)
}
