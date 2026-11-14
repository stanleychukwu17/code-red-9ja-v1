import { useElection } from "#/hooks/useElection";
import { useAssignments } from "#/hooks/useAssignments";
import { useUserParty } from "#/hooks/useUserParty";
import { getUserVoteStatus } from "#/lib/server/elections";
import { Button } from "@repo/ui/components/button";
import {
  CheckmarkIndicator,
  DoubleAvatar,
} from "@repo/ui/components/cards/Rewards";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";

import {
  getPotentialPayout,
  getEstimatePayout,
} from "#/lib/server/practice_tests";

interface DidYouVoteCardProps {
  /** Callback fired when user clicks 'Yes' to record or review their vote */
  onYesClick?: () => void;
  /** Callback fired when user clicks 'No' to indicate they did not vote */
  onNoClick?: () => void;
}

/**
 * Dashboard Card for checking and displaying the user's voting status.
 *
 * Renders one of two distinct UI states based on backend records:
 * 1. Default Prompt: "Did you vote?" with Yes (triggers vote flow).
 * 2. `UserVotedCard`: Displays candidates and parties the user selected with an Edit option.
 */
export function DidYouVoteCard({ onYesClick, onNoClick }: DidYouVoteCardProps) {
  const { selectedElectionGroup } = useElection();
  const { pollingUnitAssignment } = useAssignments();
  const { party } = useUserParty();
  const assignmentId = pollingUnitAssignment?.id;

  // Query potential payout reward for voting participation or voter mobilization
  const { data: potentialPayout } = useQuery({
    queryKey: [
      "taskPayout",
      "live_voters_referred",
      assignmentId ?? "no-assignment",
      selectedElectionGroup?.id,
      party?.id,
    ],
    queryFn: async () => {
      // 1. Fetch exact assignment payout if assigned
      if (assignmentId) {
        const res = await getPotentialPayout({
          data: { assignmentId, taskType: "live_voters_referred" },
        });
        if (res?.success && res.data?.payout) {
          return (res.data.payout.potential_payout_kobo ?? 0) / 100;
        }
      }
      // 2. Fall back to estimated payout for role/election group
      const estRes = await getEstimatePayout({
        data: {
          taskType: "live_voters_referred",
          role: "polling_agent",
          electionGroupId: selectedElectionGroup?.id ?? undefined,
          partyId: party?.id ?? undefined,
        },
      });
      if (estRes?.success && estRes.data?.payout) {
        return (estRes.data.payout.potential_payout_kobo ?? 0) / 100;
      }
      return undefined;
    },
  });

  // Query current user's recorded vote status for the active election group
  const { data: voteStatusData, isLoading } = useQuery({
    queryKey: ["user-vote-status", selectedElectionGroup?.id],
    queryFn: () =>
      getUserVoteStatus({
        data: { electionGroupId: selectedElectionGroup!.id },
      }),
    enabled: !!selectedElectionGroup?.id,
  });

  // Guard: Return nothing until active election group is loaded and query completes
  if (!selectedElectionGroup || isLoading) {
    return null;
  }

  const statusInfo = voteStatusData?.data?.status;

  // State 1: User has already cast their vote
  if (statusInfo?.status === "voted") {
    return <UserVotedCard statusInfo={statusInfo} />;
  }

  // Format payout as currency (defaulting to ₦1,200 if unconfigured)
  const formattedPayout =
    potentialPayout !== undefined
      ? `₦${potentialPayout.toLocaleString()}`
      : "₦1,200";

  // State 2: Unanswered prompt — asks user if they voted
  return (
    <GreyCardWrapper>
      {/* Optional top row displaying task potential payout */}
      {pollingUnitAssignment && (
        <GreyCardTopRow
          title={"Potential payout"}
          subtitle={formattedPayout}
          icon={<FancyMoneyBagIcon className="size-5" />}
        />
      )}
      <GreyCardTitle label="Did you vote?" />

      {/* Voting response action buttons */}
      <div className="flex items-center gap-3 mt-1">
        <Button
          type="button"
          variant="secondary"
          size="4xl"
          className="w-full"
          onClick={onYesClick}
        >
          Yes
        </Button>
        {onNoClick && (
          <Button
            type="button"
            variant="outline"
            size="4xl"
            className="w-full"
            onClick={onNoClick}
          >
            No
          </Button>
        )}
      </div>
    </GreyCardWrapper>
  );
}

interface UserVotedCardProps {
  /** Vote status payload containing the list of chosen candidates */
  statusInfo: any;
}

/**
 * Card displayed after user has voted, summarizing each ballot selection.
 */
function UserVotedCard({ statusInfo }: UserVotedCardProps) {
  const navigate = useNavigate();

  return (
    <GreyCardWrapper>
      <div className="flex flex-col w-full">
        <GreyCardTitle label="Candidates you voted for" />
        <div className="mt-4 flex flex-col gap-4">
          {/* List of candidates voted for across each election ballot */}
          {statusInfo.votes.map((vote: any) => (
            <div
              key={vote.vote_id}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
                {/* Candidate avatar overlayed with party logo badge */}
                <DoubleAvatar
                  image={vote.candidate_avatar || vote.party_logo}
                  image2={vote.party_logo}
                />
                <div className="flex flex-col">
                  <span className="text-[17px] text-c-90 leading-tight line-clamp-1">
                    {vote.candidate_first_name
                      ? `${vote.candidate_first_name} ${vote.candidate_last_name} (${vote.party_short_name})`
                      : vote.party_short_name}
                  </span>
                  <span className="text-sm text-c-40 mt-0.5 line-clamp-1">
                    {vote.election_name}
                  </span>
                </div>
              </div>
              <CheckmarkIndicator isSelected />
            </div>
          ))}
        </div>

        {/* Navigation button to reopen voting wizard and edit choices */}
        <Button
          type="button"
          variant="black"
          size="3xl"
          className="w-full mt-6"
          onClick={() => navigate({ to: "/vote" })}
        >
          Edit
        </Button>
      </div>
    </GreyCardWrapper>
  );
}
