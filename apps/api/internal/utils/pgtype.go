package utils

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// PgTextFromPtr converts an optional string pointer to a pgtype.Text.
func PgTextFromPtr(s *string) pgtype.Text {
	if s != nil && *s != "" {
		return pgtype.Text{String: *s, Valid: true}
	}
	return pgtype.Text{}
}

// PgTextFromString converts a plain string to a nullable pgtype.Text.
func PgTextFromString(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: s, Valid: true}
}

// PgInt8FromPtr converts an optional int64 pointer to a pgtype.Int8.
func PgInt8FromPtr(i *int64) pgtype.Int8 {
	if i != nil {
		return pgtype.Int8{Int64: *i, Valid: true}
	}
	return pgtype.Int8{}
}

// PgInt2FromPtr converts an optional int16 pointer to a pgtype.Int2, with a default fallback.
func PgInt2FromPtr(i *int16, defaultVal int16) pgtype.Int2 {
	if i != nil {
		return pgtype.Int2{Int16: *i, Valid: true}
	}
	return pgtype.Int2{Int16: defaultVal, Valid: true}
}

// PgInt2FromPtrNullable converts an optional int16 pointer to a nullable pgtype.Int2 without fallback.
func PgInt2FromPtrNullable(i *int16) pgtype.Int2 {
	if i != nil {
		return pgtype.Int2{Int16: *i, Valid: true}
	}
	return pgtype.Int2{}
}

// PgDateFromPtr parses an optional date string (YYYY-MM-DD) into a pgtype.Date.
func PgDateFromPtr(dateStr *string) pgtype.Date {
	if dateStr != nil && *dateStr != "" {
		if t, err := time.Parse("2006-01-02", *dateStr); err == nil {
			return pgtype.Date{Time: t, Valid: true}
		}
	}
	return pgtype.Date{}
}

// PtrFromPgText converts a pgtype.Text to an optional string pointer.
func PtrFromPgText(t pgtype.Text) *string {
	if t.Valid && t.String != "" {
		return &t.String
	}
	return nil
}

// PtrFromPgDate formats a pgtype.Date into an optional YYYY-MM-DD string pointer.
func PtrFromPgDate(d pgtype.Date) *string {
	if d.Valid {
		formatted := d.Time.Format("2006-01-02")
		return &formatted
	}
	return nil
}

// PtrFromPgInt2 converts a pgtype.Int2 to an optional int16 pointer.
func PtrFromPgInt2(i pgtype.Int2) *int16 {
	if i.Valid {
		return &i.Int16
	}
	return nil
}

// PgTextOrDefault reads a pgtype.Text, returning def when the value is null or empty.
func PgTextOrDefault(t pgtype.Text, def string) string {
	if t.Valid && t.String != "" {
		return t.String
	}
	return def
}

// PgInt8FromInt64 wraps a non-pointer int64 as an always-valid pgtype.Int8.
func PgInt8FromInt64(v int64) pgtype.Int8 {
	return pgtype.Int8{Int64: v, Valid: true}
}

// PgInt4FromInt32 wraps a non-pointer int32 as an always-valid pgtype.Int4.
func PgInt4FromInt32(v int32) pgtype.Int4 {
	return pgtype.Int4{Int32: v, Valid: true}
}

// PgInt4FromPtr converts an optional int32 pointer to a pgtype.Int4.
func PgInt4FromPtr(i *int32) pgtype.Int4 {
	if i != nil {
		return pgtype.Int4{Int32: *i, Valid: true}
	}
	return pgtype.Int4{}
}

// PgInt2FromInt16 wraps a non-pointer int16 as an always-valid pgtype.Int2.
func PgInt2FromInt16(v int16) pgtype.Int2 {
	return pgtype.Int2{Int16: v, Valid: true}
}

// PgFloat8FromFloat64 wraps a non-pointer float64 as an always-valid pgtype.Float8.
func PgFloat8FromFloat64(v float64) pgtype.Float8 {
	return pgtype.Float8{Float64: v, Valid: true}
}

// PgFloat8FromPtr converts an optional float64 pointer to a pgtype.Float8.
func PgFloat8FromPtr(f *float64) pgtype.Float8 {
	if f != nil {
		return pgtype.Float8{Float64: *f, Valid: true}
	}
	return pgtype.Float8{}
}
