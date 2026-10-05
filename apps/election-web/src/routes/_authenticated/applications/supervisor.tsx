import { StickyFooter } from "#/components/Footers";
import { PageHeader } from "#/components/Headers";
import { useUser } from "#/hooks/useUser";
import { useUserParty } from "#/hooks/useUserParty";
import {
  getApplications,
  getLGAs,
  getWards,
  submitSupervisorApplication,
} from "#/lib/server/applications";
import { getElectionGroups } from "#/lib/server/election_groups";
import { confirmFileUpload, getPresignedUploadURL } from "#/lib/server/parties";
import { getPageHeader } from "#/lib/shared/meta";
import { AppAvatar } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { SelectableCard } from "@repo/ui/components/cards/Rewards";
import { DescriptiveText, TitleText } from "@repo/ui/components/custom/Texts";
import { Label } from "@repo/ui/components/input";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import { cn } from "@repo/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { parseAsInteger, useQueryState } from "nuqs";
import { useRef, useState } from "react";

/**
 * Route definition for party election supervisor application wizard.
 */
export const Route = createFileRoute("/_authenticated/applications/supervisor")(
  {
    head: () => getPageHeader({ title: "Apply as Supervisor" }),
    component: SupervisorPage,
  },
);

/** Supported supervisory administrative tiers */
export type SupervisorRoleType =
  | "state_election_supervisor"
  | "lga_election_supervisor"
  | "ward_election_supervisor";

/**
 * Multi-step wizard allowing accepted polling agents to upgrade their assignment
 * to a State, LGA, or Ward Election Supervisor.
 *
 * Steps:
 * 1. Eligibility Announcement & Confirmation
 * 2. Role Selection (State / LGA / Ward)
 * 3. Region Picker (Select assigned LGA or Ward, skipped for State)
 * 4. School / Degree Certificate Upload (R2 presigned upload)
 * 5. Application Accepted & Duty Checklist
 */
