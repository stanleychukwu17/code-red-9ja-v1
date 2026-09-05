-- +goose Up
-- Add brand color columns to parties table
ALTER TABLE parties
ADD COLUMN IF NOT EXISTS color_hex VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dark_color_hex VARCHAR(50) DEFAULT NULL;

-- Seed colors for existing political parties
UPDATE parties SET color_hex = '#0284C7', dark_color_hex = '#38BDF8' WHERE short_name = 'APC';
UPDATE parties SET color_hex = '#CA8A04', dark_color_hex = '#FACC15' WHERE short_name = 'APGA';
UPDATE parties SET color_hex = '#65A30D', dark_color_hex = '#A3E635' WHERE short_name = 'APM';
UPDATE parties SET color_hex = '#7C3AED', dark_color_hex = '#A78BFA' WHERE short_name = 'APP';
UPDATE parties SET color_hex = '#4B5563', dark_color_hex = '#9CA3AF' WHERE short_name = 'BP';
UPDATE parties SET color_hex = '#DC2626', dark_color_hex = '#FB7185' WHERE short_name = 'LP';
UPDATE parties SET color_hex = '#0284C7', dark_color_hex = '#38BDF8' WHERE short_name = 'NDC';
UPDATE parties SET color_hex = '#2563EB', dark_color_hex = '#60A5FA' WHERE short_name = 'NNPP';
UPDATE parties SET color_hex = '#B45309', dark_color_hex = '#F59E0B' WHERE short_name = 'NRM';
UPDATE parties SET color_hex = '#16A34A', dark_color_hex = '#4ADE80' WHERE short_name = 'PDP';
UPDATE parties SET color_hex = '#047857', dark_color_hex = '#10B981' WHERE short_name = 'PPN';
UPDATE parties SET color_hex = '#E11D48', dark_color_hex = '#F43F5E' WHERE short_name = 'PRP';
UPDATE parties SET color_hex = '#4F46E5', dark_color_hex = '#818CF8' WHERE short_name = 'SDP';
UPDATE parties SET color_hex = '#0D9488', dark_color_hex = '#2DD4BF' WHERE short_name = 'YPP';
UPDATE parties SET color_hex = '#9333EA', dark_color_hex = '#C084FC' WHERE short_name = 'ZLP';
UPDATE parties SET color_hex = '#0891B2', dark_color_hex = '#22D3EE' WHERE short_name = 'AA';
UPDATE parties SET color_hex = '#D97706', dark_color_hex = '#FBBF24' WHERE short_name = 'ADC';
UPDATE parties SET color_hex = '#059669', dark_color_hex = '#34D399' WHERE short_name = 'ADP';
UPDATE parties SET color_hex = '#4338CA', dark_color_hex = '#6366F1' WHERE short_name = 'DLA';
UPDATE parties SET color_hex = '#1E40AF', dark_color_hex = '#3B82F6' WHERE short_name = 'NDP';
UPDATE parties SET color_hex = '#EA580C', dark_color_hex = '#FB923C' WHERE short_name = 'AAC';
UPDATE parties SET color_hex = '#475569', dark_color_hex = '#94A3B8' WHERE short_name = 'A';

-- +goose Down
ALTER TABLE parties
DROP COLUMN IF EXISTS color_hex,
DROP COLUMN IF EXISTS dark_color_hex;
