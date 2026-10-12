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
	PartyPositionChairmanID  int32 = 2
	PartyPositionSecretaryID int32 = 5
)