function SupervisorPage() {
  const navigate = useNavigate();
  const user = useUser();
  const { party } = useUserParty();

  // Wizard active step stored in URL query params (?step=1..5)
  const [step, setStep] = useQueryState(
    "step",
    parseAsInteger.withDefault(1).withOptions({ clearOnDefault: false }),
  );

  // Form selection state
  const [selectedRole, setSelectedRole] = useState<SupervisorRoleType | null>(
    null,
  );
  const [selectedLgaId, setSelectedLgaId] = useState<number | null>(null);
  const [selectedLgaName, setSelectedLgaName] = useState<string>("");
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);
  const [selectedWardName, setSelectedWardName] = useState<string>("");
  const [certificateUrl, setCertificateUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch accepted polling agent application to inherit the active election group
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

  const acceptedApp = applications.find(
    (app: any) => app.status === "accepted",
  );
  const activeElectionGroupId =
    acceptedApp?.election_group_id || acceptedApp?.election_group?.id || null;

  // Fetch upcoming election group metadata for display headers
  const { data: electionGroups = [] } = useQuery({
    queryKey: ["electionGroups", { upcoming: true }],
    queryFn: async () => {
      const res = await getElectionGroups({ data: { upcoming: true } });
      if (res?.success && res.data?.election_groups) {
        return res.data.election_groups;
      }
      return [];
    },
  });

  const currentElectionGroup = electionGroups.find(
    (eg: any) => eg.id === activeElectionGroupId,
  );
  const electionName = currentElectionGroup?.name || "2026 Election";

  // Mutation submitting supervisor upgrade application to backend
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!activeElectionGroupId || !selectedRole) {
        throw new Error("Missing election group or role selection.");
      }
      const stateId = user?.current_state || acceptedApp?.state_id || 1;

      const res = await submitSupervisorApplication({
        data: {
          election_group_id: activeElectionGroupId,
          role: selectedRole,
          state_id: stateId,
          lga_id: selectedLgaId || undefined,
          ward_id: selectedWardId || undefined,
          degree_certificate_url: certificateUrl || undefined,
        },
      });

      if (!res?.success) {
        throw new Error(
          res?.message || "Failed to submit supervisor application",
        );
      }
      return res;
    },
    onSuccess: () => {
      setStep(5);
    },
    onError: (err: any) => {
      setSubmitError(err.message || "Submission failed");
    },
  });

  // Direct upload pipeline: presigned URL -> Cloudflare R2 PUT -> confirmation
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
          folder: "certificates",
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
          throw new Error("Failed to upload certificate image");
        }

        await confirmFileUpload({ data: { id: file_id, success: true } });
        setCertificateUrl(public_url);
      } else {
        throw new Error("Presigned URL retrieval failed");
      }
    } catch (err) {
      console.warn("Upload failed, fallback to base64 preview:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCertificateUrl(reader.result as string);
      };
      reader.readAsDataURL(rawFile);
    } finally {
      setIsUploading(false);
    }
  };

  // State supervisor applies to entire state; LGA/Ward supervisors pick their district
  const handleNextFromRoleSelect = () => {
    if (selectedRole === "state_election_supervisor") {
      setStep(4); // Skip LGA/Ward selection for state supervisor
    } else {
      setStep(3); // Go to LGA or Ward selection
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-background">
      {/* Step 1: Promotion eligibility invitation */}
      {step === 1 && (
        <SupervisorEligibilityStep
          partyLogo={party?.logo}
          partyName={party?.short_name || party?.name || "NDC"}
          electionName={electionName}
          onYes={() => setStep(2)}
          onNo={() => navigate({ to: "/" })}
        />
      )}

      {/* Step 2: Supervisory tier selection */}
      {step === 2 && (
        <SupervisorRoleSelectStep
          partyLogo={party?.logo}
          partyName={party?.short_name || party?.name || "NDC"}
          selectedRole={selectedRole}
          onSelectRole={setSelectedRole}
          onContinue={handleNextFromRoleSelect}
          onBack={() => setStep(1)}
        />
      )}

      {/* Step 3 (LGA): Local Government Area selection */}
      {step === 3 && selectedRole === "lga_election_supervisor" && (
        <SupervisorRegionSelectStep
          roleName="LGA Supervisor"
          partyLogo={party?.logo}
          partyName={party?.short_name || party?.name || "NDC"}
          stateId={user?.current_state || 1}
          selectedId={selectedLgaId}
          onSelect={(id, name) => {
            setSelectedLgaId(id);
            setSelectedLgaName(name);
          }}
          onContinue={() => setStep(4)}
          onBack={() => setStep(2)}
          type="lga"
        />
      )}

      {/* Step 3 (Ward): Electoral ward selection */}
      {step === 3 && selectedRole === "ward_election_supervisor" && (
        <SupervisorRegionSelectStep
          roleName="Ward Supervisor"
          partyLogo={party?.logo}
          partyName={party?.short_name || party?.name || "NDC"}
          stateId={user?.current_state || 1}
          lgaId={user?.current_lga || undefined}
          selectedId={selectedWardId}
          onSelect={(id, name) => {
            setSelectedWardId(id);
            setSelectedWardName(name);
          }}
          onContinue={() => setStep(4)}
          onBack={() => setStep(2)}
          type="ward"
        />
      )}

      {/* Step 4: Degree / Educational certificate upload */}
      {step === 4 && (
        <SupervisorCertificateUploadStep
          roleName={
            selectedRole === "state_election_supervisor"
              ? "State Supervisor"
              : selectedRole === "lga_election_supervisor"
                ? "LGA Supervisor"
                : "Ward Supervisor"
          }
          partyLogo={party?.logo}
          partyName={party?.short_name || party?.name || "NDC"}
          certificateUrl={certificateUrl}
          isUploading={isUploading}
          submitError={submitError}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          onSubmit={() => submitMutation.mutate()}
          isSubmitting={submitMutation.isPending}
          onBack={() =>
            selectedRole === "state_election_supervisor"
              ? setStep(2)
              : setStep(3)
          }
        />
      )}

      {/* Step 5: Application accepted & election day duties */}
      {step === 5 && (
        <SupervisorSuccessStep
          roleName={
            selectedRole === "state_election_supervisor"
              ? "State Supervisor"
              : selectedRole === "lga_election_supervisor"
                ? "LGA Supervisor"
                : "Ward Supervisor"
          }
          partyLogo={party?.logo}
          regionName={
            selectedRole === "state_election_supervisor"
              ? "State Level"
              : selectedRole === "lga_election_supervisor"
                ? selectedLgaName || "LGA Level"
                : selectedWardName || "Ward Level"
          }
          stateName={user?.current_state ? "Abuja FCT" : "State"}
          onGoHome={() => navigate({ to: "/" })}
        />
      )}
    </div>
  );
}

// ------------------- STEP 1: ELIGIBILITY ANNOUNCEMENT -------------------
/**
 * Step 1: Informs the polling agent of their eligibility to become a party supervisor
 * and asks if they wish to accept the upgrade.
 */
