/**
 * Extracts election group IDs where the agent already has an active application
 */
export function getAppliedElectionGroupIds(applications: any[]): number[] {
  return applications
    .filter((app: any) =>
      ["pending", "approved", "success", "accepted"].includes(app.status),
    )
    .map((app: any) => app.election_group_id || app.election_group?.id)
    .filter(Boolean);
}

/**
 * If the agent has an active application for an upcoming or present election,
 * lock their party affiliation so they represent the same party.
 */
export function getLockedPartyId(applications: any[]): number | null {
  const activeApp = applications.find((app: any) => {
    const isActive = ["pending", "approved", "success", "accepted"].includes(
      app.status,
    );
    if (!isActive) return false;

    let electionDateStr: string | undefined;
    if (app.election_date && typeof app.election_date === "object") {
      if (app.election_date.Valid) {
        electionDateStr = app.election_date.Time;
      } else {
        electionDateStr = "2099-12-31T00:00:00Z";
      }
    } else {
      electionDateStr = app.election_date;
    }

    if (!electionDateStr) {
      electionDateStr = "2099-12-31T00:00:00Z";
    }

    const electionDate = new Date(electionDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return electionDate >= today;
  });

  return activeApp ? activeApp.party_id || activeApp.party?.id : null;
}

export interface ValidatePartySearchParams {
  search: { party?: string; partyId?: number | string };
  parties: any[];
  lockedPartyId: number | null;
}

export type PartyValidationResult =
  | { success: true; party: any }
  | { success: false; error: string; party?: any };

/**
 * Validates a party requested via URL query params (?party=... or ?partyId=...).
 * Checks existence, locked affiliation, onboarding verification, and application acceptance.
 */
export function validatePartySearch({
  search,
  parties,
  lockedPartyId,
}: ValidatePartySearchParams): PartyValidationResult | null {
  if (!search.party && !search.partyId) {
    return null;
  }

  const matchedParty = parties.find((p: any) => {
    if (search.partyId && Number(p.id) === Number(search.partyId)) {
      return true;
    }
    if (
      search.party &&
      p.short_name &&
      p.short_name.trim().toLowerCase() === search.party.trim().toLowerCase()
    ) {
      return true;
    }
    return false;
  });

  if (!matchedParty) {
    return {
      success: false,
      error: `The requested party "${search.party || search.partyId}" was not found. Please choose an eligible party.`,
    };
  }

  // Safeguard: Check if user is locked to a different party
  if (lockedPartyId && lockedPartyId !== matchedParty.id) {
    return {
      success: false,
      party: matchedParty,
      error: `You have an active application with another party and cannot apply for ${matchedParty.short_name}.`,
    };
  }

  // Safeguard: Check if party is onboarded / verified
  if (!matchedParty.is_verified) {
    return {
      success: false,
      party: matchedParty,
      error: `${matchedParty.name} (${matchedParty.short_name}) is not yet onboarded. Please choose an eligible party.`,
    };
  }

  // Safeguard: Check if party is accepting applications
  if (!matchedParty.is_accepting_applications) {
    return {
      success: false,
      party: matchedParty,
      error: `${matchedParty.name} (${matchedParty.short_name}) is currently not accepting applications. Please choose an eligible party.`,
    };
  }

  return { success: true, party: matchedParty };
}
