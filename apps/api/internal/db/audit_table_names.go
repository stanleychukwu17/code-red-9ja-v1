package db

const (
	// -- Modules --
	ModuleAdmin      = "admin"       // Represents the administration module of the system
	ModulePartyAdmin = "party_admin" // Represents the party administration module of the system

	// -- Actions --
	ActionAssignPageVerification = "assign_page_verification" // Action when a verification badge is assigned to a user's page
	ActionRemovePageVerification = "remove_page_verification" // Action when a verification badge is removed from a user's page
	ActionUpdateUserRoles        = "update_user_roles"        // Action for updating a user's roles

	// -- Actor Roles --
	ActorRoleAdmin      = "admin"       // A standard administrative user
	ActorRolePartyAdmin = "party_admin" // An administrator for a specific political party

	// -- Entity Types --
	EntityTypeUser  = "user"  // Entity type representing a regular user
	EntityTypeParty = "party" // Entity type representing a political party
)
