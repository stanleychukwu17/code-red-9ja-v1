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
  EducationalDetailsStep,
  EducationalStatusStep,
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
 * 14-Step comprehensive application wizard for prospective Polling Unit Agents.
 *
 * Progression:
 *  1. Orientation & Role Intro
 *  2. Political Party Selection (with active party locking)
 *  3. Contact Information (Phone, WhatsApp, Data numbers)
 *  4. Educational Status (Primary, Secondary, Tertiary, None)
 *  5. Educational Details (Degree, School, Year - skipped if status is "none")
 *  6. Residential Address & Geographic Territory (State, LGA, Ward)
 *  7. Polling Unit Selection (Paginated search filtered to ward & party)
 *  8. Election Day / Group Selection (Choose election day to serve)
 *  9. Role Obligations & Readiness
 * 10. Code of Conduct
 * 11. Neutrality & Integrity Affirmation
 * 12. Payout Terms & Performance Incentives
 * 13. Portrait / Selfie Upload (Cloudflare R2 presigned storage)
 * 14. Bank Account Verification & Submission
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
    // Step 5
    phone,
    setPhone,
    whatsappPhone,
    setWhatsappPhone,
    dataPhone,
    setDataPhone,
    // Step 6 & 7
    educationalStatus,
    setEducationalStatus,
    highestDegree,
    setHighestDegree,
    graduationYear,
    setGraduationYear,
    schoolName,
    setSchoolName,
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
          <div className="p-4 mx-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm flex gap-3 items-center mb-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Step 1: Orientation & Welcome */}
        {step === 1 && <Step1 />}

        {/* Step 2: Political Party Selection */}
        {step === 2 && <Step2 />}

        {/* Step 3: Contact Numbers (Phone, WhatsApp, Data) */}
        {step === 3 && (
          <ContactDetailsStep
            phone={phone}
            setPhone={setPhone}
            userPhone={user?.phone}
            whatsappPhone={whatsappPhone}
            setWhatsappPhone={setWhatsappPhone}
            dataPhone={dataPhone}
            setDataPhone={setDataPhone}
          />
        )}

        {/* Step 4: Educational Level Status */}
        {step === 4 && (
          <EducationalStatusStep
            educationalStatus={educationalStatus}
            setEducationalStatus={setEducationalStatus}
          />
        )}

        {/* Step 5: Educational Institution & Degree Details */}
        {step === 5 && educationalStatus !== "none" && (
          <EducationalDetailsStep
            educationalStatus={educationalStatus}
            highestDegree={highestDegree}
            setHighestDegree={setHighestDegree}
            graduationYear={graduationYear}
            setGraduationYear={setGraduationYear}
            schoolName={schoolName}
            setSchoolName={setSchoolName}
          />
        )}

        {/* Step 6: Residential Address & Ward */}
        {step === 6 && (
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

        {/* Step 7: Polling Unit Search & Assignment */}
        {step === 7 && (
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

        {/* Step 8: Election Day / Group Selection */}
        {step === 8 && <Step3 />}

        {/* Step 9: Polling Agent Responsibilities */}
        {step === 9 && <Step7 />}

        {/* Step 10: Code of Conduct & Punctuality */}
        {step === 10 && <Step8 />}

        {/* Step 11: Neutrality & Integrity Commitment */}
        {step === 11 && <Step9 />}

        {/* Step 12: Compensation & Potential Payout Details */}
        {step === 12 && <Step10 />}

        {/* Step 13: Agent Portrait / Photo Upload */}
        {step === 13 && (
          <Step4
            avatarUrl={avatarUrl || user?.avatar}
            isUploading={isUploading}
            handleUploadClick={handleUploadClick}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
          />
        )}

        {/* Step 14: Bank Account & Payout Verification */}
        {step === 14 && (
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
