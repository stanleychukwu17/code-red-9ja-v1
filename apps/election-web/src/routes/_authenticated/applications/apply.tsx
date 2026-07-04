import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAppSelector } from "#/redux/hooks";
import { AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  getParties,
  getPresignedUploadURL,
  confirmFileUpload,
} from "#/lib/server/parties";
import { getElectionGroups } from "#/lib/server/election_groups";
import { getPollingUnits } from "#/lib/server/polling_units";
import { submitPollingAgentApplication, getApplications } from "#/lib/server/applications";
import { getPageHeader } from "#/lib/shared/meta";
import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import { ApplySuccess } from "./components/ApplySuccess";
import { ApplyFooter } from "./components/ApplyFooter";
import {
  Step1,
  Step2,
  Step3,
  Step4,
  Step5,
  Step6,
  Step7,
  Step8,
  Step9,
  Step10,
  Step11,
} from "./components/ApplySteps";

export const Route = createFileRoute("/_authenticated/applications/apply")({
  head: () => getPageHeader({ title: "Apply as Polling Unit Agent" }),
  component: ApplyPage,
});

function ApplyPage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  // Form states
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [selectedElectionIds, setSelectedElectionIds] = useState<number[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [selectedLgaId, setSelectedLgaId] = useState<number | null>(null);
  const [streetAddress, setStreetAddress] = useState<string>("");
  const [selectedPollingUnitId, setSelectedPollingUnitId] = useState<
    number | null
  >(null);
  const [bankAccountNumber, setBankAccountNumber] = useState<string>("");
  const [selectedBankCode, setSelectedBankCode] = useState<string>("058");
  const [bankDropdownOpen, setBankDropdownOpen] = useState<boolean>(false);

  // UI state
  const [step, setStep] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // React Query calls
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

  const { data: elections = [] } = useQuery({
    queryKey: ["electionGroups"],
    queryFn: async () => {
      const res = await getElectionGroups();
      if (res?.success && res.data?.election_groups && res.data.election_groups.length > 0) {
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

  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await getApplications();
      if (res?.success && res.data?.applications) {
        return res.data.applications;
      }
      return [];
    }
  });

  const appliedElectionGroupIds = applications
    .filter((app: any) => ["pending", "approved", "success", "accepted"].includes(app.status))
    .map((app: any) => app.election_group_id || app.election_group?.id)
    .filter(Boolean);

  const lockedPartyId = (() => {
    // Check if the user has an active application to a particular party for an election group that is today or in the future
    const activeApp = applications.find((app: any) => {
      const isActive = ["pending", "approved", "success", "accepted"].includes(app.status);
      if (!isActive) return false;
      
      let electionDateStr;
      if (app.election_date && typeof app.election_date === 'object') {
        if (app.election_date.Valid) {
          electionDateStr = app.election_date.Time;
        } else {
          electionDateStr = "2099-12-31T00:00:00Z"; // Assume future if not set
        }
      } else {
        electionDateStr = app.election_date;
      }

      if (!electionDateStr) {
        electionDateStr = "2099-12-31T00:00:00Z"; // Assume future if not set
      }

      const electionDate = new Date(electionDateStr);
      // Remove time part of today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return electionDate >= today;
    });
    return activeApp ? (activeApp.party_id || activeApp.party?.id) : null;
  })();

  // Automatically select the locked party if it exists and hasn't been selected yet
  useEffect(() => {
    if (lockedPartyId && !selectedPartyId) {
      setSelectedPartyId(lockedPartyId);
    }
  }, [lockedPartyId, selectedPartyId, setSelectedPartyId]);

  const { data: pollingUnits = [] } = useQuery({
    queryKey: ["pollingUnits", selectedLgaId],
    queryFn: async () => {
      if (!selectedLgaId) return [];
      const res = await getPollingUnits({ data: { localGovernmentId: selectedLgaId } });
      if (res && res.success && res.data?.polling_units && res.data.polling_units.length > 0) {
        return res.data.polling_units;
      }
      if (res && res.polling_units && res.polling_units.length > 0) {
        return res.polling_units;
      }
      return [];
    },
    enabled: !!selectedLgaId,
  });

  // Reset LGA selection when state changes
  useEffect(() => {
    setSelectedLgaId(null);
  }, [selectedStateId]);

  // Load Polling Units when LGA changes
  useEffect(() => {
    if (pollingUnits && pollingUnits.length > 0) {
      setSelectedPollingUnitId(pollingUnits[0].id);
    } else {
      setSelectedPollingUnitId(null);
    }
  }, [pollingUnits]);

  const getWardName = (unit: any) => {
    if (unit.ward_name) return unit.ward_name;
    if (unit.ward?.name) return unit.ward.name;
    if (unit.ward?.String) return unit.ward.String;
    return "Unknown Ward";
  };

  // File Upload logic
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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

  // Submit flow using useMutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (
        !selectedPartyId ||
        selectedElectionIds.length === 0 ||
        !selectedStateId ||
        !selectedLgaId ||
        !streetAddress ||
        !selectedPollingUnitId ||
        !bankAccountNumber ||
        bankAccountNumber.length !== 10 ||
        !avatarUrl
      ) {
        throw new Error("Please fill out all required fields.");
      }

      const response = await submitPollingAgentApplication({
        data: {
          party_id: selectedPartyId,
          election_group_ids: selectedElectionIds,
          polling_unit_id: Number(selectedPollingUnitId),
          avatar: avatarUrl,
          current_country: 1,
          current_state: selectedStateId,
          current_lga: selectedLgaId,
          current_city: 0,
          bank_account_number: bankAccountNumber,
          bank_code: selectedBankCode,
        },
      });

      if (!response.success && response.status !== "success") {
        throw new Error(response.message || "Failed to submit application. Please check your inputs.");
      }
      return response;
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (err: any) => {
      setSubmitError(err.message || "Connection error. Unable to reach the server.");
    }
  });

  const isSubmitting = submitMutation.isPending;
  const handleSubmit = () => submitMutation.mutate();

  // Filter parties based on search query
  const filteredParties = parties.filter(
    (p: any) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.short_name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleBackClick = () => {
    if (step === 1) {
      navigate({ to: "/home" });
    } else {
      setStep(step - 1);
    }
  };

  if (success) {
    return <ApplySuccess />;
  }

  return (
    <PageWrapper>
      <div className="flex flex-col flex-1 pb-24">
        <PageHeader onBackClick={handleBackClick} />

        {submitError && (
          <div className="p-4 mx-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm flex gap-3 items-center mb-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {step === 1 && <Step1 />}
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
        {step === 3 && (
          <Step3
            elections={elections}
            selectedElectionIds={selectedElectionIds}
            setSelectedElectionIds={setSelectedElectionIds}
            appliedElectionGroupIds={appliedElectionGroupIds}
          />
        )}
        {step === 4 && (
          <Step4
            avatarUrl={avatarUrl}
            isUploading={isUploading}
            handleUploadClick={handleUploadClick}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
          />
        )}
        {step === 5 && (
          <Step5
            selectedStateId={selectedStateId}
            setSelectedStateId={setSelectedStateId}
            selectedLgaId={selectedLgaId}
            setSelectedLgaId={setSelectedLgaId}
            streetAddress={streetAddress}
            setStreetAddress={setStreetAddress}
          />
        )}
        {step === 6 && (
          <Step6
            pollingUnits={pollingUnits}
            selectedPollingUnitId={selectedPollingUnitId}
            setSelectedPollingUnitId={setSelectedPollingUnitId}
            getWardName={getWardName}
          />
        )}
        {step === 7 && <Step7 />}
        {step === 8 && <Step8 />}
        {step === 9 && <Step9 />}
        {step === 10 && <Step10 />}
        {step === 11 && (
          <Step11
            bankAccountNumber={bankAccountNumber}
            setBankAccountNumber={setBankAccountNumber}
            selectedBankCode={selectedBankCode}
            setSelectedBankCode={setSelectedBankCode}
            bankDropdownOpen={bankDropdownOpen}
            setBankDropdownOpen={setBankDropdownOpen}
            user={user}
          />
        )}
      </div>

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
        isSubmitting={isSubmitting}
        handleSubmit={handleSubmit}
      />
    </PageWrapper>
  );
}
