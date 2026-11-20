package audit

import (
	"context"
	"net"
	"net/netip"
	"strconv"
	"time"

	"free9ja/api/internal/db"
	"free9ja/api/internal/db/queries"
	apimiddleware "free9ja/api/internal/middleware"

	"github.com/jackc/pgx/v5/pgtype"
)

type contextKey string

const (
	contextKeyIP        contextKey = "request_ip"
	contextKeyUserAgent contextKey = "request_user_agent"
)

// Integer represents any signed or unsigned integer type constraint.
type Integer interface {
	~int | ~int8 | ~int16 | ~int32 | ~int64 |
		~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64 | ~uintptr
}

// FormatID formats any integer identifier into its base-10 string representation for audit logs.
func FormatID[T Integer](id T) string {
	return strconv.FormatInt(int64(id), 10)
}

type AuditService interface {
	LogActionAsync(ctx context.Context, params queries.InsertAuditLogParams)
	LogPartyAdminActionAsync(ctx context.Context, params queries.InsertAuditLogParams)
	LogAdminActionAsync(ctx context.Context, params queries.InsertAuditLogParams)
}

type auditService struct {
	queries  *queries.Queries
	asyncSem chan struct{}
}

func NewAuditService(q *queries.Queries) AuditService {
	return &auditService{
		queries:  q,
		asyncSem: make(chan struct{}, 10),
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

// ActorInfoFromContext extracts the actor ID and resolved audit role from the context's JWT claims.
func ActorInfoFromContext(ctx context.Context) (int64, string) {
	claims, ok := apimiddleware.GetClaimsFromContext(ctx)
	if !ok || claims == nil {
		return 0, ""
	}

	actorRole := db.ActorRoleUser
	if claims.HasRole(db.ActorRoleSuperAdmin) {
		actorRole = db.ActorRoleSuperAdmin
	} else if claims.HasRole(db.ActorRoleAdmin) {
		actorRole = db.ActorRoleAdmin
	} else if claims.HasRole(db.ActorRoleSuperPartyAdmin) {
		actorRole = db.ActorRoleSuperPartyAdmin
	} else if claims.HasRole(db.ActorRolePartyAdmin) {
		actorRole = db.ActorRolePartyAdmin
	}
	return claims.UserID, actorRole
}

// prepareParams auto-populates missing audit parameters (ActorID, ActorRole, Module, IP, UserAgent) from context.
func (s *auditService) prepareParams(ctx context.Context, params *queries.InsertAuditLogParams) {
	ipAddress, userAgent := RequestMetadataFromContext(ctx)

	if params.IpAddress == nil {
		params.IpAddress = ParseIP(ipAddress)
	}
	if !params.UserAgent.Valid {
		params.UserAgent = StringToText(userAgent)
	}

	actorID, actorRole := ActorInfoFromContext(ctx)

	if params.ActorID == 0 && actorID != 0 {
		params.ActorID = actorID
	}
	if !params.ActorRole.Valid && actorRole != "" {
		params.ActorRole = StringToText(actorRole)
	}

	if !params.Module.Valid {
		role := actorRole
		if params.ActorRole.Valid {
			role = params.ActorRole.String
		}

		switch role {
		case db.ActorRoleSuperAdmin, db.ActorRoleAdmin:
			params.Module = StringToText(db.ModuleAdmin)
		case db.ActorRoleSuperPartyAdmin, db.ActorRolePartyAdmin:
			params.Module = StringToText(db.ModulePartyAdmin)
		default:
			params.Module = StringToText(db.ModuleUsers)
		}
	}
}

// LogActionAsync logs an action to the audit log asynchronously in a goroutine.
func (s *auditService) LogActionAsync(ctx context.Context, params queries.InsertAuditLogParams) {
	s.prepareParams(ctx, &params)

	go func(p queries.InsertAuditLogParams) {
		select {
		case s.asyncSem <- struct{}{}:
			defer func() { <-s.asyncSem }()
		case <-time.After(30 * time.Second):
			return
		}

		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_, _ = s.queries.InsertAuditLog(bgCtx, p)
	}(params)
}

// LogPartyAdminActionAsync logs an action within the party administration module.
// It ensures Module is set to db.ModulePartyAdmin so party admins can view the event.
// If the action was performed by a system administrator (super_admin or admin), it also
// dual-logs to db.ModuleAdmin so platform administrators maintain a global security audit trail.
func (s *auditService) LogPartyAdminActionAsync(ctx context.Context, params queries.InsertAuditLogParams) {
	params.Module = StringToText(db.ModulePartyAdmin)
	s.prepareParams(ctx, &params)

	actorRole := ""
	if params.ActorRole.Valid {
		actorRole = params.ActorRole.String
	}

	go func(p queries.InsertAuditLogParams, role string) {
		select {
		case s.asyncSem <- struct{}{}:
			defer func() { <-s.asyncSem }()
		case <-time.After(30 * time.Second):
			return
		}

		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// 1. Log to party administration module
		_, _ = s.queries.InsertAuditLog(bgCtx, p)

		// 2. Dual-log to platform admin module if executed by a system admin
		if role == db.ActorRoleSuperAdmin || role == db.ActorRoleAdmin {
			adminLog := p
			adminLog.Module = StringToText(db.ModuleAdmin)
			_, _ = s.queries.InsertAuditLog(bgCtx, adminLog)
		}
	}(params, actorRole)
}

// LogAdminActionAsync logs an action within the platform administration module.
func (s *auditService) LogAdminActionAsync(ctx context.Context, params queries.InsertAuditLogParams) {
	params.Module = StringToText(db.ModuleAdmin)
	s.prepareParams(ctx, &params)

	go func(p queries.InsertAuditLogParams) {
		select {
		case s.asyncSem <- struct{}{}:
			defer func() { <-s.asyncSem }()
		case <-time.After(30 * time.Second):
			return
		}

		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_, _ = s.queries.InsertAuditLog(bgCtx, p)
	}(params)
}
