import { getPageHeader } from "#/lib/shared/meta";
import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import { useAgentDutyEligibility } from "#/hooks/useAgentDutyEligibility";
import { useGeolocation } from "#/hooks/useGeolocation";
import { VotingStatusSelects } from "./-components/VotingStatusSelects";
import { VotingIssueSelects } from "./-components/VotingIssueSelects";
import { UpdateMessageInputs } from "./-components/UpdateMessageInputs";
import { MediaAttachmentActions, type AttachedMedia } from "./-components/MediaAttachmentActions";
import { LocationStatusBanner } from "./-components/LocationStatusBanner";
import { IntervalStatusBanner } from "./-components/IntervalStatusBanner";
import { MissingLocationAlertDialog } from "./-components/MissingLocationAlertDialog";
import {
  getActiveIssuesForPU,
  saveToOutbox,
  type CachedActiveIssue,
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

  // Active election schedule context and duty eligibility
  const {
    isEligible,
    validateEligibility,
    isElectionMismatch,
    electionDay,
    daysLeft,
    pollingUnitAssignment,
    selectedElectionGroup,
  } = useAgentDutyEligibility({ dutyName: "Updates" });

  // Offline outbox queue manager
  const { isOnline, pendingCount, triggerSync } = useOfflineOutbox();

  // Primary status category (defaults to 'Active' - id 3, sub-option is optional)
  const [selectedStatusCategoryId, setSelectedStatusCategoryId] = useState<number>(3);
  const [selectedStatusOptionId, setSelectedStatusOptionId] = useState<number | undefined>(undefined);

  // Active issues loaded from local cache / state
  const [activeIssuesList, setActiveIssuesList] = useState<CachedActiveIssue[]>([]);

  // Issue Action: 'none' | 'existing_{id}' | 'new'
  const [issueActionValue, setIssueActionValue] = useState<string>("none");

  // Selected new issue options (multi-select)
  const [selectedIssueOptionIds, setSelectedIssueOptionIds] = useState<number[]>([]);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  // Attached media files list
  const [mediaList, setMediaList] = useState<AttachedMedia[]>([]);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User device geolocation hook
  const { geoCoords, isLocating, geoError, requestLocation } = useGeolocation();
  const [showLocationWarningDialog, setShowLocationWarningDialog] = useState(false);

  // Load any existing active issues for this polling unit on mount
  useEffect(() => {
    if (pollingUnitAssignment?.polling_unit_id) {
      getActiveIssuesForPU(pollingUnitAssignment.polling_unit_id).then((issues) => {
        setActiveIssuesList(issues);
        // Pre-select existing issue if one is active
        if (issues.length > 0) {
          setIssueActionValue(`existing_${issues[0]!.id}`);
        }
      });
    }
  }, [pollingUnitAssignment?.polling_unit_id]);

  // Parse current issue selection
  const isExistingIssue = issueActionValue.startsWith("existing_");
  const isNewIssue = issueActionValue === "new";
  const hasIssues = isExistingIssue || isNewIssue;
  const existingIssueId = isExistingIssue ? Number(issueActionValue.replace("existing_", "")) : undefined;

  // Inner update submission handler using offline-first outbox pattern
  const submitUpdate = async () => {
    if (!validateEligibility()) {
      return;
    }

    if (!selectedStatusCategoryId || selectedStatusCategoryId <= 0) {
      toast.error("Please select a voting status category.");
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
        pollingUnitId: pollingUnitAssignment.polling_unit_id,
        electionGroupId: pollingUnitAssignment.election_group_id,
        assignmentId: pollingUnitAssignment.id,
        partyId: pollingUnitAssignment.party_id,
        statusCategoryId: selectedStatusCategoryId,
        statusOptionId: selectedStatusOptionId,
        hasIssues,
        issueAction: isExistingIssue ? "link_existing" : isNewIssue ? "create_new" : "none",
        existingIssueIds: isExistingIssue && existingIssueId ? [existingIssueId] : undefined,
        newIssueOptionIds: isNewIssue ? selectedIssueOptionIds : undefined,
        title: title.trim() || undefined,
        message: message.trim() || title.trim() || "Polling unit status update",
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

        {/* 30-Minute Interval Status & Daily Updates Progress */}
        <IntervalStatusBanner
          updatesCount={pollingUnitAssignment?.updates_count}
          lastUpdateAt={pollingUnitAssignment?.last_update_at}
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

        {/* 2x2 Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Voting status and contextual sub-options */}
          <VotingStatusSelects
            selectedStatusCategoryId={selectedStatusCategoryId}
            selectedStatusOptionId={selectedStatusOptionId}
            onStatusCategoryChange={setSelectedStatusCategoryId}
            onStatusOptionChange={setSelectedStatusOptionId}
          />

          {/* Any ongoing issues & issue detail selection */}
          <VotingIssueSelects
            issueActionValue={issueActionValue}
            onIssueActionValueChange={setIssueActionValue}
            selectedIssueOptionIds={selectedIssueOptionIds}
            onIssueOptionIdsChange={setSelectedIssueOptionIds}
            activeIssuesList={activeIssuesList}
          />
        </div>

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
function ElectionDayBanner({ electionDay, daysLeft }: { electionDay?: boolean; daysLeft?: number }) {
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
function OfflineSyncBanner({ isOnline, pendingCount, onSync }: { isOnline: boolean; pendingCount: number; onSync: () => void }) {
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
function ElectionMismatchBanner({ mismatch, selectedGroupName }: { mismatch: boolean; selectedGroupName?: string }) {
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
