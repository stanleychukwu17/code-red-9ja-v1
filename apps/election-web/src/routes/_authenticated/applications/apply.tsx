import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { ApplyProvider, useApplyContext } from "./context/ApplyContext";
import { ApplyFooter } from "./components/-ApplyFooter";
import { ApplySuccess } from "./components/-ApplySuccess";
import {
  ContactDetailsStep,
  EducationalStep,
  Step1,
  Step10,
  Step11,
  Step2,
  Step3,
  Step4,
  Step5,
  Step6,
  Step7,
  Step8,
  Step9,
} from "./components/steps";

export interface ApplySearch {
  partyId?: number;
  party?: string;
  step?: number;
}

export const Route = createFileRoute("/_authenticated/applications/apply")({
  head: () => getPageHeader({ title: "Apply as Polling Unit Agent" }),
  validateSearch: (search: Record<string, unknown>): ApplySearch => {
    return {
      partyId: search.partyId ? Number(search.partyId) : undefined,
      party: typeof search.party === "string" ? search.party : undefined,
      step: search.step ? Number(search.step) : undefined,
    };
  },
  component: ApplyPage,
});

/**
 * 13-Step comprehensive application wizard for prospective Polling Unit Agents.
 *
 * Progression:
 *  1. Orientation & Role Intro
 *  2. Political Party Selection (with active party locking)
 *  3. Contact Information (Phone, WhatsApp)
 *  4. Educational Background (Status & optional Degree, School, Year)
 *  5. Residential Address & Geographic Territory (State, LGA, Ward)
 *  6. Polling Unit Selection (Paginated search filtered to ward & party)
 *  7. Election Day / Group Selection (Choose election day to serve)
 *  8. Role Obligations & Readiness
 *  9. Code of Conduct
 * 10. Neutrality & Integrity Affirmation
 * 11. Payout Terms & Performance Incentives
 * 12. Portrait / Selfie Upload (Cloudflare R2 presigned storage)
 * 13. Bank Account Verification & Submission
 */
function ApplyPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  return (
    <ApplyProvider search={search} navigate={navigate}>
      <ApplyPageContent />
    </ApplyProvider>
  );
}

function ApplyPageContent() {
  const form = useApplyContext();
  const {
    user,
    step,
    handleBackClick,
    submitError,
    success,
    // Step 4
    avatarUrl,
    isUploading,
    handleUploadClick,
    fileInputRef,
    handleFileChange,
    // Step 8
    selectedStateId,
    setSelectedStateId,
    selectedLgaId,
    setSelectedLgaId,
    selectedWardId,
    setSelectedWardId,
    streetAddress,
    setStreetAddress,
    // Step 9
    pollingUnits,
    selectedPollingUnitId,
    setSelectedPollingUnitId,
    getWardName,
    fetchNextUnits,
    hasNextUnits,
    isFetchingNextUnits,
    // Step 14
    bankAccountNumber,
    setBankAccountNumber,
    selectedBankCode,
    setSelectedBankCode,
    bankDropdownOpen,
    setBankDropdownOpen,
    setIsValidatingAccount,
    setIsAccountValid,
  } = form;

  // Render success congratulations screen upon successful submission
  if (success) {
    return <ApplySuccess />;
  }

  return (
    <PageWrapper>
      <div className="flex flex-col flex-1 pb-24">
        <PageHeader onBackClick={handleBackClick} />

        {/* Form validation or server error alert banner */}
        {submitError && (
          <div className="p-4 mx-4 bg-red/10 border border-red/20 text-red rounded-2xl text-sm flex gap-3 items-center mb-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Step 1: Orientation & Welcome */}
        {step === 1 && <Step1 />}

        {/* Step 2: Political Party Selection */}
        {step === 2 && <Step2 />}

        {/* Step 3: Contact Numbers (Phone, WhatsApp, Data) */}
        {step === 3 && <ContactDetailsStep />}

        {/* Step 4: Educational Background & Credentials */}
        {step === 4 && <EducationalStep />}

        {/* Step 5: Residential Address & Ward */}
        {step === 5 && (
          <Step5
            selectedStateId={selectedStateId}
            setSelectedStateId={setSelectedStateId}
            selectedLgaId={selectedLgaId}
            setSelectedLgaId={setSelectedLgaId}
            selectedWardId={selectedWardId}
            setSelectedWardId={setSelectedWardId}
            streetAddress={streetAddress}
            setStreetAddress={setStreetAddress}
          />
        )}

        {/* Step 6: Polling Unit Search & Assignment */}
        {step === 6 && (
          <Step6
            pollingUnits={pollingUnits}
            selectedPollingUnitId={selectedPollingUnitId}
            setSelectedPollingUnitId={setSelectedPollingUnitId}
            getWardName={getWardName}
            fetchNextPage={fetchNextUnits}
            hasNextPage={hasNextUnits}
            isFetchingNextPage={isFetchingNextUnits}
            selectedStateId={selectedStateId}
            selectedLgaId={selectedLgaId}
            selectedWardId={selectedWardId}
            setSelectedWardId={setSelectedWardId}
          />
        )}

        {/* Step 7: Election Day / Group Selection */}
        {step === 7 && <Step3 />}

        {/* Step 8: Polling Agent Responsibilities */}
        {step === 8 && <Step7 />}

        {/* Step 9: Code of Conduct & Punctuality */}
        {step === 9 && <Step8 />}

        {/* Step 10: Neutrality & Integrity Commitment */}
        {step === 10 && <Step9 />}

        {/* Step 11: Compensation & Potential Payout Details */}
        {step === 11 && <Step10 />}

        {/* Step 12: Agent Portrait / Photo Upload */}
        {step === 12 && (
          <Step4
            avatarUrl={avatarUrl || user?.avatar}
            isUploading={isUploading}
            handleUploadClick={handleUploadClick}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
          />
        )}

        {/* Step 13: Bank Account & Payout Verification */}
        {step === 13 && (
          <Step11
            bankAccountNumber={bankAccountNumber}
            setBankAccountNumber={setBankAccountNumber}
            selectedBankCode={selectedBankCode}
            setSelectedBankCode={setSelectedBankCode}
            bankDropdownOpen={bankDropdownOpen}
            setBankDropdownOpen={setBankDropdownOpen}
            user={user}
            setIsValidatingAccount={setIsValidatingAccount}
            setIsAccountValid={setIsAccountValid}
          />
        )}
      </div>

      {/* Sticky footer handling validation and step progression (zero props needed!) */}
      <ApplyFooter />
    </PageWrapper>
  );
}
