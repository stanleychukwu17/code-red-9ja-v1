-- +goose Up

CREATE TABLE files (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  original_name VARCHAR(500) NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  file_size     BIGINT       NOT NULL,
  file_key      VARCHAR(1000) NOT NULL UNIQUE,
  public_url    VARCHAR(2000) NOT NULL DEFAULT '',
  folder        VARCHAR(255) NOT NULL DEFAULT 'uploads',
  is_public     BOOLEAN      NOT NULL DEFAULT true,
  status        VARCHAR(20)  NOT NULL
    CHECK (status IN ('uploading', 'uploaded', 'failed', 'deleted'))
    DEFAULT 'uploading',
  uploaded_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  owner_id      BIGINT,
  uploaded_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_folder        ON files(folder);

-- +goose Down
DROP TABLE IF EXISTS files;