function SupervisorEligibilityStep({
  partyLogo,
  partyName,
  electionName,
  onYes,
  onNo,
}: {
  partyLogo?: string;
  partyName: string;
  electionName: string;
  onYes: () => void;
  onNo: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full flex flex-col justify-between min-h-screen">
      <PageHeader onBackClick={() => navigate({ to: "/" })} />

      <div className="flex flex-col items-start px-5 pt-4 max-w-[430px] mx-auto w-full flex-1">
        {/* Party branding banner */}
        <div className="flex items-center gap-2 mb-4">
          <AppAvatar src={partyLogo} alt={partyName} className="size-7" />
          <span className="text-c-60 font-semibold text-sm">{partyName}</span>
        </div>

        <h1 className="text-3xl font-extrabold text-c-90 leading-tight">
          You Are Eligible To Become A Party Election Supervisor.
        </h1>
        <h2 className="text-3xl font-extrabold text-purple mt-1 leading-tight">
          Would you like to be upgraded from being a polling agent?
        </h2>

        <p className="text-c-50 text-sm mt-3 font-medium">{electionName}</p>

        {/* Promotional graphic illustration */}
        <div className="w-full mt-6 flex justify-center">
          <img
            src="https://res.cloudinary.com/dhtcwqsx4/image/upload/v1785351028/Free9ja/QmRzN4MTmLCH5RZgH6TaYgP1w5hA4GUBft2AxUhkuatMDk-Photoroom_pmhczu.webp"
            alt="Supervisors Illustration"
            className="w-[280px] object-contain"
          />
        </div>
      </div>

      <StickyFooter className="pb-14 bg-background flex flex-col gap-3 max-w-[430px] mx-auto w-full px-5">
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full h-14 font-bold text-lg"
          onClick={onYes}
        >
          Yes
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="4xl"
          className="w-full rounded-full h-14 bg-c-10 text-c-80 font-bold text-lg hover:bg-c-20"
          onClick={onNo}
        >
          No
        </Button>
      </StickyFooter>
    </div>
  );
}

// ------------------- STEP 2: PICK A ROLE -------------------
/**
 * Step 2: Allows the applicant to choose their supervisory tier (State, LGA, or Ward).
 */
function SupervisorRoleSelectStep({
  partyLogo,
  partyName,
  selectedRole,
  onSelectRole,
  onContinue,
  onBack,
}: {
  partyLogo?: string;
  partyName: string;
  selectedRole: SupervisorRoleType | null;
  onSelectRole: (role: SupervisorRoleType) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="w-full h-full flex flex-col justify-between min-h-screen">
      <PageHeader onBackClick={onBack} />

      <div className="flex flex-col items-start px-5 pt-2 max-w-[430px] mx-auto w-full flex-1">
        {/* Party branding banner */}
        <div className="flex items-center gap-2 mb-3">
          <AppAvatar src={partyLogo} alt={partyName} className="size-7" />
          <span className="text-c-60 font-semibold text-sm">{partyName}</span>
        </div>

        <TitleText text="Pick a Role" size="xl" className="text-c-90" />
        <DescriptiveText
          text="Choose anyone of the election supervisory roles still available."
          size="sm"
          className="mt-1"
        />

        {/* Role selection card list */}
        <div className="w-full space-y-3 mt-6">
          <SelectableCard
            title="State Supervisors"
            subtitle="Already Full"
            isSelected={selectedRole === "state_election_supervisor"}
            onClick={() => onSelectRole("state_election_supervisor")}
            className={cn(
              selectedRole === "state_election_supervisor" &&
                "border-emerald-500 bg-emerald-50/50",
            )}
          />
          <SelectableCard
            title="LGA Supervisors"
            subtitle="Oversees Ward Supervisors in lga."
            isSelected={selectedRole === "lga_election_supervisor"}
            onClick={() => onSelectRole("lga_election_supervisor")}
            className={cn(
              selectedRole === "lga_election_supervisor" &&
                "border-emerald-500 bg-emerald-50/50",
            )}
          />
          <SelectableCard
            title="Ward Supervisors"
            subtitle="Oversee Polling Agents in ward."
            isSelected={selectedRole === "ward_election_supervisor"}
            onClick={() => onSelectRole("ward_election_supervisor")}
            className={cn(
              selectedRole === "ward_election_supervisor" &&
                "border-emerald-500 bg-emerald-50/50",
            )}
          />
        </div>
      </div>

      <StickyFooter className="pb-14 bg-background max-w-[430px] mx-auto w-full px-5">
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full h-14 font-bold text-lg"
          disabled={!selectedRole}
          onClick={onContinue}
        >
          Continue
        </Button>
      </StickyFooter>
    </div>
  );
}

