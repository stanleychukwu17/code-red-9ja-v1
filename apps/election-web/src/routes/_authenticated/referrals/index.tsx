import { useEffect, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { useCopyToClipboard, useIntersectionObserver } from "usehooks-ts";
import { toast } from "sonner";

import { useUser } from "#/hooks/useUser";
import { useUserParty } from "#/hooks/useUserParty";
import { useElection } from "#/hooks/useElection";
import { getPageHeader } from "#/lib/shared/meta";
import { getReferralStats, getReferredUsers } from "#/lib/server/referrals";
import {
  DarkBodyWrapper,
  PageWrapper,
  RoundedTopWrapper,
} from "#/components/Wrappers";
import { PageHeader } from "#/components/Headers";
import { Button } from "@repo/ui/components/button";
import { AppAvatar, DoubleAvatar } from "@repo/ui/components/avatar";
import { HomeHeader } from "../_home/components/HomeHeader";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";

/**
 * Route definition for agent referral dashboard.
 */
export const Route = createFileRoute("/_authenticated/referrals/")({
  head: () => getPageHeader({ title: "Referrals" }),
  component: ReferralsPage,
});

/** Aggregate statistics on an agent's referral performance and earnings */
type UserReferralStats = {
  id?: number;
  total_referrals?: number;
  agent_referrals?: number;
  unpaid_referrals?: number;
  potential_earnings?: string | number;
  earned_amount?: string | number;
};

/** Active party referral campaign metadata specifying per-recruit reward amount */
type ActiveCampaign = {
  id?: number;
  referral_amount?: string | number;
  title?: string;
};

/** Individual referred user record and their registration/agent recruitment milestone */
type ReferredUserItem = {
  id: number;
  user_referral_id?: number;
  party_id?: number;
  election_group_id?: number;
  referrer_user_id: number;
  referred_user_id: number;
  milestone: string;
  status: string;
  amount_to_pay: string | number;
  created_at: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
};

/**
 * Stat display item for the dark referral dashboard header.
 */
function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="h-14 flex items-center gap-3">
      <div className="shrink-0 size-11 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-white/90 w-full">{label}</p>
      <span className="text-lg leading-none text-white font-medium">
        {value}
      </span>
    </div>
  );
}

/**
 * Referrals Dashboard Page.
 * Displays recruitment performance stats, referral code sharing tool,
 * active reward campaigns, and a cursor-paginated list of recruits.
 */
