import { getPageHeader } from "#/lib/shared/meta";
import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import { useAgentDutyEligibility } from "#/hooks/useAgentDutyEligibility";
import { useGeolocation } from "#/hooks/useGeolocation";
import { UpdateMessageInputs } from "../give-update/-components/UpdateMessageInputs";
import { MediaAttachmentActions, type AttachedMedia } from "../give-update/-components/MediaAttachmentActions";
import { LocationStatusBanner } from "../give-update/-components/LocationStatusBanner";
import { MissingLocationAlertDialog } from "../give-update/-components/MissingLocationAlertDialog";
import { createSupervisorUpdate } from "#/lib/server/supervisor_updates";
import { getPollingUnits } from "#/lib/server/polling_units";
import { Button } from "@repo/ui/components/button";
import { convertToWebP } from "@repo/ui/lib/image";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Eye, Truck, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/supervisor-update/")({
  head: () => getPageHeader({ title: "Supervisor Update" }),
  component: SupervisorUpdatePage,
});

const CATEGORIES = [
  { id: "collation_centre", label: "Collation Centre", icon: Building2, desc: "RAC or Collation Centre activities" },
  { id: "field_monitoring", label: "Field Monitoring", icon: Eye, desc: "General inspection across polling units" },
  { id: "logistics", label: "Logistics", icon: Truck, desc: "Material shortages, BVAS, or deployment" },
  { id: "security", label: "Security", icon: ShieldAlert, desc: "Violence, intimidation, or disruptions" },
];

const STAGES_BY_CATEGORY: Record<string, { id: string; label: string }[]> = {
  collation_centre: [
    { id: "arrival_at_collation", label: "Arrived at Collation Centre" },
    { id: "materials_receipt", label: "Receiving PU Results (EC8A)" },
    { id: "collation_ongoing", label: "Collation In Progress" },
    { id: "collation_disputed", label: "Result Disputed / Objections" },
    { id: "collation_concluded", label: "Collation Concluded (EC8B/C Signed)" },
  ],
  field_monitoring: [
    { id: "voting_monitoring", label: "Accreditation & Voting Inspection" },
    { id: "agent_coordination", label: "Agent Coordination / Status Check" },
    { id: "materials_arrived", label: "Materials Arrival Verified" },
    { id: "incident_intervened", label: "Incident Intervened & Resolved" },
  ],
  logistics: [
    { id: "material_shortage", label: "Material Shortage (Ballots, EC8A)" },
    { id: "bvas_malfunction", label: "Widespread BVAS Device Failure" },
    { id: "late_arrival", label: "Late Arrival of INEC Officials" },
  ],
  security: [
    { id: "violence_disruption", label: "Violence / Thuggery" },
    { id: "snatching", label: "Ballot / BVAS Snatching" },
    { id: "intimidation", label: "Voter / Agent Intimidation" },
  ],
};

