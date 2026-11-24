package utils

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
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
	RegisteredVoters             int                        `json:"registered_voters"`
	AccreditedVoters             int                        `json:"accredited_voters"`
	BallotPapersIssued           int                        `json:"ballot_papers_issued"`
	UnusedBallotPapers           int                        `json:"unused_ballot_papers"`
	SpoiledBallotPapers          int                        `json:"spoiled_ballot_papers"`
	RejectedVotes                int                        `json:"rejected_votes"`
	ValidVotes                   int                        `json:"valid_votes"`
	UsedBallotPapers             int                        `json:"used_ballot_papers"`
	VotesCast                    int                        `json:"votes_cast"`
	SerialNumber                 string                     `json:"serial_number"`
	SheetDate                    string                     `json:"sheet_date"`
	PresidingOfficerName         string                     `json:"presiding_officer_name"`
	HasPresidingOfficerSignature bool                       `json:"has_presiding_officer_signature"`
	Candidates                   []GeminiExtractedCandidate `json:"candidates"`
	IsAIGenerated                bool                       `json:"is_ai_generated"`
	ConfidenceScore              float64                    `json:"confidence_score"`
}

const resultExtractionPrompt = `
You are an expert election data extractor for the Nigerian Independent National Electoral Commission (INEC).
Your task is to analyze the provided EC8A election result sheet image and extract all ballot accounting figures, candidate vote counts, and officer certification details.

Extract the following information:
1. Box #1: Number of Voters on the Register ("registered_voters")
2. Box #2: Number of Accredited Voters ("accredited_voters")
3. Box #3: Number of Ballot Papers Issued to the Polling Unit ("ballot_papers_issued")
4. Box #4: Number of Unused Ballot Papers ("unused_ballot_papers")
5. Box #5: Number of Spoiled Ballot Papers ("spoiled_ballot_papers")
6. Box #6: Number of Rejected Ballots ("rejected_votes")
7. Box #7: Number of Total Valid Votes ("valid_votes")
8. Box #8: Total Number of Used Ballot Papers (#5 + #6 + #7) ("used_ballot_papers")
9. Total Votes Cast (sum of Valid Votes and Rejected Ballots, #6 + #7) ("votes_cast")
10. Form Serial Number printed at the top right (e.g. "S/N: 0000037" -> "0000037") ("serial_number")
11. Date written in the bottom Presiding Officer certification section, normalized to YYYY-MM-DD (e.g. "21-02-2026" -> "2026-02-21", or "" if blank/illegible) ("sheet_date")
12. Name of the Presiding Officer written in the bottom certification section ("presiding_officer_name")
13. Whether the Presiding Officer's signature or official stamp is present at the bottom right ("has_presiding_officer_signature")
14. A list of all political parties and their corresponding vote counts. (e.g. APC: 50, PDP: 45, LP: 30)
15. For each party, extract the Name of the Polling Agent if written, and note if a Signature or mark is present.
16. Determine if the image appears to be AI-generated or manipulated.

Return your response as a strict JSON object with this EXACT schema:
{
  "registered_voters": 0,
  "accredited_voters": 0,
  "ballot_papers_issued": 0,
  "unused_ballot_papers": 0,
  "spoiled_ballot_papers": 0,
  "rejected_votes": 0,
  "valid_votes": 0,
  "used_ballot_papers": 0,
  "votes_cast": 0,
  "serial_number": "",
  "sheet_date": "",
  "presiding_officer_name": "",
  "has_presiding_officer_signature": false,
  "candidates": [
    {
      "party_short_name": "APC",
      "vote_count": 0,
      "agent_name": "",
      "has_signature": false
    }
  ],
  "is_ai_generated": false,
  "confidence_score": 0.0
}

Ensure that party_short_name matches standard acronyms (e.g., APC, PDP, LP, NNPP).
If a signature or mark is present in the "NAME/SIGNATURE OF POLLING AGENT" column, set "has_signature" to true. If a name is clearly written, extract it into "agent_name".
If a value cannot be clearly read, estimate to the best of your ability or return 0, but DO NOT change the schema structure.
Set "confidence_score" between 0.0 and 1.0 reflecting how clearly legible the handwritten numbers and sheet are.
Also, closely analyze the image for any signs of AI manipulation or generation (e.g., unnatural lighting, text artifacts, weird proportions). Set "is_ai_generated" to true if you strongly suspect the image is AI-generated, otherwise false.
`

// ExtractPollingUnitResultFromImage downloads an image from a URL and uses Gemini to extract the vote counts.
// If modelName is empty, it falls back to GEMINI_MODEL or "gemini-3.8-flash".
func ExtractPollingUnitResultFromImage(ctx context.Context, apiKey, modelName, imageURL string) (*GeminiExtractedResult, []byte, error) {
	if apiKey == "" {
		return nil, nil, errors.New("gemini api key is not configured")
	}

	// 1. Download the image bytes (respecting context deadline/cancellation)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, imageURL, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create image request: %w", err)
	}
	imgResp, err := http.DefaultClient.Do(req)
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

	mimeType := strings.TrimSpace(strings.Split(imgResp.Header.Get("Content-Type"), ";")[0])
	if mimeType == "" || mimeType == "application/octet-stream" {
		mimeType = http.DetectContentType(imgBytes)
	}

	// 2. Initialize Gemini Client
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create gemini client: %w", err)
	}
	defer client.Close()

	// 3. Configure Model
	if modelName == "" {
		modelName = os.Getenv("GEMINI_MODEL")
	}
	if modelName == "" {
		modelName = "gemini-3.8-flash"
	}
	model := client.GenerativeModel(modelName)
	model.ResponseMIMEType = "application/json"

	// 4. Prepare prompt parts
	imgPart := genai.Blob{
		MIMEType: mimeType,
		Data:     imgBytes,
	}

	promptPart := genai.Text(resultExtractionPrompt)

	// 5. Generate Content
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
