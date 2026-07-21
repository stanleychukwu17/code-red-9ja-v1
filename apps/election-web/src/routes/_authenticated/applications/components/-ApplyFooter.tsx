import { StickyFooter } from "#/components/Footers";
import { Button } from "@repo/ui/components/button";
import { Loader2 } from "lucide-react";

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
