import { useAuth } from "#/hooks/useAuth";
import { getUserVoteStatus } from "#/lib/server/elections";
import { Button } from "@repo/ui/components/button";
import {
  CheckmarkIndicator,
  DoubleAvatar,
} from "@repo/ui/components/cards/Rewards";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { NotVotingDrawer } from "./NotVotingDrawer";
import { GreyCardTitle, GreyCardTopRow, GreyCardWrapper } from "./Shared";

interface DidYouVoteCardProps {
  onYesClick?: () => void;
  onNoClick?: () => void;
}

export function DidYouVoteCard({ onYesClick, onNoClick }: DidYouVoteCardProps) {
  const { selectedAssignment, selectedElectionGroup } = useAuth();
  const navigate = useNavigate();
  const [isNotVotingDrawerOpen, setIsNotVotingDrawerOpen] = useState(false);

  const { data: voteStatusData, isLoading } = useQuery({
    queryKey: ["user-vote-status", selectedElectionGroup?.id],
    queryFn: () =>
      getUserVoteStatus({
        data: { electionGroupId: selectedElectionGroup!.id },
      }),
    enabled: !!selectedElectionGroup?.id,
  });
  console.log({ voteStatusData });

  if (!selectedElectionGroup || isLoading) {
    return null;
  }

  const statusInfo = voteStatusData?.data?.status;

  if (statusInfo?.status === "voted") {
    return <UserVotedCard statusInfo={statusInfo} />;
  }

  if (statusInfo?.status === "did_not_vote") {
    return <UserDidNotVoteCard statusInfo={statusInfo} onNoClick={onNoClick} />;
  }

  return (
    <>
      <GreyCardWrapper>
        {selectedAssignment && (
          <GreyCardTopRow
            title={"Potential payout"}
            subtitle={"₦1,200"}
            icon={<FancyMoneyBagIcon className="size-5" />}
          />
        )}
        <GreyCardTitle label="Did you vote?" />

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
          <Button
            type="button"
            variant="outline"
            size="4xl"
            className="w-full"
            onClick={() => {
              if (onNoClick) onNoClick();
              setIsNotVotingDrawerOpen(true);
            }}
          >
            No
          </Button>
        </div>
      </GreyCardWrapper>

      <NotVotingDrawer
        isOpen={isNotVotingDrawerOpen}
        onOpenChange={setIsNotVotingDrawerOpen}
      />
    </>
  );
}

interface UserVotedCardProps {
  statusInfo: any;
}

function UserVotedCard({ statusInfo }: UserVotedCardProps) {
  const navigate = useNavigate();

  return (
    <GreyCardWrapper>
      <div className="flex flex-col w-full">
        <GreyCardTitle label="Candidates you voted for" />
        <div className="mt-4 flex flex-col gap-4">
          {statusInfo.votes.map((vote: any) => (
            <div
              key={vote.vote_id}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
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

interface UserDidNotVoteCardProps {
  statusInfo: any;
  onNoClick?: () => void;
}

function UserDidNotVoteCard({
  statusInfo,
  onNoClick,
}: UserDidNotVoteCardProps) {
  const [isNotVotingDrawerOpen, setIsNotVotingDrawerOpen] = useState(false);

  return (
    <GreyCardWrapper>
      <div className="flex flex-col w-full">
        <GreyCardTitle label="You did not vote this election" />
        <div className="mt-4 flex flex-col gap-4">
          <span className="text-c-80 leading-6 bg-white py-2 px-3 rounded-12">
            "{statusInfo.did_not_vote_explanation || "No comment."}"
          </span>
          <div className="bg-yellow/20 py-2 px-3 rounded-xl font-medium text-c-90 leading-6">
            <span className="text-c-50">Reason: </span>
            {statusInfo.did_not_vote_reason}
          </div>
        </div>
        <Button
          type="button"
          variant="black"
          size="3xl"
          className="w-full mt-6"
          onClick={() => {
            if (onNoClick) onNoClick();
            setIsNotVotingDrawerOpen(true);
          }}
        >
          Edit
        </Button>
      </div>
      <NotVotingDrawer
        isOpen={isNotVotingDrawerOpen}
        onOpenChange={setIsNotVotingDrawerOpen}
      />
    </GreyCardWrapper>
  );
}
