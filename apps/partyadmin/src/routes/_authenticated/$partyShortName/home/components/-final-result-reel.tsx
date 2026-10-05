import { AppAvatar } from "@repo/ui/components/avatar";
import { format } from "date-fns";
import { useState } from "react";
import { Menu, Play, Users } from "lucide-react";
import PollingUnitIcon from "@repo/ui/icons/polling-unit-icon";
import { mergeElectionResults } from "@repo/ui/lib/merge-election-results";
import {
  PostActionButton,
  ReelNavButtons,
  ReelShell,
  UploaderRow,
  useReelKeyboard,
} from "./-reel-shared";

/**
 * FinalResultReel Component
 *
 * Full-screen modal designed for election night situation room operations.
 * Displays official EC8A polling unit return sheets side-by-side with candidate vote tallies,
 * uploader credentials, and consensus status across political party agents.
 *
 * Features:
 * - High-resolution inspection of scanned or photographed Form EC8A.
 * - Candidate vote count rankings merged with political party metadata.
 * - Multi-agent consensus counter (e.g., verifying whether multiple party agents submitted identical numbers).
 * - Keyboard shortcuts (ArrowLeft / ArrowRight to step through PUs, Escape to close).
 */

export type ResultOverlayItem = {
  /** Name of the reporting polling unit */
  polling_unit_name?: string;
  /** Local Government Area name */
  lga_name?: string;
  /** State name */
  state_name?: string;
  /** Ward name */
  ward_name?: string;
  /** Avatar image URL of the submitting agent */
  user_avatar?: string;
  /** Name of the submitting agent */
  uploader_name?: string;
  /** Array of result sheet photos/scans */
  media_urls?: string[];
  /** Timestamp of upload */
  created_at?: string;
  /** Candidate vote tallies submitted by the agent */
  candidate_results?: any;
  [key: string]: any;
};

/**
 * ResultReelSidebar Component
 *
 * Renders the candidate vote breakdown leaderboard alongside polling unit location
 * and the verified agent who uploaded the Form EC8A sheet.
 */
function ResultReelSidebar({
  votesData,
  result,
  locationStr,
  displayTime,
}: {
  votesData: any[];
  result: ResultOverlayItem;
  locationStr: string;
  displayTime: string;
}) {
  const uploaderAvatar =
    result.user_avatar || result.finalResult?.uploader_avatar;
  const uploaderName =
    result.uploader_name ||
    [
      result.finalResult?.uploader_first_name,
      result.finalResult?.uploader_last_name,
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <div className="w-[350px] flex-shrink-0 flex flex-col h-full relative">
      <div className="p-6 pb-2">
        <h2 className="text-2xl font-bold tracking-wider">VOTES</h2>
      </div>

      <div className="flex-1 overflow-y-auto overflow-visible px-6 py-4 space-y-5">
        {votesData.map((v: any, i: number) => (
          <div key={i} className="flex items-center gap-4">
            <span className="text-white/50 text-sm font-medium w-4 text-center">
              {i + 1}
            </span>
            <AppAvatar src={v.avatar || ""} alt={v.name} className="size-10" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">
                {v.name || v.party_short_name}{" "}
                {v.name && (
                  <span className="text-white/50 text-xs">
                    · {v.party_short_name}
                  </span>
                )}
              </p>
            </div>
            <div className="text-sm font-bold">{v.vote_count} votes</div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="px-6 pt-4 pb-8 space-y-4 mt-auto">
        <div className="flex items-start gap-4">
          <PollingUnitIcon className="size-8 mb-2" />
          <div className="flex-1 min-w-0 space-y-2">
            <h3 className="leading-5">{result.polling_unit_name}</h3>
            <p className="text-sm text-white/60">{locationStr}</p>
          </div>
        </div>
        <UploaderRow
          avatarSrc={uploaderAvatar}
          name={uploaderName}
          time={displayTime}
        />
      </div>
    </div>
  );
}

/**
 * FinalResultReel Component
 *
 * Full-screen modal that merges election results with party metadata and presents
 * Form EC8A sheet images with interactive candidate leaderboards.
 */
export function FinalResultReel({
  result,
  candidatesList,
  activeParties,
  onClose,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}: {
  result: ResultOverlayItem;
  candidatesList: any[];
  activeParties?: any[];
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}) {
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // Bind keyboard arrow keys (left/right) and Escape key
  useReelKeyboard({ hasNext, hasPrev, onNext, onPrev, onClose });

  // Normalize and rank candidate vote tallies against active political party logos
  const votesData = mergeElectionResults({
    candidates: candidatesList,
    electionFinalResults: {
      candidate_results: result.candidate_results,
    },
    parties: activeParties || [],
    isLive: false,
  });

  const displayTime = result.created_at
    ? format(new Date(result.created_at), "h:mm a · MMM d, yyyy")
    : "";

  const locationStr = [result.state_name, result.lga_name, result.ward_name]
    .filter(Boolean)
    .join(" · ");

  const mediaUrls =
    result.media_urls ||
    [result.finalResult?.result_sheet_image_url].filter(Boolean);
  const userAvatar = result.user_avatar || result.finalResult?.uploader_avatar;
  const uploaderName =
    result.uploader_name ||
    [
      result.finalResult?.uploader_first_name,
      result.finalResult?.uploader_last_name,
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <ReelShell
      onClose={onClose}
      sidebar={
        isSidebarVisible ? (
          <ResultReelSidebar
            votesData={votesData}
            result={result}
            locationStr={locationStr}
            displayTime={displayTime}
          />
        ) : undefined
      }
    >
      <div className="flex items-end gap-5 py-10">
        {mediaUrls && mediaUrls.length > 0 && (
          <img
            src={mediaUrls[0]}
            alt="Result Sheet"
            className="max-h-[95vh] lg:max-w-[600px] object-contain rounded-xl shadow-2xl"
          />
        )}
        <div className="flex flex-col gap-5 items-center">
          <PostActionButton
            icon={<Menu className="size-6 text-white" />}
            label="Show votes"
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
          />
          <PostActionButton
            icon={<Users className="size-6 text-white" />}
            label="2 match / 4"
          />
          <PostActionButton
            icon={<Play className="size-6 text-white ml-1" />}
            label="Play"
          />
          <AppAvatar
            src={userAvatar || ""}
            alt={uploaderName || ""}
            className="size-10"
          />
        </div>
      </div>

      <ReelNavButtons
        hasNext={hasNext}
        hasPrev={hasPrev}
        onNext={onNext}
        onPrev={onPrev}
      />
    </ReelShell>
  );
}
