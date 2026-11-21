import { getPageHeader } from "#/lib/shared/meta";
import { APP_URL } from "#/lib/config";
import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import { useAgentDutyEligibility } from "#/hooks/useAgentDutyEligibility";
import { useAssignments } from "#/hooks/useAssignments";
import { useGeolocation } from "#/hooks/useGeolocation";
import { UpdateMessageInputs } from "../give-update/-components/UpdateMessageInputs";
import { MediaAttachmentActions, type AttachedMedia } from "../give-update/-components/MediaAttachmentActions";
import { LocationStatusBanner } from "../give-update/-components/LocationStatusBanner";
import { MissingLocationAlertDialog } from "../give-update/-components/MissingLocationAlertDialog";
import { VotingStatusSelects } from "../give-update/-components/VotingStatusSelects";
import { VotingIssueSelects } from "../give-update/-components/VotingIssueSelects";
import { ElectionDayBanner, ElectionMismatchBanner } from "../give-update/index";
import { STATIC_STATUS_CATEGORIES } from "#/lib/constants/update-options";
import { createSupervisorUpdate } from "#/lib/server/supervisor_updates";
import { getPollingUnits } from "#/lib/server/polling_units";
import { Button } from "@repo/ui/components/button";
import { HeaderAccent } from "@repo/ui/components/header-accent";
import { convertToWebP } from "@repo/ui/lib/image";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/supervisor-update/")({
  head: () => getPageHeader({ title: "Supervisor Update" }),
  component: SupervisorUpdatePage,
});

function SupervisorUpdatePage() {
  const navigate = useNavigate();
  const { pollingUnitAssignment, isLoading: assignmentsLoading } = useAssignments();

  // Supervisor duty eligibility guard
  const {
    validateEligibility,
    isElectionMismatch,
    electionDay,
    daysLeft,
    supervisorAssignment,
    selectedElectionGroup,
  } = useAgentDutyEligibility({ dutyName: "Supervisor updates", roleType: "supervisor" });

  useEffect(() => {
    if (!assignmentsLoading && !supervisorAssignment) {
      navigate({ to: pollingUnitAssignment ? APP_URL.giveUpdate : APP_URL.home, replace: true });
    }
  }, [assignmentsLoading, supervisorAssignment, pollingUnitAssignment, navigate]);

  const currentAssignment = supervisorAssignment?.data;
  const roleType = supervisorAssignment?.type;

  // Supervisor update category (defaults to Collation Centre - id 9) and optional sub-option
  const [selectedStatusCategoryId, setSelectedStatusCategoryId] = useState<number>(9);
  const [selectedStatusOptionId, setSelectedStatusOptionId] = useState<number | undefined>(undefined);

  // Issue Action & selected supervisor issue options
  const [issueActionValue, setIssueActionValue] = useState<string>("none");
  const [selectedIssueOptionIds, setSelectedIssueOptionIds] = useState<number[]>([]);

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
    staleTime: Infinity,
  });

  const pollingUnitsList = puData?.data || [];

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

      const activeCategory = STATIC_STATUS_CATEGORIES.find((c) => c.id === selectedStatusCategoryId);
      const activeOption = activeCategory?.options.find((o) => o.id === selectedStatusOptionId);

      const res = await createSupervisorUpdate({
        data: {
          election_group_id: selectedElectionGroup.id,
          category_type: activeCategory?.slug || "field_monitoring",
          stage: activeOption?.name || activeCategory?.slug || "field_monitoring",
          title: title.trim() || undefined,
          message: message.trim(),
          polling_unit_id: selectedPollingUnitId,
          media: processedMedia,
          latitude: geoCoords.latitude,
          longitude: geoCoords.longitude,
          accuracy_meters: geoCoords.accuracyMeters,
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

  return (
    <PageWrapper>
      <PageHeader onBackClick={() => navigate({ to: "/" })} />

      <div className="px-4 py-2 space-y-6 max-w-2xl md:min-w-200 mx-auto">
        {/* Election Group Mismatch Banner */}
        <ElectionMismatchBanner mismatch={isElectionMismatch} selectedGroupName={selectedElectionGroup?.name} />

        {/* Election Day Restriction Banner */}
        <ElectionDayBanner electionDay={electionDay} daysLeft={daysLeft} />

        {/* Location Status Banner */}
        <LocationStatusBanner
          geoCoords={geoCoords}
          isLocating={isLocating}
          geoError={geoError}
          onRequestLocation={requestLocation}
        />

        {/* Title header with lime accent underline */}
        <div>
          <HeaderAccent
            as="h1"
            title="Post update"
            titleClassName="text-3xl font-extrabold tracking-tight text-foreground"
            accentClassName="top-6 h-3 w-44"
          />
        </div>

        {/* Supervisor Status & Sub-Option Selectors */}
        <VotingStatusSelects
          forWho="supervisor"
          label="Update category"
          selectedStatusCategoryId={selectedStatusCategoryId}
          selectedStatusOptionId={selectedStatusOptionId}
          onStatusCategoryChange={setSelectedStatusCategoryId}
          onStatusOptionChange={setSelectedStatusOptionId}
        />

        {/* Supervisor Issue Selectors */}
        <VotingIssueSelects
          forWho="supervisor"
          issueActionValue={issueActionValue}
          onIssueActionValueChange={setIssueActionValue}
          selectedIssueOptionIds={selectedIssueOptionIds}
          onIssueOptionIdsChange={setSelectedIssueOptionIds}
          activeIssuesList={[]}
        />

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
