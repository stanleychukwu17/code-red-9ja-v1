package utils

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

// GeminiExtractedCandidate maps a party short name to a vote count
type GeminiExtractedCandidate struct {
	PartyShortName string `json:"party_short_name"`
	VoteCount      int    `json:"vote_count"`
	AgentName      string `json:"agent_name"`
	HasSignature   bool   `json:"has_signature"`
}

// GeminiExtractedResult is the expected JSON output from the Gemini model
type GeminiExtractedResult struct {
	AccreditedVoters int                        `json:"accredited_voters"`
	VotesCast        int                        `json:"votes_cast"`
	ValidVotes       int                        `json:"valid_votes"`
	RejectedVotes    int                        `json:"rejected_votes"`
	Candidates       []GeminiExtractedCandidate `json:"candidates"`
	IsAIGenerated    bool                       `json:"is_ai_generated"`
}

const resultExtractionPrompt = `
You are an expert election data extractor for the Nigerian Independent National Electoral Commission (INEC).
Your task is to analyze the provided EC8A election result sheet image and extract the final vote counts.

Extract the following information:
1. Total number of Accredited Voters
2. Total Valid Votes
3. Total Rejected Votes
4. Total Votes Cast (this should be the sum of Valid and Rejected votes)
5. A list of all political parties and their corresponding vote counts. (e.g. APC: 50, PDP: 45, LP: 30)
6. For each party, extract the Name of the Polling Agent if written, and note if a Signature or mark is present.
7. Determine if the image appears to be AI-generated or manipulated.

Return your response as a strict JSON object with this EXACT schema:
{
  "accredited_voters": 0,
  "votes_cast": 0,
  "valid_votes": 0,
  "rejected_votes": 0,
  "candidates": [
    {
      "party_short_name": "APC",
      "vote_count": 0,
      "agent_name": "",
      "has_signature": false
    }
  ],
  "is_ai_generated": false
}

Ensure that party_short_name matches standard acronyms (e.g., APC, PDP, LP, NNPP).
If a signature or mark is present in the "NAME/SIGNATURE OF POLLING AGENT" column, set "has_signature" to true. If a name is clearly written, extract it into "agent_name".
If a value cannot be clearly read, estimate to the best of your ability or return 0, but DO NOT change the schema structure.
Also, closely analyze the image for any signs of AI manipulation or generation (e.g., unnatural lighting, text artifacts, weird proportions). Set "is_ai_generated" to true if you strongly suspect the image is AI-generated, otherwise false.
`

// ExtractPollingUnitResultFromImage downloads an image from a URL and uses Gemini to extract the vote counts.
func ExtractPollingUnitResultFromImage(ctx context.Context, apiKey string, imageURL string) (*GeminiExtractedResult, []byte, error) {
	if apiKey == "" {
		return nil, nil, errors.New("gemini api key is not configured")
	}

	// 1. Download the image bytes
	imgResp, err := http.Get(imageURL)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to download result sheet image: %w", err)
	}
	defer imgResp.Body.Close()

	if imgResp.StatusCode != http.StatusOK {
		return nil, nil, fmt.Errorf("failed to fetch image, status code: %d", imgResp.StatusCode)
	}

	imgBytes, err := io.ReadAll(imgResp.Body)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read image body: %w", err)
	}

	mimeType := imgResp.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "image/jpeg" // fallback
	}

	// 2. Initialize Gemini Client
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create gemini client: %w", err)
	}
	defer client.Close()

	// 3. Configure Model (gemini-2.5-pro is best for complex visual extraction)
	// 3. Configure Model (gemini-1.5-flash is best for general free tier visual extraction)
	model := client.GenerativeModel("gemini-2.5-pro")
	model.ResponseMIMEType = "application/json"
	
	// 4. Prepare prompt parts
	imgPart := genai.Blob{
		MIMEType: mimeType,
		Data:     imgBytes,
	}

	promptPart := genai.Text(resultExtractionPrompt)

	// 5. Generate Content
	slog.Info("Sending image to Gemini for analysis...", "url", imageURL)
	resp, err := model.GenerateContent(ctx, imgPart, promptPart)
	if err != nil {
		return nil, nil, fmt.Errorf("gemini generation failed: %w", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, nil, errors.New("gemini returned an empty response")
	}

	// 6. Parse Response
	var rawJSON string
	if textPart, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
		rawJSON = string(textPart)
	} else {
		return nil, nil, errors.New("gemini response was not text")
	}

	// Sometimes Gemini wraps JSON in markdown blocks even with JSON mime type
	rawJSON = strings.TrimSpace(rawJSON)
	if strings.HasPrefix(rawJSON, "```json") {
		rawJSON = strings.TrimPrefix(rawJSON, "```json")
		rawJSON = strings.TrimSuffix(rawJSON, "```")
	} else if strings.HasPrefix(rawJSON, "```") {
		rawJSON = strings.TrimPrefix(rawJSON, "```")
		rawJSON = strings.TrimSuffix(rawJSON, "```")
	}
	rawJSON = strings.TrimSpace(rawJSON)

	var extractedData GeminiExtractedResult
	if err := json.Unmarshal([]byte(rawJSON), &extractedData); err != nil {
		return nil, []byte(rawJSON), fmt.Errorf("failed to parse gemini json: %w", err)
	}

	return &extractedData, []byte(rawJSON), nil
}
