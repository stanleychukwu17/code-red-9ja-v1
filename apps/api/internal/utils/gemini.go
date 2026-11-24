package utils

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"google.golang.org/genai"
)

// GeminiExtractedPartyScore maps a party short name to its extracted vote count
type GeminiExtractedPartyScore struct {
	PartyShortName string `json:"party_short_name"`
	VoteCount      int    `json:"vote_count"`
	VotesInWords   string `json:"votes_in_words"`
	AgentName      string `json:"agent_name"`
	HasSignature   bool   `json:"has_signature"`
}

// GeminiExtractedResult is the expected JSON output from the Gemini model
type GeminiExtractedResult struct {
	RegisteredVoters             int                         `json:"registered_voters"`
	AccreditedVoters             int                         `json:"accredited_voters"`
	BallotPapersIssued           int                         `json:"ballot_papers_issued"`
	UnusedBallotPapers           int                         `json:"unused_ballot_papers"`
	SpoiledBallotPapers          int                         `json:"spoiled_ballot_papers"`
	RejectedVotes                int                         `json:"rejected_votes"`
	ValidVotes                   int                         `json:"valid_votes"`
	UsedBallotPapers             int                         `json:"used_ballot_papers"`
	VotesCast                    int                         `json:"votes_cast"`
	SerialNumber                 string                      `json:"serial_number"`
	SheetDate                    string                      `json:"sheet_date"`
	PresidingOfficerName         string                      `json:"presiding_officer_name"`
	HasPresidingOfficerSignature bool                        `json:"has_presiding_officer_signature"`
	Parties                      []GeminiExtractedPartyScore `json:"parties"`
	IsValidEC8AForm              bool                        `json:"is_valid_ec8a_form"`
	IsAIGenerated                bool                        `json:"is_ai_generated"`
	ConfidenceScore              float64                     `json:"confidence_score"`
}

const resultExtractionPrompt = `
You are an expert election data extractor for the Nigerian Independent National Electoral Commission (INEC).
Your task is to analyze the provided EC8A election result sheet image and extract all ballot accounting figures, party vote counts, and officer certification details.

Extract the following fields strictly as written on the sheet (do NOT guess or extrapolate unreadable values):
1. Box #1: Number of Voters on the Register ("registered_voters")
2. Box #2: Number of Accredited Voters ("accredited_voters")
3. Box #3: Number of Ballot Papers Issued to the Polling Unit ("ballot_papers_issued")
4. Box #4: Number of Unused Ballot Papers ("unused_ballot_papers")
5. Box #5: Number of Spoiled Ballot Papers ("spoiled_ballot_papers")
6. Box #6: Number of Rejected Ballots ("rejected_votes")
7. Box #7: Number of Total Valid Votes ("valid_votes")
8. Box #8: Total Number of Used Ballot Papers read as written from Box #8 ("used_ballot_papers")
9. Total Votes Cast: sum of Box #6 and Box #7 as written ("votes_cast")
10. Form Serial Number printed at the top right (e.g. "S/N: 0000037" -> "0000037") ("serial_number")
11. Date written in the bottom Presiding Officer certification section, normalized to YYYY-MM-DD (e.g. "21-02-2026" -> "2026-02-21", or "" if blank/illegible) ("sheet_date")
12. Name of the Presiding Officer written in the bottom certification section ("presiding_officer_name")
13. Whether the Presiding Officer's signature or official stamp is present at the bottom right ("has_presiding_officer_signature")
14. Every printed political party row in order ("parties"): standard acronym ("party_short_name", e.g. APC, PDP, LP, NNPP), votes in figures ("vote_count", use 0 if blank or "-"), votes in words ("votes_in_words", or "" if blank), polling agent name if clearly written ("agent_name"), and whether a signature/mark is present in the agent column ("has_signature").
15. Overall legibility confidence from 0.0 to 1.0 ("confidence_score").
16. Whether the image shows signs of AI generation or digital manipulation ("is_ai_generated").
17. Whether the image is genuinely an INEC Form EC8A Statement of Result of Poll from Polling Unit ("is_valid_ec8a_form" - set to false for selfies, blank/unreadable images, unrelated documents, or other form types such as EC8B/EC8C/EC40G).

For blank party vote cells ("IN FIGURES"), return 0 without lowering "confidence_score". If any handwritten number or summary box is smudged or illegible, return 0 and lower "confidence_score" accordingly. Return strict JSON matching the provided response schema.
`

