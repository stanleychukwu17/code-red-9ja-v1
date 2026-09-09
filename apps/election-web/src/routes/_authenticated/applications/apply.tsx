import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import { useUser } from "#/hooks/useUser";
import {
  getApplications,
  submitPollingAgentApplication,
} from "#/lib/server/applications";
import { getElectionGroups } from "#/lib/server/election_groups";
import {
  confirmFileUpload,
  getParties,
  getPresignedUploadURL,
} from "#/lib/server/parties";
import { getPollingUnits } from "#/lib/server/polling_units";
import { getUserMe } from "#/lib/server/users";
import { getPageHeader } from "#/lib/shared/meta";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApplyFooter } from "./components/-ApplyFooter";
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
} from "./components/-ApplySteps";
import { ApplySuccess } from "./components/-ApplySuccess";

/**
 * Route definition for polling unit agent registration wizard.
 */
export const Route = createFileRoute("/_authenticated/applications/apply")({
  head: () => getPageHeader({ title: "Apply as Polling Unit Agent" }),
  component: ApplyPage,
});

/**
 * 14-Step comprehensive application wizard for prospective Polling Unit Agents.
 *
 * Progression:
 *  1. Orientation & Role Intro
 *  2. Political Party Selection (with active party locking)
 *  3. Election Group Selection (filtered to upcoming elections)
 *  4. Portrait / Selfie Upload (Cloudflare R2 presigned storage)
 *  5. Contact Information (Phone, WhatsApp, Data numbers)
 *  6. Educational Status (Primary, Secondary, Tertiary, None)
 *  7. Educational Details (Degree, School, Year - skipped if status is "none")
 *  8. Residential Address & Geographic Territory (State, LGA, Ward)
 *  9. Polling Unit Selection (Paginated search filtered to ward & party)
 * 10. Role Obligations & Readiness
 * 11. Code of Conduct
 * 12. Neutrality & Integrity Affirmation
 * 13. Payout Terms & Performance Incentives
 * 14. Bank Account Verification & Submission
 */
