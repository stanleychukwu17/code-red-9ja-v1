-- +goose Up
-- Enable trigram extension for fuzzy matching and substring search on names/tags
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. ASSET FOLDERS TABLE
-- Organizes media assets hierarchically. Subfolders are automatically deleted if a parent is removed (CASCADE).
CREATE TABLE IF NOT EXISTS asset_folders (
  id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL,
  parent_id   INT REFERENCES asset_folders(id) ON DELETE CASCADE,
  r2_prefix   VARCHAR(500) NOT NULL UNIQUE, -- e.g. "assets/branding/logos/"
  description TEXT,
  created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for asset_folders
-- Foreign key & parent traversal index
CREATE INDEX IF NOT EXISTS idx_asset_folders_parent ON asset_folders(parent_id);


-- 2. MEDIA ASSETS TABLE
-- Stores uploaded dev/prod assets (.ai, .blend, videos, images, etc.) stored in Cloudflare R2
CREATE TABLE IF NOT EXISTS media_assets (
  id               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  folder_id        INT REFERENCES asset_folders(id) ON DELETE SET NULL,
  name             VARCHAR(255) NOT NULL,          -- e.g. "landing-page-hero.ai"
  r2_key           VARCHAR(500) NOT NULL UNIQUE,   -- e.g. "assets/branding/landing-page-hero.ai"
  public_url       TEXT NOT NULL,
  file_type        VARCHAR(50) NOT NULL,          -- "image", "video", "vector", "3d", "design", "document", "other"
  extension        VARCHAR(20) NOT NULL,          -- ".ai", ".blend", ".png", ".mp4", ".svg"
  mime_type        VARCHAR(100) NOT NULL,
  file_size_bytes  BIGINT NOT NULL DEFAULT 0,
  dimensions       VARCHAR(50),                   -- e.g. "1920x1080"
  duration_seconds INT,                           -- for audio/video files
  tags             TEXT[] NOT NULL DEFAULT '{}',
  uploaded_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for media_assets
-- 1. Folder browsing and pagination (composite index satisfies queries filtering on folder_id alone as well)
CREATE INDEX IF NOT EXISTS idx_media_assets_folder_id ON media_assets(folder_id, id DESC);

-- 2. Filter by media file type (e.g. "image", "video", "document")
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets(file_type);

-- 3. Trigram index for fast substring search on filenames (e.g. searching "banner", "hero", "icon")
CREATE INDEX IF NOT EXISTS idx_media_assets_name_trgm ON media_assets USING gin (name gin_trgm_ops);

-- 4. GIN index for fast tag filtering: WHERE tags @> ARRAY['demo'] or = ANY(tags)
CREATE INDEX IF NOT EXISTS idx_media_assets_tags ON media_assets USING gin (tags);

-- +goose Down
DROP TABLE IF EXISTS media_assets;
DROP TABLE IF EXISTS asset_folders;
