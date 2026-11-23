import { getPageHeader } from "#/lib/shared/meta";
import { APP_URL } from "#/lib/config";
import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import { useAgentDutyEligibility } from "#/hooks/useAgentDutyEligibility";
import { useAssignments } from "#/hooks/useAssignments";
import { useGeolocation } from "#/hooks/useGeolocation";
import { getPollingUnits } from "#/lib/server/polling_units";
import { useQuery } from "@tanstack/react-query";
import { VotingStatusSelects } from "./-components/VotingStatusSelects";
import { VotingIssueSelects } from "./-components/VotingIssueSelects";
import { UpdateMessageInputs } from "./-components/UpdateMessageInputs";
import { MediaAttachmentActions, type AttachedMedia } from "./-components/MediaAttachmentActions";
import { LocationStatusBanner } from "./-components/LocationStatusBanner";
import { IntervalStatusBanner } from "./-components/IntervalStatusBanner";
import { MissingLocationAlertDialog } from "./-components/MissingLocationAlertDialog";
import {
  saveToOutbox,
  type OutboxUpdateItem,
} from "#/lib/outbox-db";
import { useOfflineOutbox } from "#/lib/use-offline-outbox";
import { Button } from "@repo/ui/components/button";
import { HeaderAccent } from "@repo/ui/components/header-accent";
import { convertToWebP } from "@repo/ui/lib/image";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { WifiOff, CloudUpload, CalendarClock, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Route definition for redesigned polling unit situation update screen
export const Route = createFileRoute("/_authenticated/give-update/")({
  head: () => getPageHeader({ title: "Post Update" }),
  component: GiveUpdate,
});

function GiveUpdate() {
  const navigate = useNavigate();
  const { supervisorAssignment, electionGroupId, partyId } = useAssignments();
  const isSupervisor = !!supervisorAssignment;
  const currentSupervisorAssignment = supervisorAssignment?.data;
  const supervisorRoleType = supervisorAssignment?.type;

  // Active election schedule context and duty eligibility
  const { validateEligibility, isElectionMismatch, electionDay, daysLeft, pollingUnitAssignment, selectedElectionGroup } = useAgentDutyEligibility({
    dutyName: isSupervisor ? "Supervisor updates" : "Updates",
    roleType: isSupervisor ? "supervisor" : "agent",
  });

  // Offline outbox queue manager
  const { isOnline, pendingCount, triggerSync } = useOfflineOutbox();

  // Primary status category (starts unselected so the user explicitly chooses)
  const [selectedStatusCategoryId, setSelectedStatusCategoryId] = useState<number>(0);
  const [selectedStatusOptionId, setSelectedStatusOptionId] = useState<number | undefined>(undefined);

  // Optional Polling Unit tag for supervisors (hidden for now; flip to true to re-enable)
  const SHOW_SUPERVISOR_PU_TAG = false; // the feature is hidden for now, after the 2027 elections, if we see that it is needed, we can bring it back
  const [selectedPollingUnitId, setSelectedPollingUnitId] = useState<number | undefined>(undefined);
  const wardId = currentSupervisorAssignment?.ward_id;
  const lgaId = currentSupervisorAssignment?.lga_id;
  const { data: puData } = useQuery({
    queryKey: ["supervisorPUs", wardId, lgaId],
    queryFn: () => getPollingUnits({ data: { ward_id: wardId, lga_id: lgaId } }),
    enabled: SHOW_SUPERVISOR_PU_TAG && isSupervisor && Boolean(wardId || lgaId),
    staleTime: Infinity,
  });

  const pollingUnitsList = puData?.data?.polling_units || [];

  // Issue Action: 'none' | 'new'
  const [issueActionValue, setIssueActionValue] = useState<string>("none");

  // Selected issue options (multi-select)
  const [selectedIssueOptionIds, setSelectedIssueOptionIds] = useState<number[]>([]);
  const [isEmergency, setIsEmergency] = useState(false);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  // Attached media files list
  const [mediaList, setMediaList] = useState<AttachedMedia[]>([]);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User device geolocation hook
  const { geoCoords, isLocating, geoError, requestLocation } = useGeolocation();
  const [showLocationWarningDialog, setShowLocationWarningDialog] = useState(false);

  // Parse current issue selection
  const isNewIssue = issueActionValue === "new";
  const hasIssues = isNewIssue && selectedIssueOptionIds.length > 0;

  // Validate required category and headline before queuing an update
  const validateFormInputs = () => {
    if (!selectedStatusCategoryId || selectedStatusCategoryId <= 0) {
      toast.error(isSupervisor ? "Please select an update category." : "Please select a voting status category.");
      return false;
    }

    const titleWords = title.trim().split(/\s+/).filter(Boolean);
    if (titleWords.length < 2) {
      toast.error("Please enter a headline of at least 2 words.");
      return false;
    }

    return true;
  };

  // Inner update submission handler using offline-first outbox pattern
  const submitUpdate = async () => {
    if (!validateEligibility() || !validateFormInputs()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Process images through WebP compression before local persistent save
      const processedMediaFiles: OutboxUpdateItem["mediaFiles"] = [];

      for (const m of mediaList) {
        if (m.type === "image" && m.file instanceof File) {
          try {
            const compressed = await convertToWebP(m.file, 0.85, 1280);
            processedMediaFiles.push({
              name: compressed.name,
              type: "image",
              blob: compressed,
            });
          } catch {
            processedMediaFiles.push({
              name: m.name,
              type: "image",
              blob: m.file,
            });
          }
        } else {
          processedMediaFiles.push({
            name: m.name,
            type: m.type,
            blob: m.file,
            durationSeconds: m.durationSeconds,
          });
        }
      }

      // Build outbox item
      const outboxItem: OutboxUpdateItem = {
        id: `update_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        pollingUnitId: isSupervisor ? selectedPollingUnitId : pollingUnitAssignment?.polling_unit_id,
        electionGroupId: electionGroupId ?? 0,
        assignmentId: isSupervisor ? 0 : pollingUnitAssignment?.id ?? 0,
        partyId: partyId ?? undefined,
        statusCategoryId: selectedStatusCategoryId,
        statusOptionId: selectedStatusOptionId,
        hasIssues,
        isEmergency,
        issueAction: isNewIssue ? "create_new" : "none",
        newIssueOptionIds: isNewIssue ? selectedIssueOptionIds : undefined,
        title: title.trim(),
        message: message.trim(),
        latitude: geoCoords.latitude,
        longitude: geoCoords.longitude,
        accuracyMeters: geoCoords.accuracyMeters,
        mediaFiles: processedMediaFiles,
        createdAt: Date.now(),
        syncStatus: "pending",
        retryCount: 0,
      };

      // Save instantly to IndexedDB outbox
      await saveToOutbox(outboxItem);

      if (isOnline) {
        toast.success("Update saved! Syncing now...");
        triggerSync();
      } else {
        toast.info("Saved offline. Will sync automatically once network returns.");
      }

      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Failed to save update");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Primary post update CTA: verifies GPS status before submitting
  const handlePostUpdate = () => {
    if (!validateEligibility()) {
      return;
    }

    // If coordinates are missing, warn the agent that unverified GPS results in reduced payment
    if (!geoCoords.latitude || !geoCoords.longitude) {
      setShowLocationWarningDialog(true);
      return;
    }

    submitUpdate();
  };

  return (
    <PageWrapper>
      {/* Top back navigation */}
      <PageHeader onBackClick={() => navigate({ to: "/" })} />

      <div className="px-4 py-2 space-y-6 max-w-2xl md:min-w-200 mx-auto">
        {/* Election Group Mismatch Banner */}
        <ElectionMismatchBanner mismatch={isElectionMismatch} selectedGroupName={selectedElectionGroup?.name} />

        {/* Election Day Restriction Banner */}
        <ElectionDayBanner electionDay={electionDay} daysLeft={daysLeft} />

        {/* Offline / Pending Sync Status Banner */}
        <OfflineSyncBanner
          isOnline={isOnline}
          pendingCount={pendingCount}
          onSync={triggerSync}
        />

        {/* Polling Unit Geolocation Status & Warning Banner */}
        <LocationStatusBanner
          geoCoords={geoCoords}
          isLocating={isLocating}
          geoError={geoError}
          onRequestLocation={requestLocation}
        />

        {/* 30-Minute Interval Status & Daily Updates Progress (agents only) */}
        {!isSupervisor && (
          <IntervalStatusBanner
            updatesCount={pollingUnitAssignment?.updates_count}
            lastUpdateAt={pollingUnitAssignment?.last_update_at}
          />
        )}

        {/* Title header with lime accent underline */}
        <div>
          <HeaderAccent
            as="h1"
            title="Post update"
            titleClassName="text-3xl font-extrabold tracking-tight text-foreground"
            accentClassName="top-6 h-3 w-44"
          />
        </div>

        {/* 2x2 Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Voting status and contextual sub-options */}
          <VotingStatusSelects
            forWho={isSupervisor ? "supervisor" : "agent"}
            label={isSupervisor ? "Update category" : "Voting status"}
            selectedStatusCategoryId={selectedStatusCategoryId}
            selectedStatusOptionId={selectedStatusOptionId}
            onStatusCategoryChange={setSelectedStatusCategoryId}
            onStatusOptionChange={setSelectedStatusOptionId}
          />

          {/* Any ongoing issues & issue detail selection */}
          <VotingIssueSelects
            forWho={isSupervisor ? "supervisor" : "agent"}
            issueActionValue={issueActionValue}
            onIssueActionValueChange={setIssueActionValue}
            selectedIssueOptionIds={selectedIssueOptionIds}
            onIssueOptionIdsChange={setSelectedIssueOptionIds}
          />
        </div>

        {/* Emergency Escalation Toggle */}
        <button
          type="button"
          onClick={() => setIsEmergency((prev) => !prev)}
          className={`w-full rounded-2xl border px-4 py-3.5 flex items-center justify-between gap-3 text-left transition cursor-pointer ${
            isEmergency
              ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
              : "border-border bg-card hover:bg-muted/40 text-foreground"
          }`}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle
              className={`size-5 shrink-0 ${
                isEmergency ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
              }`}
            />
            <div>
              <p className="text-sm font-semibold">Emergency situation</p>
              <p className="text-xs text-muted-foreground">
                Flag this update for immediate war-room &amp; supervisor attention
              </p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
              isEmergency
                ? "bg-red-600 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isEmergency ? "URGENT" : "Normal"}
          </span>
        </button>

        {/* Optional Polling Unit Tag (supervisors only) */}
        {SHOW_SUPERVISOR_PU_TAG && isSupervisor && pollingUnitsList.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between">
              <span>Specific Polling Unit (Optional)</span>
              {selectedPollingUnitId && (
                <button
                  type="button"
                  onClick={() => setSelectedPollingUnitId(undefined)}
                  className="text-xs text-purple-600 underline hover:text-purple-700 cursor-pointer "
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
              <option value="">General (Area-wide / Entire {supervisorRoleType === "ward" ? "Ward" : "LGA"})</option>
              {pollingUnitsList.map((pu: any) => (
                <option key={pu.id} value={pu.id}>
                  {pu.pu_code ? `[${pu.pu_code}] ` : ""}{pu.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Update Headline & Message Inputs */}
        <UpdateMessageInputs
          title={title}
          onTitleChange={setTitle}
          message={message}
          onMessageChange={setMessage}
        />

        {/* Media Attachments & Upload Action Buttons */}
        <MediaAttachmentActions
          mediaList={mediaList}
          onMediaListChange={setMediaList}
        />

        {/* Primary CTA: + Post update */}
        <div className="pt-4 pb-16">
          <Button
            type="button"
            variant="lime"
            size="2xl"
            disabled={isSubmitting}
            className="rounded-full px-8 py-6 text-base font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            onClick={handlePostUpdate}
          >
            <span className="text-xl leading-none font-bold">+</span>
            <span>{isSubmitting ? "Saving..." : "Post update"}</span>
          </Button>
        </div>
      </div>

      {/* Missing Location Confirmation Dialog */}
      <MissingLocationAlertDialog
        open={showLocationWarningDialog}
        onOpenChange={setShowLocationWarningDialog}
        onEnableLocation={requestLocation}
        onConfirmSubmit={submitUpdate}
      />
    </PageWrapper>
  );
}

/**
 * Notice banner displayed when current date does not match election day.
 */
export function ElectionDayBanner({ electionDay, daysLeft }: { electionDay?: boolean; daysLeft?: number }) {
  if (electionDay) return null;

  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-300">
      <CalendarClock className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
      <span>
        {daysLeft !== undefined && daysLeft > 0
          ? `Election day is in ${daysLeft} day${daysLeft > 1 ? "s" : ""}. Situation updates open on election day.`
          : "Situation updates can only be submitted on the scheduled election day."}
      </span>
    </div>
  );
}

/**
 * Banner displayed when user is offline or has pending outbox updates to sync.
 */
export function OfflineSyncBanner({ isOnline, pendingCount, onSync }: { isOnline: boolean; pendingCount: number; onSync: () => void }) {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="size-4 shrink-0 text-amber-600" />
            <span>Offline mode. All updates are stored safely on your phone.</span>
          </>
        ) : (
          <>
            <CloudUpload className="size-4 shrink-0 text-amber-600 animate-bounce" />
            <span>
              {pendingCount} update{pendingCount > 1 ? "s" : ""} waiting to sync...
            </span>
          </>
        )}
      </div>
      {isOnline && (
        <button
          type="button"
          onClick={onSync}
          className="font-semibold underline hover:text-amber-950 cursor-pointer"
        >
          Sync now
        </button>
      )}
    </div>
  );
}

/**
 * Warning banner displayed when active selected election differs from assigned polling unit election.
 */
export function ElectionMismatchBanner({ mismatch, selectedGroupName }: { mismatch: boolean; selectedGroupName?: string }) {
  if (!mismatch) return null;

  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
      <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>
        You are currently viewing <strong>{selectedGroupName || "another election"}</strong>, which does not match your polling unit assignment&apos;s election. Please switch to your assigned election.
      </span>
    </div>
  );
}
