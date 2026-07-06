package logger

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/lmittmann/tint"
)

type Config struct {
	Service string
	Env     string
	Version string
	Commit  string
	Level   slog.Level
}

type ctxKey struct{}

// New initializes a new structured logger with the given configuration.
func New(cfg Config) *slog.Logger {
	var handler slog.Handler

	opts := &slog.HandlerOptions{
		Level:     cfg.Level,
		AddSource: cfg.Env == "development",
	}

	if cfg.Env == "development" {
		handler = tint.NewHandler(os.Stdout, &tint.Options{
			Level:      cfg.Level,
			AddSource:  true,
			TimeFormat: time.Kitchen,

			// optional: customize how things look
			ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
				return a
			},
		})
	} else {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	}

	logger := slog.New(handler).With(
		"service", cfg.Service,
		"env", cfg.Env,
		"version", cfg.Version,
		"commit", cfg.Commit,
	)

	slog.SetDefault(logger)
	return logger
}

// WithContext returns a new context with the provided logger attached.
func WithContext(ctx context.Context, logger *slog.Logger) context.Context {
	return context.WithValue(ctx, ctxKey{}, logger)
}

// FromContext extracts the logger from the context. If no logger is found,
// it returns the default global logger.
func FromContext(ctx context.Context) *slog.Logger {
	if logger, ok := ctx.Value(ctxKey{}).(*slog.Logger); ok {
		return logger
	}
	return slog.Default()
}