var resultExtractionSchema = &genai.Schema{
	Type: genai.TypeObject,
	Properties: map[string]*genai.Schema{
		"registered_voters":               {Type: genai.TypeInteger},
		"accredited_voters":               {Type: genai.TypeInteger},
		"ballot_papers_issued":            {Type: genai.TypeInteger},
		"unused_ballot_papers":            {Type: genai.TypeInteger},
		"spoiled_ballot_papers":           {Type: genai.TypeInteger},
		"rejected_votes":                  {Type: genai.TypeInteger},
		"valid_votes":                     {Type: genai.TypeInteger},
		"used_ballot_papers":              {Type: genai.TypeInteger},
		"votes_cast":                      {Type: genai.TypeInteger},
		"serial_number":                   {Type: genai.TypeString},
		"sheet_date":                      {Type: genai.TypeString},
		"presiding_officer_name":          {Type: genai.TypeString},
		"has_presiding_officer_signature": {Type: genai.TypeBoolean},
		"parties": {
			Type: genai.TypeArray,
			Items: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"party_short_name": {Type: genai.TypeString},
					"vote_count":       {Type: genai.TypeInteger},
					"votes_in_words":   {Type: genai.TypeString},
					"agent_name":       {Type: genai.TypeString},
					"has_signature":    {Type: genai.TypeBoolean},
				},
				Required: []string{"party_short_name", "vote_count", "votes_in_words", "agent_name", "has_signature"},
			},
		},
		"is_valid_ec8a_form": {Type: genai.TypeBoolean},
		"is_ai_generated":    {Type: genai.TypeBoolean},
		"confidence_score":   {Type: genai.TypeNumber},
	},
	Required: []string{
		"registered_voters", "accredited_voters", "ballot_papers_issued", "unused_ballot_papers",
		"spoiled_ballot_papers", "rejected_votes", "valid_votes", "used_ballot_papers", "votes_cast",
		"serial_number", "sheet_date", "presiding_officer_name", "has_presiding_officer_signature",
		"parties", "is_valid_ec8a_form", "is_ai_generated", "confidence_score",
	},
}

// ExtractPollingUnitResultFromImage downloads an image from a URL and uses Gemini to extract the vote counts.
// If modelName is empty, it falls back to "gemini-3.8-flash".
func ExtractPollingUnitResultFromImage(ctx context.Context, apiKey, modelName, imageURL string, lowThinking bool) (*GeminiExtractedResult, []byte, error) {
	if apiKey == "" {
		return nil, nil, errors.New("gemini api key is not configured")
	}

	// 1. Download the image bytes (respecting context deadline/cancellation)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, imageURL, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create image request: %w", err)
	}

	// Fetch image from URL
	imgResp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to download result sheet image: %w", err)
	}
	defer imgResp.Body.Close()

	// Ensure the image request succeeded
	if imgResp.StatusCode != http.StatusOK {
		return nil, nil, fmt.Errorf("failed to fetch image, status code: %d", imgResp.StatusCode)
	}

	// Read raw image bytes into memory
	imgBytes, err := io.ReadAll(imgResp.Body)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read image body: %w", err)
	}

	// Extract MIME type without parameters
	mimeType := strings.TrimSpace(strings.Split(imgResp.Header.Get("Content-Type"), ";")[0])
	if mimeType == "" || mimeType == "application/octet-stream" {
		mimeType = http.DetectContentType(imgBytes)
	}

	// 2. Initialize Gemini Client
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create gemini client: %w", err)
	}

	// 3. Configure Model
	if modelName == "" {
		modelName = "gemini-3.8-flash"
	}

	// 4. Prepare prompt parts
	parts := []*genai.Part{
		genai.NewPartFromBytes(imgBytes, mimeType),
		genai.NewPartFromText(resultExtractionPrompt),
	}
	contents := []*genai.Content{
		genai.NewContentFromParts(parts, genai.RoleUser),
	}

	// 5. Generate Content
	thinkingLevel := genai.ThinkingLevelMedium
	if lowThinking {
		thinkingLevel = genai.ThinkingLevelLow
	}
	genCfg := &genai.GenerateContentConfig{
		ResponseMIMEType: "application/json",
		ResponseSchema:   resultExtractionSchema,
		ThinkingConfig: &genai.ThinkingConfig{
			ThinkingLevel: thinkingLevel,
		},
	}
	resp, err := client.Models.GenerateContent(ctx, modelName, contents, genCfg)
	if err != nil {
		return nil, nil, fmt.Errorf("gemini generation failed: %w", err)
	}

	rawJSON := resp.Text()
	if rawJSON == "" {
		return nil, nil, errors.New("gemini returned an empty response")
	}

	// Sometimes Gemini wraps JSON in markdown blocks even with JSON mime type
	rawJSON = strings.TrimSpace(rawJSON)
	if trimmed, ok := strings.CutPrefix(rawJSON, "```json"); ok {
		rawJSON = strings.TrimSuffix(trimmed, "```")
	} else if trimmed, ok := strings.CutPrefix(rawJSON, "```"); ok {
		rawJSON = strings.TrimSuffix(trimmed, "```")
	}
	rawJSON = strings.TrimSpace(rawJSON)

	var extractedData GeminiExtractedResult
	if err := json.Unmarshal([]byte(rawJSON), &extractedData); err != nil {
		return nil, []byte(rawJSON), fmt.Errorf("failed to parse gemini json: %w", err)
	}

	return &extractedData, []byte(rawJSON), nil
}
