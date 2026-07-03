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
  isSubmitting,
  handleSubmit,
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
          disabled={!avatarUrl || isUploading}
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
          disabled={!selectedStateId || !selectedLgaId || !streetAddress}
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
          disabled={!selectedPollingUnitId}
          onClick={() => setStep(7)}
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
          onClick={() => setStep(8)}
        >
          Yes, I agree
        </Button>
      )}

      {step === 8 && (
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          onClick={() => setStep(9)}
        >
          Yes, I agree
        </Button>
      )}

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
          variant="secondary"
          size="4xl"
          className="w-full rounded-full"
          disabled={
            !bankAccountNumber ||
            bankAccountNumber.length !== 10 ||
            isSubmitting
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
