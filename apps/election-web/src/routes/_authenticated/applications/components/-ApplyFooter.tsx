import { StickyFooter } from "#/components/Footers";
import { Button } from "@repo/ui/components/button";
import { Loader2 } from "lucide-react";

/**
 * ApplyFooter
 * Persistent sticky bottom action bar for the agent application wizard.
 * Enforces per-step validation gates before advancing to the next step,
 * handles branching logic (e.g., skipping educational details), and
 * triggers final application submission on step 14.
 */
export function ApplyFooter({
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
  dataPhone,
  educationalStatus,
  highestDegree,
  graduationYear,
  schoolName,
  isSubmitting,
  handleSubmit,
  user,
  isValidatingAccount,
  isAccountValid,
}: any) {
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

      {/* Step 3: Election / Ballot Selection */}
      {step === 3 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={selectedElectionIds.length === 0}
          onClick={() => setStep(4)}
        >
          Continue
        </Button>
      )}

      {/* Step 4: Headshot / Passport Photo Upload */}
      {step === 4 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={(!avatarUrl && !user?.avatar) || isUploading}
          onClick={() => setStep(5)}
        >
          Continue
        </Button>
      )}

      {/* Step 5: WhatsApp & Phone Contact Info */}
      {step === 5 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={!whatsappPhone}
          onClick={() => setStep(6)}
        >
          Continue
        </Button>
      )}

      {/* Step 6: Education Status (Branches: skips details to Step 8 if 'none') */}
      {step === 6 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={!educationalStatus}
          onClick={() => {
            if (educationalStatus === "none") {
              setStep(8);
            } else {
              setStep(7);
            }
          }}
        >
          Continue
        </Button>
      )}

      {/* Step 7: Academic Degree & Institution Details */}
      {step === 7 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={!highestDegree || !graduationYear || !schoolName}
          onClick={() => setStep(8)}
        >
          Continue
        </Button>
      )}

      {/* Step 8: Residential Location (State, LGA, Address) */}
      {step === 8 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={!selectedStateId || !selectedLgaId || !streetAddress}
          onClick={() => setStep(9)}
        >
          Continue
        </Button>
      )}

      {/* Step 9: Desired Polling Unit Assignment */}
      {step === 9 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={!selectedPollingUnitId}
          onClick={() => setStep(10)}
        >
          Continue
        </Button>
      )}

      {/* Step 10: Punctuality Commitment Attestation */}
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

      {/* Step 11: Vigilance & Result Transmission Attestation */}
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

      {/* Step 12: Neutrality & Integrity Attestation */}
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

      {/* Step 13: Non-violence & Legal Compliance Attestation */}
      {step === 13 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={() => setStep(14)}
        >
          Yes, I agree
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