// ------------------- STEP 3: SELECT REGION (LGA or WARD) -------------------
/**
 * Step 3: Geographical boundary picker.
 * Dynamically queries and lists either LGAs or Wards depending on the `type` parameter.
 */
function SupervisorRegionSelectStep({
  roleName,
  partyLogo,
  partyName,
  stateId,
  lgaId,
  selectedId,
  onSelect,
  onContinue,
  onBack,
  type,
}: {
  roleName: string;
  partyLogo?: string;
  partyName: string;
  stateId: number;
  lgaId?: number;
  selectedId: number | null;
  onSelect: (id: number, name: string) => void;
  onContinue: () => void;
  onBack: () => void;
  type: "lga" | "ward";
}) {
  // Query either all LGAs in state, or all Wards in LGA
  const { data: regions = [], isLoading } = useQuery({
    queryKey: [type === "lga" ? "lgas" : "wards", stateId, lgaId],
    queryFn: async () => {
      if (type === "lga") {
        const res = await getLGAs({ data: { stateID: stateId } });
        return res?.success && res.data?.lgas ? res.data.lgas : [];
      } else {
        const res = await getWards({
          data: { lgaID: lgaId, stateID: stateId },
        });
        return res?.success && res.data?.wards ? res.data.wards : [];
      }
    },
  });

  return (
    <div className="w-full h-full flex flex-col justify-between min-h-screen">
      <PageHeader onBackClick={onBack} />

      <div className="flex flex-col items-start px-5 pt-2 max-w-[430px] mx-auto w-full flex-1">
        {/* Party and role header badge */}
        <div className="flex items-center gap-2 mb-3">
          <AppAvatar src={partyLogo} alt={partyName} className="size-7" />
          <span className="text-c-60 font-semibold text-sm">{roleName}</span>
        </div>

        <TitleText
          text={type === "lga" ? "Select LGA" : "Select Ward"}
          size="xl"
          className="text-c-90 uppercase"
        />
        <DescriptiveText
          text="Choose whichever you would like to supervise."
          size="sm"
          className="mt-1"
        />

        {/* Region selectable cards */}
        <div className="w-full space-y-3 mt-6">
          {isLoading && (
            <p className="text-c-50 text-sm text-center py-4">
              Loading options...
            </p>
          )}
          {!isLoading && regions.length === 0 && (
            <p className="text-c-50 text-sm text-center py-4">
              No available regions found.
            </p>
          )}
          {regions.map((item: any) => {
            const isSelected = item.id === selectedId;
            return (
              <SelectableCard
                key={item.id}
                title={item.name.toUpperCase()}
                subtitle="Abuja FCT"
                isSelected={isSelected}
                onClick={() => onSelect(item.id, item.name)}
                className={cn(
                  isSelected &&
                    "border-emerald-500 bg-emerald-100/70 text-emerald-950",
                )}
              />
            );
          })}
        </div>
      </div>

      <StickyFooter className="pb-14 bg-background max-w-[430px] mx-auto w-full px-5">
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full h-14 font-bold text-lg"
          disabled={!selectedId}
          onClick={onContinue}
        >
          Continue
        </Button>
      </StickyFooter>
    </div>
  );
}

// ------------------- STEP 4: CERTIFICATE UPLOAD -------------------
/**
 * Step 4: Verification credential upload.
 * Applicants upload a photo or scan of their educational degree / school certificate.
 */
