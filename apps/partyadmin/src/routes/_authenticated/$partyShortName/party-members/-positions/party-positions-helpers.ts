/**
 * @file Party Positions Helpers
 * @description Helper functions and type definitions for party positions roster,
 * including tier selection validation and hierarchy checks.
 */

export type TierSelectionStatus = {
  isComplete: boolean;
  selectedTierId?: number;
  missingTarget: string;
  message: string;
};

export type TierSelectionStatusProps = {
  chapterType?: string;
  selectedCountryId?: number;
  selectedZonalId?: number;
  selectedStateId?: number;
  selectedLgaId?: number;
  selectedWardId?: number;
};

export type TierSelectionProps = TierSelectionStatusProps;

/**
 * Validates whether the required geographic hierarchy for the active tier is fully selected.
 */
export function getTierSelectionStatus({
  chapterType,
  selectedCountryId,
  selectedZonalId,
  selectedStateId,
  selectedLgaId,
  selectedWardId,
}: TierSelectionStatusProps): TierSelectionStatus {
  switch (chapterType) {
    case "national": {
      const countryId = selectedCountryId || 161;
      return {
        isComplete: Boolean(countryId),
        selectedTierId: countryId,
        missingTarget: "Country",
        message: "Please select a country to view national chapter officials.",
      };
    }
    case "zonal":
      return {
        isComplete: Boolean(selectedZonalId),
        selectedTierId: selectedZonalId,
        missingTarget: "Geopolitical Zone",
        message: "Please select a geopolitical zone to view zonal chapter officials.",
      };
    case "state":
      return {
        isComplete: Boolean(selectedStateId),
        selectedTierId: selectedStateId,
        missingTarget: "State",
        message: "Please select a state to view state chapter officials.",
      };
    case "lga":
      if (!selectedStateId) {
        return {
          isComplete: false,
          selectedTierId: undefined,
          missingTarget: "State",
          message: "Please select a state first to view LGA chapter officials.",
        };
      }

      return {
        isComplete: Boolean(selectedLgaId),
        selectedTierId: selectedLgaId,
        missingTarget: "LGA",
        message: "Please select a Local Government Area (LGA) to view LGA chapter officials.",
      };
    case "ward":
      if (!selectedStateId) {
        return {
          isComplete: false,
          selectedTierId: undefined,
          missingTarget: "State",
          message: "Please select a state first to view ward chapter officials.",
        };
      }

      if (!selectedLgaId) {
        return {
          isComplete: false,
          selectedTierId: undefined,
          missingTarget: "LGA",
          message: "Please select a Local Government Area (LGA) first to view ward chapter officials.",
        };
      }

      return {
        isComplete: Boolean(selectedWardId),
        selectedTierId: selectedWardId,
        missingTarget: "Ward",
        message: "Please select an electoral ward to view ward chapter officials.",
      };
    default:
      return {
        isComplete: false,
        selectedTierId: undefined,
        missingTarget: "Tier",
        message: "Please select a chapter tier.",
      };
  }
}
