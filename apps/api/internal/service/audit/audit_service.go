package audit

import (
	"context"
	"net"
	"net/netip"

	"free9ja/api/internal/db/queries"

	"github.com/jackc/pgx/v5/pgtype"
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

// LogAction logs an action to the audit log.
func (s *auditService) LogAction(ctx context.Context, params queries.InsertAuditLogParams) error {
	// Execute the insertion synchronously for now.
	// We might consider doing this asynchronously in the future if it becomes a bottleneck.
	_, err := s.q.InsertAuditLog(ctx, params)
	return err
}
