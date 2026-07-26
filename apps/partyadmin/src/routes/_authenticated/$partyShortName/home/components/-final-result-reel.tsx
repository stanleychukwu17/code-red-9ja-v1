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

export type ResultOverlayItem = {
  polling_unit_name?: string;
  lga_name?: string;
  state_name?: string;
  ward_name?: string;
  user_avatar?: string;
  uploader_name?: string;
  media_urls?: string[];
  created_at?: string;
  candidate_results?: any;
  [key: string]: any;
};

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

  useReelKeyboard({ hasNext, hasPrev, onNext, onPrev, onClose });

  const votesData = mergeElectionResults({
    candidates: candidatesList,
    electionFinalResults: {
      candidate_results: result.candidate_results,
    },
    parties: activeParties || [],
    isLive: false, // assuming reel is always showing final (or we can pass isLive if needed, but it currently only looks at result.candidate_results)
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
