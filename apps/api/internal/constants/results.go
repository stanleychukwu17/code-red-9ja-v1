package constants

// Election result verification statuses (mirrors DB CHECK constraint on polling_unit_results, collation_results, and inec_polling_unit_results).
const (
	ResultStatusSubmitted  = "submitted"
	ResultStatusAIVerified = "ai_verified"
	ResultStatusConfirmed  = "confirmed"
	ResultStatusDisputed   = "disputed"
	ResultStatusNullified  = "nullified"
)

// Standardized machine-readable dispute codes stored in dispute_codes TEXT[].
const (
	DisputeCodeAIExtractionFailed          = "ai_extraction_failed"
	DisputeCodeAIGeneratedImage            = "ai_generated_image"
	DisputeCodeInvalidEC8AForm             = "invalid_ec8a_form"
	DisputeCodeVoteArithmeticMismatch      = "vote_arithmetic_mismatch"
	DisputeCodeUsedBallotsMismatch         = "used_ballots_mismatch"
	DisputeCodeNoPartyScores               = "no_party_scores"
	DisputeCodePartySumMismatch            = "party_sum_mismatch"
	DisputeCodeOverVoting                  = "over_voting"
	DisputeCodeAccreditedExceedsRegistered = "accredited_exceeds_registered"
	DisputeCodeLowConfidence               = "low_confidence"
)