function SupervisorCertificateUploadStep({
  roleName,
  partyLogo,
  partyName,
  certificateUrl,
  isUploading,
  submitError,
  fileInputRef,
  onFileChange,
  onSubmit,
  isSubmitting,
  onBack,
}: {
  roleName: string;
  partyLogo?: string;
  partyName: string;
  certificateUrl: string;
  isUploading: boolean;
  submitError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  onBack: () => void;
}) {
  return (
    <div className="w-full h-full flex flex-col justify-between min-h-screen">
      <PageHeader onBackClick={onBack} />

      <div className="flex flex-col items-start px-5 pt-2 max-w-[430px] mx-auto w-full flex-1">
        {/* Party and role header badge */}
        <div className="flex items-center gap-2 mb-3">
          <AppAvatar src={partyLogo} alt={partyName} className="size-7" />
          <span className="text-c-60 font-semibold text-sm">{roleName}</span>
        </div>

        <TitleText
          text="Upload Your School Certificate"
          size="xl"
          className="text-c-90"
        />
        <DescriptiveText
          text="Take a clear picture of it and upload."
          size="sm"
          className="mt-1"
        />

        {/* Hidden file input for camera/gallery upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={onFileChange}
        />

        {/* Certificate preview or upload prompt card */}
        <div className="w-full mt-6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-full h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors",
              certificateUrl
                ? "border-emerald-500 bg-emerald-50/50"
                : "border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50",
            )}
          >
            {certificateUrl ? (
              <img
                src={certificateUrl}
                alt="Certificate preview"
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <>
                <Upload className="size-8 text-emerald-700" />
                <span className="font-bold text-emerald-800 text-lg">
                  {isUploading ? "Uploading..." : "Upload Certificate"}
                </span>
              </>
            )}
          </button>

          {submitError && (
            <p className="text-red-500 text-sm mt-3 font-medium text-center">
              {submitError}
            </p>
          )}

          {!submitError && (
            <p className="text-red-500 text-xs mt-2 text-center font-medium">
              Please upload a clear photo of it.
            </p>
          )}
        </div>
      </div>

      <StickyFooter className="pb-14 bg-background max-w-[430px] mx-auto w-full px-5">
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full h-14 font-bold text-lg bg-emerald-500 hover:bg-emerald-600 text-white"
          disabled={!certificateUrl || isUploading || isSubmitting}
          onClick={onSubmit}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </StickyFooter>
    </div>
  );
}

// ------------------- STEP 5: APPLICATION ACCEPTED -------------------
/**
 * Step 5: Congratulations screen confirming the supervisor role assignment.
 * Displays the assigned region and the primary election day supervisory responsibilities.
 */
function SupervisorSuccessStep({
  roleName,
  partyLogo,
  regionName,
  stateName,
  onGoHome,
}: {
  roleName: string;
  partyLogo?: string;
  regionName: string;
  stateName: string;
  onGoHome: () => void;
}) {
  // Checklist duty bullet item
  const Todo = ({ text }: { text: string }) => (
    <div className="flex gap-4 py-2.5 items-start">
      <div className="size-6 rounded-full bg-c-20 shrink-0 mt-1" />
      <p className="text-base leading-snug text-c-60 font-medium">{text}</p>
    </div>
  );

  return (
    <div className="relative w-full h-full flex flex-col justify-between min-h-screen">
      <PageHeader onBackClick={onGoHome} />

      <div className="flex-1 flex flex-col items-center gap-6 px-5 max-w-[430px] mx-auto w-full overflow-y-auto pb-32">
        <div className="mt-2 flex flex-col items-center">
          <AppAvatar src={partyLogo} alt="Party Logo" className="size-14" />
          <TitleText
            text="Congratulations!"
            size="xl"
            className="text-center text-c-90 mt-4 text-3xl font-extrabold"
          />
          <DescriptiveText
            text="Your application has been accepted."
            className="text-center text-c-60 mt-1 text-base font-medium"
          />
        </div>

        {/* Role Assigned Info Card */}
        <div className="w-full bg-amber-100/70 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">👦🏽</span>
            <span className="text-c-60 font-medium text-base">
              Role Assigned
            </span>
          </div>
          <span className="font-bold text-c-90 text-lg">{roleName}</span>
        </div>

        {/* Region / Jurisdiction Card */}
        <div className="w-full space-y-2">
          <span className="text-base font-bold text-c-80 block">
            Your LGA / Region
          </span>
          <div className="px-4 py-4 border border-c-40 rounded-2xl bg-white shadow-sm flex items-center gap-4">
            <PollingUnitIcon className="shrink-0 size-8 text-cyan-600" />
            <div className="space-y-0.5">
              <p className="font-bold text-c-90 text-lg leading-tight">
                {regionName}
              </p>
              <span className="text-c-50 text-sm block">
                State: {stateName}
              </span>
            </div>
          </div>
        </div>

        {/* Supervisory Election Day Duties List */}
        <div className="space-y-2 w-full">
          <span className="text-base font-bold text-c-80 block">
            Your Election Day Duties
          </span>
          <div className="space-y-1">
            <Todo text="Call all ward supervisors under you to ensure they are doing their duties on election day." />
            <Todo text="Complete all your election task shown on your dashboard." />
            <Todo text="Request payment from party after election is concluded." />
          </div>
        </div>
      </div>

      <StickyFooter className="pb-14 bg-background max-w-[430px] mx-auto w-full px-5">
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full h-14 font-bold text-lg"
          onClick={onGoHome}
        >
          Go home
        </Button>
      </StickyFooter>
    </div>
  );
}
