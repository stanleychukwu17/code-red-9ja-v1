package audit

import (
	"context"
	"net"
	"net/netip"

	"free9ja/api/internal/db/queries"

	"github.com/jackc/pgx/v5/pgtype"
)

type contextKey string

const (
	contextKeyIP        contextKey = "request_ip"
	contextKeyUserAgent contextKey = "request_user_agent"
)

type AuditService interface {
	LogAction(ctx context.Context, params queries.InsertAuditLogParams) error
}

type auditService struct {
	q *queries.Queries
}

func NewAuditService(q *queries.Queries) AuditService {
	return &auditService{
		q: q,
	}
}

// StringToText converts a string to a pgtype.Text.
func StringToText(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: s != ""}
}

// ParseIP parses an IP address string and returns a netip.Addr.
func ParseIP(ipStr string) *netip.Addr {
	if ipStr == "" {
		return nil
	}
	// Handle cases like "127.0.0.1:8080" or "[::1]:8080"
	if host, _, err := net.SplitHostPort(ipStr); err == nil {
		ipStr = host
	}
	addr, err := netip.ParseAddr(ipStr)
	if err != nil {
		return nil
	}
	return &addr
}

// WithRequestMetadata stores request-level metadata on the context for audit logging.
func WithRequestMetadata(ctx context.Context, ip, userAgent string) context.Context {
	ctx = context.WithValue(ctx, contextKeyIP, ip)
	ctx = context.WithValue(ctx, contextKeyUserAgent, userAgent)
	return ctx
}

// RequestMetadataFromContext extracts request-level metadata from the context.
func RequestMetadataFromContext(ctx context.Context) (string, string) {
	ip, _ := ctx.Value(contextKeyIP).(string)
	userAgent, _ := ctx.Value(contextKeyUserAgent).(string)
	return ip, userAgent
}

// LogAction logs an action to the audit log.
func (s *auditService) LogAction(ctx context.Context, params queries.InsertAuditLogParams) error {
	ipAddress, userAgent := RequestMetadataFromContext(ctx)

	if params.IpAddress == nil {
		params.IpAddress = ParseIP(ipAddress)
	}
	if !params.UserAgent.Valid {
		params.UserAgent = StringToText(userAgent)
	}

	// Execute the insertion synchronously for now.
	// We might consider doing this asynchronously in the future if it becomes a bottleneck.
	_, err := s.q.InsertAuditLog(ctx, params)
	return err
}
