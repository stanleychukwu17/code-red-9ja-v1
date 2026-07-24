package db

const (
	// -- Modules --
	ModuleAdmin = "admin" // Represents the administration module of the system

	// -- Actions --
	ActionAssignPageVerification = "assign_page_verification" // Action when a verification badge is assigned to a user's page
	ActionRemovePageVerification = "remove_page_verification" // Action when a verification badge is removed from a user's page
	ActionCreateParty            = "create_party"             // Action for creating a new political party
	ActionUpdateParty            = "update_party"             // Action for updating an existing political party's details

	// -- Actor Roles --
	ActorRoleAdmin = "admin" // A standard administrative user
	// ActorRoleSuperAdmin      = "super_admin"       // A super administrator with full system access
	ActorRolePartyAdmin = "party_admin" // An administrator for a specific political party
	// ActorRoleSuperPartyAdmin = "super_party_admin" // A top-level administrator for political parties

	// -- Entity Types --
	EntityTypeUser  = "user"  // Entity type representing a regular user
	EntityTypeParty = "party" // Entity type representing a political party
)
