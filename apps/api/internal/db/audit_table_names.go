package db

const (
	// -- Modules --
	ModuleAdmin      = "admin"       // Represents the administration module of the system
	ModulePartyAdmin = "party_admin" // Represents the party administration module of the system
	ModuleUsers      = "users"       // Represents the users module of the system
	ModuleFiles      = "files"       // Represents the files module of the system

	// -- Actions --
	ActionCreateParty               = "create_party"                 // Action for creating a new party
	ActionUpdateParty               = "update_party"                 // Action for updating a party
	ActionDeleteParty               = "delete_party"                 // Action for deleting a party
	ActionAssignPageVerification    = "assign_page_verification"     // Action when a verification badge is assigned to a user's page
	ActionRemovePageVerification    = "remove_page_verification"     // Action when a verification badge is removed from a user's page
	ActionUpdateUser                = "update_user"                  // Action for updating a user's general profile
	ActionDeleteUserAccount         = "delete_user_account"          // Action for soft deleting a user's account
	ActionUpdateUserMoreInfo        = "update_user_more_info"        // Action for updating a user's more info
	ActionUpdateUserRoles           = "update_user_roles"            // Action for updating a user's roles
	ActionUpdateUserPhoneNumbers    = "update_user_phone_numbers"    // Action for updating a user's phone numbers
	ActionViewUserPhoneNumbers      = "view_user_phone_numbers"      // Action when a user's phone numbers are viewed
	ActionDeleteUserPhoneNumber     = "delete_user_phone_number"     // Action when a user's phone number is deleted
	ActionDeleteFile                = "delete_file"                  // Action for deleting a file
	ActionCreateOffice              = "create_office"                // Action for creating a new political office
	ActionUpdateOffice              = "update_office"                // Action for updating an existing political office
	ActionDeleteOffice              = "delete_office"                // Action for deleting a political office
	ActionCreateElectionGroup       = "create_election_group"        // Action for creating a new election group
	ActionUpdateElectionGroup       = "update_election_group"        // Action for updating an existing election group
	ActionDeleteElectionGroup       = "delete_election_group"        // Action for deleting an election group
	ActionCreateElection            = "create_election"              // Action for creating one or more elections
	ActionUpdateElection            = "update_election"              // Action for updating an existing election
	ActionBulkUpdateElectionGroup   = "bulk_update_election_group"   // Action for bulk updating election groups
	ActionDeleteElection            = "delete_election"              // Action for deleting an election
	ActionBulkDeleteElections       = "bulk_delete_elections"        // Action for bulk deleting elections
	ActionFieldPartyCandidate       = "field_party_candidate"        // Action when a party fields or updates a candidate for an election
	ActionUnfieldPartyCandidate     = "unfield_party_candidate"      // Action when a party withdraws or un-fields a candidate from an election
	ActionCreatePartyCustomPosition = "create_party_custom_position" // Action when a party position is created
	ActionUpdatePartyCustomPosition = "update_party_custom_position" // Action when a party position is updated
	ActionDeletePartyCustomPosition = "delete_party_custom_position" // Action when a party position is deleted
	ActionAssignPartyPosition       = "assign_party_position"        // Action when a member is assigned to a party position
	ActionVacatePartyPosition       = "vacate_party_position"        // Action when a party position assignment is vacated
	ActionSuspendPartyMember        = "suspend_party_member"         // Action when a party member is suspended
	ActionUnsuspendPartyMember      = "unsuspend_party_member"       // Action when a party member's suspension is lifted
	ActionBlockPartyMember          = "block_party_member"           // Action when a user is blocked from a party
	ActionUnblockPartyMember        = "unblock_party_member"         // Action when a user is unblocked from a party
	ActionDepositPartyWallet        = "deposit_party_wallet"         // Action when funds are directly credited/deposited to a party wallet
	ActionBuyPartySlots             = "buy_party_slots"              // Action when a party purchases polling agent slots
	ActionDepositPartyAgentsAllowance = "deposit_party_agents_allowance" // Action when funds are deposited to party polling agent allowance budget

	// -- Actor Roles --
	ActorRoleSuperAdmin      = "super_admin"       // A super administrator of the system
	ActorRoleAdmin           = "admin"             // A standard administrative user
	ActorRoleSuperPartyAdmin = "super_party_admin" // A super administrator for a specific political party
	ActorRolePartyAdmin      = "party_admin"       // An administrator for a specific political party
	ActorRoleUser            = "user"              // A regular user acting on their own account

	// -- Entity Types --
	EntityTypeUser      = "user"      // Entity type representing a regular user
	EntityTypeParty     = "party"     // Entity type representing a political party
	EntityTypeOffice    = "office"    // Entity type representing a political office
	EntityTypeElections = "elections" // Entity type representing elections
)
