import { PageHeader } from "#/components/Headers";
import { PageWrapper } from "#/components/Wrappers";
import { useAssignments } from "#/hooks/useAssignments";
import { useElection } from "#/hooks/useElection";
import {
  STATIC_ISSUE_CATEGORIES,
  STATIC_STATUS_CATEGORIES,
  type IssueCategory,
} from "#/lib/constants/update-options";
import { VotingStatusSelects } from "./-components/VotingStatusSelects";
import { VotingIssueSelects } from "./-components/VotingIssueSelects";
import { MediaAttachmentActions, type AttachedMedia } from "./-components/MediaAttachmentActions";
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
import { WifiOff, CloudUpload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Route definition for redesigned polling unit situation update screen
export const Route = createFileRoute("/_authenticated/give-update-1/")({
  component: GiveUpdate1,
});

function GiveUpdate1() {
  const navigate = useNavigate();

  // Active election group and polling unit assignment context
  const { selectedElectionGroup } = useElection();
  const { pollingUnitAssignment } = useAssignments();

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

  // Free-form textual report message
  const [message, setMessage] = useState("");

  // Attached media files list
  const [mediaList, setMediaList] = useState<AttachedMedia[]>([]);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Handler for primary post update CTA using offline-first outbox pattern
  const handlePostUpdate = async () => {
    if (!pollingUnitAssignment || !selectedElectionGroup) {
      toast.error("No active polling unit assignment detected");
      return;
    }

    setIsSubmitting(true);

    try {
      // Process images through WebP compression before local persistent save
      const processedMediaFiles: {
        name: string;
        type: "image" | "video" | "audio";
        blob: Blob;
      }[] = [];

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
          });
        }
      }

      // Build outbox item
      const outboxItem: OutboxUpdateItem = {
        id: `update_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        pollingUnitId: pollingUnitAssignment.polling_unit_id,
        electionGroupId: selectedElectionGroup.id,
        assignmentId: pollingUnitAssignment.id,
        partyId: pollingUnitAssignment.party_id,
        statusCategoryId: selectedStatusCategoryId,
        statusOptionId: selectedStatusOptionId,
        hasIssues,
        issueAction: isExistingIssue ? "link_existing" : isNewIssue ? "create_new" : "none",
        existingIssueIds: isExistingIssue && existingIssueId ? [existingIssueId] : undefined,
        newIssueOptionIds: isNewIssue ? selectedIssueOptionIds : undefined,
        message,
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

  return (
    <PageWrapper>
      {/* Top back navigation */}
      <PageHeader onBackClick={() => navigate({ to: "/" })} />

      <div className="px-4 py-2 space-y-6 max-w-2xl md:min-w-200 mx-auto">
        {/* Offline / Pending Sync Status Banner */}
        {(!isOnline || pendingCount > 0) && (
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
                  <span>{pendingCount} update{pendingCount > 1 ? "s" : ""} waiting to sync...</span>
                </>
              )}
            </div>
            {isOnline && (
              <button
                type="button"
                onClick={() => triggerSync()}
                className="font-semibold underline hover:text-amber-950 cursor-pointer"
              >
                Sync now
              </button>
            )}
          </div>
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

        {/* Text Area Box */}
        <div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add more details or describe situation at the polling unit..."
            rows={5}
            className="w-full rounded-2xl bg-[#F3F4F8] dark:bg-muted/30 border border-slate-400 dark:border-border/60 p-4 text-base text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition resize-none"
          />
        </div>

        {/* Media Attachments & Upload Action Buttons */}
        <MediaAttachmentActions
          mediaList={mediaList}
          onMediaListChange={setMediaList}
        />

        {/* Primary CTA: + Post update */}
        <div className="pt-4">
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
    </PageWrapper>
  );
}
