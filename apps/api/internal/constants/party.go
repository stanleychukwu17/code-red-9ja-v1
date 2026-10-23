package constants

// Party Milestone types
const (
	MilestoneTypeJoined                   = "joined_party"
	MilestoneTypeLeft                     = "left_party"
	MilestoneTypeReceivedPosition         = "received_position"
	MilestoneTypePositionRemoved          = "position_removed"
	MilestoneTypeSuspended                = "suspended"
	MilestoneTypeReinstatedFromSuspension = "reinstated_from_suspension"
	MilestoneTypeBlocked                  = "blocked"
	MilestoneTypeUnblocked                = "unblocked"
)

// Default Party Position IDs
const (
	PartyPositionChairmanID       int32 = 2
	PartyPositionDeputyChairmanID int32 = 3
	PartyPositionSecretaryID      int32 = 5
)

// Key State IDs for Nigeria (c_states)
const (
	StateFCTAbujaID int16 = 15
	StateKanoID     int16 = 20
	StateLagosID    int16 = 25
)
