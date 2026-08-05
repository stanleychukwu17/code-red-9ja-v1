// Package r2service provides a Cloudflare R2-compatible file storage service
// built on top of the AWS SDK v2 S3 client. R2 uses an S3-compatible API,
// so we configure a custom endpoint to redirect traffic to the R2 bucket.
package r2service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// Config holds the Cloudflare R2 connection settings.
type Config struct {
	AccountID       string // Cloudflare Account ID
	AccessKeyID     string // R2 API Access Key ID
	SecretAccessKey string // R2 API Secret Access Key
	BucketName      string // R2 Bucket name
	// PublicURL is the optional custom domain or r2.dev URL for serving public objects.
	// e.g. "https://files.free9ja.com" or "https://pub-xxx.r2.dev"
	PublicURL  string
	ZoneID     string       // Cloudflare Zone ID for Edge Cache purging
	APIToken   string       // Cloudflare API Token for Edge Cache purging
	HTTPClient *http.Client // Optional HTTP client for API calls (defaults to 10s timeout client)
}

// R2Service wraps the AWS S3 client pre-configured for Cloudflare R2.
type R2Service struct {
	client     *s3.Client
	presigner  *s3.PresignClient
	httpClient *http.Client
	bucketName string
	publicURL  string
	zoneID     string
	apiToken   string
}

// New creates and returns an R2Service from the provided configuration.
// It validates required fields and configures the S3 client with a custom
// Cloudflare R2 endpoint.
func New(cfg Config) (*R2Service, error) {
	if cfg.AccountID == "" {
		return nil, fmt.Errorf("r2service: AccountID is required")
	}
	if cfg.AccessKeyID == "" || cfg.SecretAccessKey == "" {
		return nil, fmt.Errorf("r2service: AccessKeyID and SecretAccessKey are required")
	}
	if cfg.BucketName == "" {
		return nil, fmt.Errorf("r2service: BucketName is required")
	}

	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.AccountID)

	// Build a static credentials provider using the R2 API keys.
	staticCreds := credentials.NewStaticCredentialsProvider(
		cfg.AccessKeyID,
		cfg.SecretAccessKey,
		"", // session token not needed for R2
	)

	// R2 uses the "auto" region but requires us to specify one for the SDK.
	awsCfg := aws.Config{
		Region:      "auto",
		Credentials: staticCreds,
		// Override the endpoint resolver to point to the R2 endpoint.
		BaseEndpoint: aws.String(endpoint),
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		// R2 does not support virtual-hosted-style path; use path-style instead.
		o.UsePathStyle = true
	})

	presigner := s3.NewPresignClient(client)

	httpClient := cfg.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{
			Timeout: 10 * time.Second,
		}
	}

	return &R2Service{
		client:     client,
		presigner:  presigner,
		httpClient: httpClient,
		bucketName: cfg.BucketName,
		publicURL:  strings.TrimRight(cfg.PublicURL, "/"),
		zoneID:     cfg.ZoneID,
		apiToken:   cfg.APIToken,
	}, nil
}

// BuildKey constructs a deterministic storage key for an uploaded file.
// For example: "party-logos/2026-06-06/apc-logo-<uuid>.png"
func BuildKey(folder, originalName, uniqueID string) string {
	ext := filepath.Ext(originalName)
	base := strings.TrimSuffix(originalName, ext)

	// sanitized: replace anything that isn't alphanumeric / hyphen / underscore
	sanitized := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') ||
			(r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '-'
	}, base)

	// Collapse multiple consecutive hyphens
	for strings.Contains(sanitized, "--") {
		sanitized = strings.ReplaceAll(sanitized, "--", "-")
	}
	sanitized = strings.Trim(sanitized, "-")

	// trim to 60 chars
	if len(sanitized) > 60 {
		sanitized = sanitized[:60]
	}
	if sanitized == "" {
		sanitized = "file"
	}

	// folder cannot be empty
	folder = strings.Trim(folder, "/")
	if folder == "" {
		folder = "uploads"
	}

	// date format: 2006-01-02 -> YYYY-MM-DD
	date := time.Now().UTC().Format("2006-01-02")

	// Format: {folder}/{YYYY-MM-DD}/{sanitized-filename}-{uuid}.{ext}
	return fmt.Sprintf("%s/%s/%s-%s%s", folder, date, sanitized, uniqueID, ext)
}

