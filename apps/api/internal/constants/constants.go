package constants

// Location and Country constants
const (
	// NigeriaCountryID represents the primary country ID for Nigeria in the database.
	NigeriaCountryID int16 = 161

	// NigeriaISO2 is the standard ISO 3166-1 alpha-2 code for Nigeria.
	NigeriaISO2 = "NG"
)

// Page verification targets
const (
	PageTypeParty = "party"
	PageTypeUser  = "user"
)

// Party Milestone types
const (
	MilestoneTypeJoined           = "joined_party"
	MilestoneTypeLeft             = "left_party"
	MilestoneTypeReceivedPosition = "received_position"
	MilestoneTypePositionRemoved  = "position_removed"
)
