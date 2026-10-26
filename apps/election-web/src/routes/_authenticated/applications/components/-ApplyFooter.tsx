import { StickyFooter } from "#/components/Footers";
import { Button } from "@repo/ui/components/button";
import { Loader2 } from "lucide-react";
import { useApplyContext } from "../context/ApplyContext";

/**
 * ApplyFooter
 * Persistent sticky bottom action bar for the agent application wizard.
 * Enforces per-step validation gates before advancing to the next step,
 * handles branching logic (e.g., skipping educational details), and
 * triggers final application submission on step 14.
 */
export function ApplyFooter() {
  const {
    step,
    setStep,
    selectedPartyId,
    selectedElectionIds,
    avatarUrl,
    isUploading,
    selectedStateId,
    selectedLgaId,
    streetAddress,
    selectedPollingUnitId,
    bankAccountNumber,
    whatsappPhone,
    educationalStatus,
    highestDegree,
    graduationYear,
    schoolName,
    isSubmitting,
    handleSubmit,
    user,
    isValidatingAccount,
    isAccountValid,
  } = useApplyContext();

  return (
    <StickyFooter className="pb-20">
      {/* Step 1: Introduction / Welcome */}
      {step === 1 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={() => setStep(2)}
        >
          Start application
        </Button>
      )}

      {/* Step 2: Party Affiliation Selection */}
      {step === 2 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={!selectedPartyId}
          onClick={() => setStep(3)}
        >
          Continue
        </Button>
      )}

      {/* Step 3: WhatsApp & Phone Contact Info */}
      {step === 3 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={!whatsappPhone}
          onClick={() => setStep(4)}
        >
          Continue
        </Button>
      )}

      {/* Step 4: Education Status (Branches: skips details to Step 6 if 'none') */}
      {step === 4 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={!educationalStatus}
          onClick={() => {
            if (educationalStatus === "none") {
              setStep(6);
            } else {
              setStep(5);
            }
          }}
        >
          Continue
        </Button>
      )}

      {/* Step 5: Academic Degree & Institution Details */}
      {step === 5 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={!highestDegree || !graduationYear || !schoolName}
          onClick={() => setStep(6)}
        >
          Continue
        </Button>
      )}

      {/* Step 6: Residential Location (State, LGA, Address) */}
      {step === 6 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={!selectedStateId || !selectedLgaId || !streetAddress}
          onClick={() => setStep(7)}
        >
          Continue
        </Button>
      )}

      {/* Step 7: Desired Polling Unit Assignment */}
      {step === 7 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={!selectedPollingUnitId}
          onClick={() => setStep(8)}
        >
          Continue
        </Button>
      )}

      {/* Step 8: Election Day / Group Selection */}
      {step === 8 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={selectedElectionIds.length === 0}
          onClick={() => setStep(9)}
        >
          Continue
        </Button>
      )}

      {/* Step 9: Responsibilities & Readiness Attestation */}
      {step === 9 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={() => setStep(10)}
        >
          Yes, I agree
        </Button>
      )}

      {/* Step 10: Code of Conduct & Punctuality */}
      {step === 10 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={() => setStep(11)}
        >
          Yes, I agree
        </Button>
      )}

      {/* Step 11: Neutrality & Integrity Attestation */}
      {step === 11 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={() => setStep(12)}
        >
          Yes, I agree
        </Button>
      )}

      {/* Step 12: Compensation & Potential Payout Details */}
      {step === 12 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={() => setStep(13)}
        >
          Yes, I agree
        </Button>
      )}

      {/* Step 13: Head-shot / Passport Photo Upload */}
      {step === 13 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={(!avatarUrl && !user?.avatar) || isUploading}
          onClick={() => setStep(14)}
        >
          Continue
        </Button>
      )}

      {/* Step 14: Bank Account Details & Final Application Submission */}
      {step === 14 && (
        <Button
          type="button"
          variant="secondary"
          size="4xl"
          className="w-full rounded-full"
          disabled={
            !bankAccountNumber ||
            bankAccountNumber.length !== 10 ||
            isSubmitting ||
            isValidatingAccount ||
            !isAccountValid
          }
          onClick={handleSubmit}
        >
          {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
          Submit
        </Button>
      )}
    </StickyFooter>
  );
}