function SupervisorUpdatePage() {
  const navigate = useNavigate();

  // Supervisor duty eligibility guard
  const {
    validateEligibility,
    isElectionMismatch,
    electionDay,
    daysLeft,
    supervisorAssignment,
    selectedElectionGroup,
  } = useAgentDutyEligibility({ dutyName: "Supervisor updates", roleType: "supervisor" });

  const currentAssignment = supervisorAssignment?.data;
  const roleType = supervisorAssignment?.type;

  // Selected Category & Stage
  const [selectedCategory, setSelectedCategory] = useState<string>("collation_centre");
  const [selectedStage, setSelectedStage] = useState<string>("arrival_at_collation");

  // Optional Polling Unit Tag
  const [selectedPollingUnitId, setSelectedPollingUnitId] = useState<number | undefined>(undefined);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [mediaList, setMediaList] = useState<AttachedMedia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User device geolocation hook
  const { geoCoords, isLocating, geoError, requestLocation } = useGeolocation();
  const [showLocationWarningDialog, setShowLocationWarningDialog] = useState(false);

  // Fetch polling units under supervisor's ward / LGA for optional tagging
  const wardId = currentAssignment?.ward_id;
  const lgaId = currentAssignment?.lga_id;

  const { data: puData } = useQuery({
    queryKey: ["supervisorPUs", wardId, lgaId],
    queryFn: () => getPollingUnits({ data: { ward_id: wardId, lga_id: lgaId } }),
    enabled: Boolean(wardId || lgaId),
  });

  const pollingUnitsList = puData?.data || [];

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    const stages = STAGES_BY_CATEGORY[catId];
    if (stages && stages.length > 0) {
      setSelectedStage(stages[0]!.id);
    }
  };

  const submitUpdate = async () => {
    if (!validateEligibility()) {
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter an update message or description.");
      return;
    }

    if (!selectedElectionGroup?.id) {
      toast.error("No active election group detected.");
      return;
    }

    setIsSubmitting(true);

    try {
      const processedMedia: { url: string; media_type: "image" | "video" | "audio" }[] = [];

      for (const m of mediaList) {
        if (m.type === "image" && m.file instanceof File) {
          try {
            const compressed = await convertToWebP(m.file, 0.85, 1280);
            processedMedia.push({
              url: m.url || URL.createObjectURL(compressed),
              media_type: "image",
            });
          } catch {
            processedMedia.push({
              url: m.url,
              media_type: "image",
            });
          }
        } else {
          processedMedia.push({
            url: m.url,
            media_type: m.type as "image" | "video" | "audio",
          });
        }
      }

      const res = await createSupervisorUpdate({
        data: {
          election_group_id: selectedElectionGroup.id,
          category_type: selectedCategory,
          stage: selectedStage,
          title: title.trim() || undefined,
          message: message.trim(),
          polling_unit_id: selectedPollingUnitId,
          media: processedMedia,
          latitude: geoCoords.latitude ?? undefined,
          longitude: geoCoords.longitude ?? undefined,
          accuracy_meters: geoCoords.accuracy ?? undefined,
        },
      });

      if (!res || !res.success) {
        toast.error(res?.message || "Failed to submit supervisor update.");
        return;
      }

      toast.success("Supervisor update submitted successfully!");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit update.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostClick = () => {
    if (!validateEligibility()) {
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter an update message.");
      return;
    }

    if (!geoCoords.latitude || !geoCoords.longitude) {
      setShowLocationWarningDialog(true);
      return;
    }

    submitUpdate();
  };

  const jurisdictionLabel = (() => {
    if (!currentAssignment) return "Supervisor Duty";
    if (roleType === "ward") {
      return `Ward Supervisor • ${currentAssignment.ward_name || "Ward"}, ${currentAssignment.lga_name || ""}`;
    }
    if (roleType === "lga") {
      return `LGA Supervisor • ${currentAssignment.lga_name || "LGA"}, ${currentAssignment.state_name || ""}`;
    }
    return `State Supervisor • ${currentAssignment.state_name || "State"}`;
  })();

  const currentStages = STAGES_BY_CATEGORY[selectedCategory] || [];

  return (
    <PageWrapper>
      <PageHeader onBackClick={() => navigate({ to: "/" })} />

      <div className="px-4 py-2 space-y-6 max-w-2xl md:min-w-200 mx-auto">
        {/* Jurisdiction badge */}
        <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
              {jurisdictionLabel}
            </div>
            <div className="text-sm text-foreground/80 font-medium mt-0.5">
              {selectedElectionGroup?.name || "Active Election"}
            </div>
          </div>
          <span className="text-xs bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 font-bold px-2 py-1 rounded-md">
            Supervisor
          </span>
        </div>

        {/* Location Status Banner */}
        <LocationStatusBanner
          geoCoords={geoCoords}
          isLocating={isLocating}
          geoError={geoError}
          onRequestLocation={requestLocation}
        />

        {/* Category Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Update Category
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? "border-purple-600 bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 shadow-xs"
                      : "border-border hover:bg-muted/50 text-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <Icon className={`size-5 ${isSelected ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"}`} />
                    {isSelected && <CheckCircle2 className="size-4 text-purple-600" />}
                  </div>
                  <span className="font-semibold text-sm leading-tight">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stage Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Current Stage / Milestone
          </label>
          <div className="flex flex-wrap gap-2">
            {currentStages.map((stage) => {
              const isSelected = selectedStage === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setSelectedStage(stage.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                      : "bg-background border-border hover:bg-muted text-foreground"
                  }`}
                >
                  {stage.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Polling Unit Tag */}
        {pollingUnitsList.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between">
              <span>Specific Polling Unit (Optional)</span>
              {selectedPollingUnitId && (
                <button
                  type="button"
                  onClick={() => setSelectedPollingUnitId(undefined)}
                  className="text-xs text-purple-600 underline hover:text-purple-700 cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </label>
            <select
              value={selectedPollingUnitId || ""}
              onChange={(e) => setSelectedPollingUnitId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="">General (Area-wide / Entire {roleType === "ward" ? "Ward" : "LGA"})</option>
              {pollingUnitsList.map((pu: any) => (
                <option key={pu.id} value={pu.id}>
                  {pu.pu_code ? `[${pu.pu_code}] ` : ""}{pu.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Title & Message inputs */}
        <UpdateMessageInputs
          title={title}
          onTitleChange={setTitle}
          message={message}
          onMessageChange={setMessage}
        />

        {/* Media Attachments */}
        <MediaAttachmentActions
          mediaList={mediaList}
          onMediaListChange={setMediaList}
        />

        {/* Primary CTA */}
        <div className="pt-4 pb-16">
          <Button
            type="button"
            variant="purple"
            size="2xl"
            disabled={isSubmitting}
            className="rounded-full px-8 py-6 text-base font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            onClick={handlePostClick}
          >
            <span className="text-xl leading-none font-bold">+</span>
            <span>{isSubmitting ? "Posting update..." : "Post supervisor update"}</span>
          </Button>
        </div>
      </div>

      {/* Missing Location Warning */}
      <MissingLocationAlertDialog
        open={showLocationWarningDialog}
        onOpenChange={setShowLocationWarningDialog}
        onEnableLocation={requestLocation}
        onConfirmSubmit={submitUpdate}
      />
    </PageWrapper>
  );
}
