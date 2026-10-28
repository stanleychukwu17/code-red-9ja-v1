export interface ValidateApplicationInputParams {
  selectedPartyId: number | null;
  selectedElectionId: number | null;
  selectedStateId: number | null;
  selectedLgaId: number | null;
  selectedWardId: number | null;
  streetAddress: string;
  selectedPollingUnitId: number | null;
  avatarUrl: string;
  avatarFileId?: number | null;
  userAvatar?: string | null;
  bankAccountNumber: string;
  selectedBankCode: string | null;
  educationalStatus: string;
  highestDegree: string;
  graduationYear: string;
  schoolName: string;
}

/**
 * Validates all required steps and formats the application submission payload.
 * Throws a descriptive Error if any required field is missing.
 */
export function validateAndFormatApplicationPayload(params: ValidateApplicationInputParams) {
  // 1. Political party affiliation
  if (!params.selectedPartyId) {
    throw new Error("Please select a political party.");
  }

  // 2. Educational qualifications
  if (!params.educationalStatus) {
    throw new Error("Please select your educational status.");
  }
  if (
    params.educationalStatus !== "none" &&
    (!params.highestDegree || !params.graduationYear || !params.schoolName)
  ) {
    throw new Error("Please complete your educational details.");
  }

  // 3. Residential location
  const trimmedAddress = params.streetAddress.trim();
  if (!params.selectedStateId || !params.selectedLgaId || !trimmedAddress) {
    throw new Error(
      "Please provide your complete residential address (state, LGA, and street).",
    );
  }

  // 4. Election group assignment
  if (!params.selectedElectionId) {
    throw new Error("Please select an election group to participate in.");
  }

  // 5. Polling unit selection
  if (!params.selectedPollingUnitId) {
    throw new Error("Please select your assigned polling unit.");
  }

  // 6. Identity & passport photo
  const finalAvatar = params.avatarUrl || params.userAvatar;
  if (!finalAvatar) {
    throw new Error("Please upload a passport photo.");
  }

  // 7. Bank account details
  if (!params.bankAccountNumber || params.bankAccountNumber.length !== 10) {
    throw new Error("Please enter a valid 10-digit bank account number.");
  }
  if (!params.selectedBankCode) {
    throw new Error("Please select your bank.");
  }

  return {
    party_id: params.selectedPartyId,
    election_group_id: params.selectedElectionId,
    polling_unit_id: Number(params.selectedPollingUnitId),
    avatar: finalAvatar,
    avatar_file_id: params.avatarFileId || undefined,
    current_state: params.selectedStateId,
    current_lga: params.selectedLgaId,
    current_ward: params.selectedWardId || undefined,
    bank_account_number: params.bankAccountNumber,
    bank_code: params.selectedBankCode,
    educational_status: params.educationalStatus,
    highest_degree: params.educationalStatus === "none" ? "" : params.highestDegree,
    graduation_year: params.educationalStatus === "none" ? "" : params.graduationYear,
    school_name: params.educationalStatus === "none" ? "" : params.schoolName,
    address: trimmedAddress,
  };
}