function ReferralsPage() {
  const navigate = useNavigate();
  const user = useUser();
  const { party } = useUserParty();
  const { selectedElectionGroup } = useElection();
  const [_, copy] = useCopyToClipboard();

  // Intersection observer hook triggering next page loads on scroll
  const { ref: loadMoreRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  // Calculate remaining countdown days to election date
  let daysLeft: number | undefined = undefined;
  if (selectedElectionGroup?.election_date) {
    const d = new Date(selectedElectionGroup.election_date);
    d.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0) {
      daysLeft = diffDays;
    }
  }

  // Fetch referral totals and current active campaign rewards
  const { data: referralStatsData, isLoading: loadingStats } = useQuery({
    queryKey: ["referralStats", selectedElectionGroup?.id, party?.id],
    queryFn: async () => {
      const response = await getReferralStats({
        data: {
          electionGroupId: selectedElectionGroup?.id,
          partyId: party?.id,
        },
      });
      if (!response?.success || !response.data) return null;
      return response.data as {
        user_referral?: UserReferralStats;
        active_campaign?: ActiveCampaign;
      };
    },
  });

  const stats = referralStatsData?.user_referral || null;
  const activeCampaign = referralStatsData?.active_campaign || null;

  // Infinite query fetching referred users list with cursor pagination
  const {
    data: infiniteData,
    isLoading: loadingList,
    isFetchingNextPage: loadingMore,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["referredUsers", selectedElectionGroup?.id],
    queryFn: async ({ pageParam }) => {
      const response = await getReferredUsers({
        data: {
          electionGroupId: selectedElectionGroup?.id,
          cursor: pageParam ? Number(pageParam) : undefined,
          limit: 20,
        },
      });
      if (!response?.success || !response.data) {
        return { items: [], next_cursor: null, has_more: false };
      }
      return response.data as {
        items: ReferredUserItem[];
        next_cursor: number | null;
        has_more: boolean;
      };
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more && lastPage.next_cursor
        ? lastPage.next_cursor
        : undefined,
  });

  // Flatten infinite query page batches into a single array of items
  const items = useMemo(() => {
    const rawItems =
      infiniteData?.pages.flatMap((page) => page?.items || []) || [];
    return rawItems.filter((item): item is ReferredUserItem => Boolean(item));
  }, [infiniteData]);

  // Trigger loading next page when sentinel element scrolls into view
  useEffect(() => {
    if (isIntersecting && hasNextPage && !loadingMore && !loadingList) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, loadingMore, loadingList, fetchNextPage]);

  // Formatted campaign reward description (e.g. "₦1,000 per agent referred")
  const campaignBonusText = useMemo(() => {
    if (activeCampaign?.referral_amount) {
      const amt = Number(activeCampaign.referral_amount);
      if (!isNaN(amt) && amt > 0) {
        return `₦${amt.toLocaleString()} per agent referred`;
      }
    }
    return "Bonus per agent referred";
  }, [activeCampaign]);

  // Formatted potential referral payout
  const formattedPotentialEarnings = useMemo(() => {
    const amt = Number(stats?.potential_earnings ?? 0);
    return `₦${amt.toLocaleString()}`;
  }, [stats?.potential_earnings]);

  // Profile avatars of recent recruits for the double-avatar summary icon
  const avatar1 = items[0]?.avatar || "";
  const avatar2 = items[1]?.avatar || items[0]?.avatar || "";

  return (
    <PageWrapper>
      <DarkBodyWrapper>
        {/* Navigation header */}
        <PageHeader
          title="Referrals"
          className="px-2 pb-2 pt-3 text-white"
          buttonClassName="[&_svg]:text-white"
          onBackClick={() => navigate({ to: "/" })}
        />

        {/* Election countdown header with party badge */}
        <HomeHeader
          daysLeft={daysLeft}
          avatarImage={party?.logo}
          textClassName="text-white"
          containerClassName="pt-0"
        />

        {/* High-level performance metric summaries */}
        <div className="mt-1 px-4">
          <SummaryItem
            icon={<DoubleAvatar src1={avatar1} src2={avatar2} />}
            label="Agents Referred"
            value={loadingStats ? "..." : (stats?.agent_referrals ?? 0)}
          />

          <SummaryItem
            icon={<FancyMoneyBagIcon className="size-8" />}
            label="Potential Earnings"
            value={loadingStats ? "..." : formattedPotentialEarnings}
          />
        </div>

        {/* Referral code copy widget with active bonus incentive */}
        <div className="mt-3 space-y-2.5 px-4">
          <div className="flex items-center justify-between text-sm">
            <p className="text-white/50">Referral code:</p>
            <div className="flex items-center gap-2 font-medium text-[#FFD44D]">
              <FancyMoneyBagIcon className="size-4" />
              <span>{campaignBonusText}</span>
            </div>
          </div>

          <Button
            type="button"
            variant="leaderboardGrey"
            size="extra-large"
            onClick={() => {
              if (user?.referral_code) {
                copy(user.referral_code);
                toast.success("Copied to clipboard", {
                  position: "top-center",
                });
              } else {
                toast.error("No referral code available", {
                  position: "top-center",
                });
              }
            }}
            className="w-full"
          >
            {user?.referral_code ?? "NONE"}
          </Button>
        </div>

        {/* White rounded bottom sheet listing referred recruits */}
        <RoundedTopWrapper>
          <div className="mt-6 space-y-6">
            {loadingList ? (
              <div className="py-8 text-center text-sm text-neutral-500">
                Loading referrals...
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-neutral-500">
                <p className="text-base font-medium text-neutral-700">
                  No referrals yet
                </p>
                <p className="mt-1 text-sm text-neutral-400">
                  Share your referral code to start earning bonuses!
                </p>
              </div>
            ) : (
              items.map((item) => {
                if (!item) return null;
                const fullName =
                  `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                  "Referred User";
                // Milestone classification: Full Agent, Applied, or Signed Up
                const roleLabel =
                  item.milestone === "BECAME_AGENT"
                    ? "Agent"
                    : item.milestone === "APPLIED"
                      ? "Applied"
                      : "Signed Up";
                const formattedTime = item.created_at
                  ? new Date(item.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3"
                  >
                    {/* Recruit avatar and milestone status */}
                    <div className="flex min-w-0 items-center gap-3">
                      <AppAvatar
                        src={item.avatar}
                        alt={fullName}
                        className="size-12"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[16px] font-medium text-neutral-800">
                          {fullName}
                        </p>
                        <p className="truncate text-[15px] text-[#E5A100]">
                          {roleLabel}
                        </p>
                      </div>
                    </div>
                    {/* Registration timestamp & link action */}
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[13px] text-neutral-500">
                        {formattedTime}
                      </span>
                      <button
                        type="button"
                        className="flex size-12 items-center justify-center rounded-full bg-neutral-200 text-neutral-700 transition hover:bg-neutral-300"
                      >
                        <Link2 className="size-5 -rotate-45" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Infinite Scroll Sentinel */}
            <div
              ref={loadMoreRef}
              className="h-6 flex items-center justify-center"
            >
              {loadingMore && (
                <p className="text-xs text-neutral-400">Loading more...</p>
              )}
            </div>
          </div>
        </RoundedTopWrapper>
      </DarkBodyWrapper>
    </PageWrapper>
  );
}