function ApplyPage() {
  const navigate = useNavigate();
  const user = useUser();

  // --- Political Affiliation & Election Selection ---
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(
    user?.party_id || null,
  );
  const [selectedElectionIds, setSelectedElectionIds] = useState<number[]>([]);

  // --- Identity & Photo Verification ---
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar || "");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Residential & Territorial Location ---
  const [selectedStateId, setSelectedStateId] = useState<number | null>(
    user?.current_state || null,
  );
  const [selectedLgaId, setSelectedLgaId] = useState<number | null>(
    user?.current_lga || null,
  );
  const [selectedWardId, setSelectedWardId] = useState<number | null>(
    user?.current_ward || null,
  );
  const [streetAddress, setStreetAddress] = useState<string>(
    user?.address || "",
  );
  const [selectedPollingUnitId, setSelectedPollingUnitId] = useState<
    number | null
  >(user?.polling_unit_id || null);

  // --- Contact Phone Numbers ---
  const [phone, setPhone] = useState<string>(user?.phone || "");
  const [whatsappPhone, setWhatsappPhone] = useState<string>(
    user?.whatsapp_phone || "",
  );
  const [dataPhone, setDataPhone] = useState<string>(user?.data_phone || "");

  // --- Educational Background ---
  const [educationalStatus, setEducationalStatus] = useState<string>("");
  const [highestDegree, setHighestDegree] = useState<string>("");
  const [graduationYear, setGraduationYear] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");

  // --- Bank Account & Verification ---
  const [bankAccountNumber, setBankAccountNumber] = useState<string>("");
  const [selectedBankCode, setSelectedBankCode] = useState<string | null>(null);
  const [bankDropdownOpen, setBankDropdownOpen] = useState<boolean>(false);
  const [isValidatingAccount, setIsValidatingAccount] = useState(false);
  const [isAccountValid, setIsAccountValid] = useState(false);

  // --- Wizard Navigation & Submission Status ---
  const [step, setStep] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Pre-fill profile, education, and banking data from existing user record
  const { data: userMeDetails } = useQuery({
    queryKey: ["userMeDetails"],
    queryFn: async () => {
      const res = await getUserMe();
      return res?.success && res.data?.user ? res.data.user : null;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (userMeDetails) {
      if (userMeDetails.profile?.educational_status)
        setEducationalStatus(userMeDetails.profile.educational_status);
      if (userMeDetails.profile?.highest_degree)
        setHighestDegree(userMeDetails.profile.highest_degree);
      if (userMeDetails.profile?.graduation_year)
        setGraduationYear(userMeDetails.profile.graduation_year);
      if (userMeDetails.profile?.school_name)
        setSchoolName(userMeDetails.profile.school_name);

      if (userMeDetails.bank_account_number) {
        setBankAccountNumber(userMeDetails.bank_account_number);
        setIsAccountValid(true);
      }
      if (userMeDetails.bank_code) {
        setSelectedBankCode(userMeDetails.bank_code);
      }
    }
  }, [userMeDetails]);

  // Query list of registered political parties
  const { data: parties = [], isLoading: partiesLoading } = useQuery({
    queryKey: ["parties"],
    queryFn: async () => {
      const res = await getParties();
      return res?.success && res.data?.parties && res.data.parties.length > 0
        ? res.data.parties
        : [];
    },
    initialData: [],
  });

  // Query upcoming election groups open for agent recruitment
  const { data: elections = [] } = useQuery({
    queryKey: ["electionGroups", { upcoming: true }],
    queryFn: async () => {
      const res = await getElectionGroups({ data: { upcoming: true } });
      if (
        res?.success &&
        res.data?.election_groups &&
        res.data.election_groups.length > 0
      ) {
        return res.data.election_groups.map((group: any) => ({
          id: group.id,
          name: group.name,
          date: group.election_date
            ? new Date(group.election_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "TBD",
        }));
      }
      return [];
    },
    initialData: [],
  });

  // Query user's existing applications to avoid duplicate submissions
  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await getApplications();
      if (res?.success && res.data?.applications) {
        return res.data.applications;
      }
      return [];
    },
  });

  // Election group IDs where the agent already has an active application
  const appliedElectionGroupIds = applications
    .filter((app: any) =>
      ["pending", "approved", "success", "accepted"].includes(app.status),
    )
    .map((app: any) => app.election_group_id || app.election_group?.id)
    .filter(Boolean);

  // If the agent has an active application for an upcoming or present election,
  // lock their party affiliation so they represent the same party
  const lockedPartyId = (() => {
    const activeApp = applications.find((app: any) => {
      const isActive = ["pending", "approved", "success", "accepted"].includes(
        app.status,
      );
      if (!isActive) return false;

      let electionDateStr;
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
  })();

  // Synchronize locked party selection to form state
  useEffect(() => {
    if (lockedPartyId && !selectedPartyId) {
      setSelectedPartyId(lockedPartyId);
    }
  }, [lockedPartyId, selectedPartyId, setSelectedPartyId]);

  // Paginated infinite query for polling units within the agent's chosen jurisdiction
  const {
    data: pollingUnitsData,
    fetchNextPage: fetchNextUnits,
    hasNextPage: hasNextUnits,
    isFetchingNextPage: isFetchingNextUnits,
  } = useInfiniteQuery({
    queryKey: [
      "pollingUnits",
      selectedStateId,
      selectedLgaId,
      selectedWardId,
      selectedPartyId,
      selectedElectionIds?.[0],
    ],
    queryFn: async ({ pageParam }) => {
      const res = await getPollingUnits({
        data: {
          stateId: selectedStateId || undefined,
          localGovernmentId: selectedLgaId || undefined,
          wardId: selectedWardId || undefined,
          limit: 20,
          cursor: pageParam || undefined,
          partyId: selectedPartyId || undefined,
          electionGroupId: selectedElectionIds?.[0] || undefined,
        },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to load polling units");
    },
    initialPageParam: "",
    getNextPageParam: (lastPage: any) => {
      if (lastPage && lastPage.meta && lastPage.meta.has_more) {
        return lastPage.meta.next_cursor || "";
      }
      return undefined;
    },
    enabled: !!selectedStateId || !!selectedLgaId || !!selectedWardId,
  });

  // Flattened array of polling units across all fetched pages
  const pollingUnits = useMemo(() => {
    return pollingUnitsData
      ? pollingUnitsData.pages.flatMap(
          (page: any) => page.data?.polling_units || [],
        )
      : [];
  }, [pollingUnitsData]);

  // Reset LGA selection whenever state changes
  useEffect(() => {
    setSelectedLgaId(null);
  }, [selectedStateId]);

  // Fallback: select the first polling unit if the current selection is absent from new results
  useEffect(() => {
    if (pollingUnits && pollingUnits.length > 0) {
      setSelectedPollingUnitId((current) => {
        const exists = pollingUnits.some((u: any) => u.id === current);
        return exists ? current : pollingUnits[0].id;
      });
    } else {
      setSelectedPollingUnitId(null);
    }
  }, [pollingUnits]);

  // Normalizes ward name extraction from nested or polymorphic unit response
  const getWardName = (unit: any) => {
    if (unit.ward_name) return unit.ward_name;
    if (unit.ward?.name) return unit.ward.name;
    if (unit.ward?.String) return unit.ward.String;
    return "Unknown Ward";
  };

  // Triggers the hidden file input element for portrait upload
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Direct portrait image upload via presigned S3/R2 storage pipeline
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setIsUploading(true);
    setSubmitError(null);

    try {
      const res = await getPresignedUploadURL({
        data: {
          original_name: rawFile.name,
          mime_type: rawFile.type,
          file_size: rawFile.size,
          folder: "avatars",
          is_public: true,
        },
      });

      if (res && res.success && res.data) {
        const { upload_url, public_url, file_id } = res.data;
        const putRes = await fetch(upload_url, {
          method: "PUT",
          headers: {
            "Content-Type": rawFile.type,
          },
          body: rawFile,
        });

        if (!putRes.ok) {
          await confirmFileUpload({ data: { id: file_id, success: false } });
          throw new Error("Failed to upload image file to storage");
        }

        await confirmFileUpload({ data: { id: file_id, success: true } });
        setAvatarUrl(public_url);
      } else {
        throw new Error("Presigned URL retrieval failed");
      }
    } catch (err) {
      console.warn("R2 upload failed, falling back to base64 preview:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(rawFile);
    } finally {
      setIsUploading(false);
    }
  };

  // Mutation submitting the full polling agent application
  const submitMutation = useMutation({
    mutationFn: async () => {
      // Validate that all compulsory agent registration details are filled
      if (
        !selectedPartyId ||
        selectedElectionIds.length === 0 ||
        !selectedStateId ||
        !selectedLgaId ||
        !streetAddress ||
        !selectedPollingUnitId ||
        !selectedBankCode ||
        !bankAccountNumber ||
        bankAccountNumber.length !== 10 ||
        !(user?.avatar || avatarUrl)
      ) {
        throw new Error("Please fill out all required fields.");
      }

      const response = await submitPollingAgentApplication({
        data: {
          party_id: selectedPartyId,
          election_group_ids: selectedElectionIds,
          polling_unit_id: Number(selectedPollingUnitId),
          avatar: user?.avatar || avatarUrl,
          current_country: 1,
          current_state: selectedStateId!,
          current_lga: selectedLgaId!,
          current_ward: selectedWardId || undefined,
          current_city: 0,
          bank_account_number: bankAccountNumber,
          bank_code: selectedBankCode,
          whatsapp_phone: whatsappPhone,
          educational_status: educationalStatus,
          highest_degree: highestDegree,
          graduation_year: graduationYear,
          school_name: schoolName,
          phone: phone,
          address: streetAddress,
        },
      });

      if (!response.success) {
        throw new Error(
          response.message ||
            "Failed to submit application. Please check your inputs.",
        );
      }
      return response;
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (err: any) => {
      setSubmitError(
        err.message || "Connection error. Unable to reach the server.",
      );
    },
  });

  const isSubmitting = submitMutation.isPending;
  const handleSubmit = () => submitMutation.mutate();

  // Filter parties based on search query in Step 2
  const filteredParties = parties.filter(
    (p: any) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.short_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Navigate backward through the wizard, skipping Step 7 if no formal education was chosen
  const handleBackClick = () => {
    if (step === 1) {
      navigate({ to: "/" });
    } else if (step === 8 && educationalStatus === "none") {
      setStep(6);
    } else {
      setStep(step - 1);
    }
  };

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
        {step === 2 && (
          <Step2
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            partiesLoading={partiesLoading}
            filteredParties={filteredParties}
            selectedPartyId={selectedPartyId}
            setSelectedPartyId={setSelectedPartyId}
            lockedPartyId={lockedPartyId}
          />
        )}

        {/* Step 3: Election Group Selection */}
        {step === 3 && (
          <Step3
            elections={elections}
            selectedElectionIds={selectedElectionIds}
            setSelectedElectionIds={setSelectedElectionIds}
            appliedElectionGroupIds={appliedElectionGroupIds}
          />
        )}

        {/* Step 4: Agent Portrait / Photo Upload */}
        {step === 4 && (
          <Step4
            avatarUrl={avatarUrl || user?.avatar}
            isUploading={isUploading}
            handleUploadClick={handleUploadClick}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
          />
        )}

        {/* Step 5: Contact Numbers (Phone, WhatsApp, Data) */}
        {step === 5 && (
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

        {/* Step 6: Educational Level Status */}
        {step === 6 && (
          <EducationalStatusStep
            educationalStatus={educationalStatus}
            setEducationalStatus={setEducationalStatus}
          />
        )}

        {/* Step 7: Educational Institution & Degree Details */}
        {step === 7 && educationalStatus !== "none" && (
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

        {/* Step 8: Residential Address & Ward */}
        {step === 8 && (
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

        {/* Step 9: Polling Unit Search & Assignment */}
        {step === 9 && (
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

        {/* Step 10: Polling Agent Responsibilities */}
        {step === 10 && <Step7 />}

        {/* Step 11: Code of Conduct & Punctuality */}
        {step === 11 && <Step8 />}

        {/* Step 12: Neutrality & Integrity Commitment */}
        {step === 12 && <Step9 />}

        {/* Step 13: Compensation & Potential Payout Details */}
        {step === 13 && <Step10 />}

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

      {/* Sticky footer handling validation and step progression */}
      <ApplyFooter
        step={step}
        setStep={setStep}
        selectedPartyId={selectedPartyId}
        selectedElectionIds={selectedElectionIds}
        avatarUrl={avatarUrl}
        isUploading={isUploading}
        selectedStateId={selectedStateId}
        selectedLgaId={selectedLgaId}
        streetAddress={streetAddress}
        selectedPollingUnitId={selectedPollingUnitId}
        bankAccountNumber={bankAccountNumber}
        whatsappPhone={whatsappPhone}
        dataPhone={dataPhone}
        educationalStatus={educationalStatus}
        highestDegree={highestDegree}
        graduationYear={graduationYear}
        schoolName={schoolName}
        isSubmitting={isSubmitting}
        handleSubmit={handleSubmit}
        user={user}
        isValidatingAccount={isValidatingAccount}
        isAccountValid={isAccountValid}
      />
    </PageWrapper>
  );
}
