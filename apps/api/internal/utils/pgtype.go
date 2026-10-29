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

// PgDateFromString parses an optional date string (YYYY-MM-DD) into a pgtype.Date.
func PgDateFromString(dateStr string) pgtype.Date {
	if dateStr != "" {
		if t, err := time.Parse("2006-01-02", dateStr); err == nil {
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

// PtrFromString converts a plain string to an optional string pointer, returning nil if empty.
func PtrFromString(s string) *string {
	if s != "" {
		return &s
	}
	return nil
}

// PtrFromNonEmptyString converts a plain string to an optional string pointer, returning nil if empty.
func PtrFromNonEmptyString(s string) *string {
	return PtrFromString(s)
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

// PtrFromPgInt4 converts a pgtype.Int4 to an optional int32 pointer.
func PtrFromPgInt4(i pgtype.Int4) *int32 {
	if i.Valid {
		return &i.Int32
	}
	return nil
}

// PtrFromPgInt8 converts a pgtype.Int8 to an optional int64 pointer.
func PtrFromPgInt8(i pgtype.Int8) *int64 {
	if i.Valid {
		return &i.Int64
	}
	return nil
}

// PgInt8OrDefault reads a pgtype.Int8, returning def when the value is null.
func PgInt8OrDefault(i pgtype.Int8, def int64) int64 {
	if i.Valid {
		return i.Int64
	}
	return def
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

// PgInt2FromPositive converts an integer to a valid pgtype.Int2 if > 0, otherwise null.
func PgInt2FromPositive[T ~int | ~int16 | ~int32 | ~int64](id T) pgtype.Int2 {
	if id > 0 {
		return pgtype.Int2{Int16: int16(id), Valid: true}
	}
	return pgtype.Int2{}
}

// PgInt4FromPositive converts an integer to a valid pgtype.Int4 if > 0, otherwise null.
func PgInt4FromPositive[T ~int | ~int16 | ~int32 | ~int64](id T) pgtype.Int4 {
	if id > 0 {
		return pgtype.Int4{Int32: int32(id), Valid: true}
	}
	return pgtype.Int4{}
}

// PgInt8FromPositive converts an integer to a valid pgtype.Int8 if > 0, otherwise null.
func PgInt8FromPositive[T ~int | ~int16 | ~int32 | ~int64](id T) pgtype.Int8 {
	if id > 0 {
		return pgtype.Int8{Int64: int64(id), Valid: true}
	}
	return pgtype.Int8{}
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

// PgBool wraps a non-pointer bool as an always-valid pgtype.Bool.
func PgBool(b bool) pgtype.Bool {
	return pgtype.Bool{Bool: b, Valid: true}
}

// PgBoolFromPtr converts an optional bool pointer to a pgtype.Bool.
func PgBoolFromPtr(b *bool) pgtype.Bool {
	if b != nil {
		return pgtype.Bool{Bool: *b, Valid: true}
	}
	return pgtype.Bool{}
}

// PgDateFromTime converts a time.Time to a valid pgtype.Date if non-zero, otherwise null.
func PgDateFromTime(t time.Time) pgtype.Date {
	if !t.IsZero() {
		return pgtype.Date{Time: t, Valid: true}
	}
	return pgtype.Date{}
}

// PgDateNull returns an invalid/null pgtype.Date.
func PgDateNull() pgtype.Date {
	return pgtype.Date{}
}

// PgInt2Null returns an invalid/null pgtype.Int2.
func PgInt2Null() pgtype.Int2 {
	return pgtype.Int2{}
}

// PgInt4Null returns an invalid/null pgtype.Int4.
func PgInt4Null() pgtype.Int4 {
	return pgtype.Int4{}
}

// PgInt8Null returns an invalid/null pgtype.Int8.
func PgInt8Null() pgtype.Int8 {
	return pgtype.Int8{}
}

// PgTextNull returns an invalid/null pgtype.Text.
func PgTextNull() pgtype.Text {
	return pgtype.Text{}
}

// PgBoolNull returns an invalid/null pgtype.Bool.
func PgBoolNull() pgtype.Bool {
	return pgtype.Bool{}
}

// PgTimestamptzFromTime converts a time.Time to a valid pgtype.Timestamptz if non-zero, otherwise null.
func PgTimestamptzFromTime(t time.Time) pgtype.Timestamptz {
	if !t.IsZero() {
		return pgtype.Timestamptz{Time: t, Valid: true}
	}
	return pgtype.Timestamptz{}
}

// PgTimestamptzFromPtr converts an optional time.Time pointer to a pgtype.Timestamptz.
func PgTimestamptzFromPtr(t *time.Time) pgtype.Timestamptz {
	if t != nil && !t.IsZero() {
		return pgtype.Timestamptz{Time: *t, Valid: true}
	}
	return pgtype.Timestamptz{}
}

// PgTimestamptzNull returns an invalid/null pgtype.Timestamptz.
func PgTimestamptzNull() pgtype.Timestamptz {
	return pgtype.Timestamptz{}
}