// PresignedUploadURL returns a pre-signed PUT URL that the client can use
// to upload a file directly to R2 without passing through the API server.
// The URL expires after the specified duration (15 minutes is the recommended default).
func (s *R2Service) PresignedUploadURL(ctx context.Context, key, contentType string, expires time.Duration) (string, error) {
	req, err := s.presigner.PresignPutObject(ctx,
		&s3.PutObjectInput{
			Bucket:      aws.String(s.bucketName),
			Key:         aws.String(key),
			ContentType: aws.String(contentType),
		},
		s3.WithPresignExpires(expires),
	)
	if err != nil {
		return "", fmt.Errorf("r2service: failed to presign upload URL: %w", err)
	}

	return req.URL, nil
}

// PublicURL returns the public-facing URL for a stored object.
// If a custom public domain was configured, it is used; otherwise we fall back
// to the standard R2 public URL format.
func (s *R2Service) PublicURL(key string) string {
	if s.publicURL != "" {
		return fmt.Sprintf("%s/%s", s.publicURL, key)
	}
	// Fallback: this will only work if the bucket has "Allow Public Access" enabled
	return fmt.Sprintf("https://%s.r2.cloudflarestorage.com/%s", s.bucketName, key)
}

// DeleteObject permanently removes an object from the R2 bucket.
func (s *R2Service) DeleteObject(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("r2service: failed to delete object %q: %w", key, err)
	}
	return nil
}

// ObjectExists checks whether a given key exists in the bucket using HeadObject.
func (s *R2Service) ObjectExists(ctx context.Context, key string) (bool, error) {
	_, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(key),
	})
	if err != nil {
		// A "not found" error is expected when the object doesn't exist.
		// We treat it as a false (not an error) to keep the API ergonomic.
		return false, nil
	}
	return true, nil
}

// PurgeCloudflareCache invalidates the given object key from Cloudflare Edge CDN cache.
func (s *R2Service) PurgeCloudflareCache(ctx context.Context, key string) error {
	if s.zoneID == "" || s.apiToken == "" {
		return nil // Skip if Cloudflare API credentials are not configured
	}

	fileURL := s.PublicURL(key)
	payload := map[string][]string{
		"files": {fileURL},
	}
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	// Construct the Cloudflare API URL for cache purging
	url := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/purge_cache", s.zoneID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}

	// Add required headers for Cloudflare API authentication
	req.Header.Set("Authorization", "Bearer "+s.apiToken)
	req.Header.Set("Content-Type", "application/json")

	// Send the purge request to Cloudflare
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("r2service: purge cache request failed: %w", err)
	}
	defer resp.Body.Close()

	// Define the response structure for Cloudflare's purge API
	var purgeResp struct {
		Success bool `json:"success"`
		Errors  []struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		} `json:"errors"`
	}

	// Decode the JSON response from Cloudflare
	_ = json.NewDecoder(resp.Body).Decode(&purgeResp)

	// Check if the purge request was successful
	if !purgeResp.Success || resp.StatusCode >= 400 {
		if len(purgeResp.Errors) > 0 {
			return fmt.Errorf("r2service: cloudflare purge failed with HTTP %d (code %d: %s)", resp.StatusCode, purgeResp.Errors[0].Code, purgeResp.Errors[0].Message)
		}
		return fmt.Errorf("r2service: cloudflare purge failed with HTTP status %d", resp.StatusCode)
	}

	return nil
}
