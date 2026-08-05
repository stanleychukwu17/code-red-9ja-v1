import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowDownLeft, Bell, ChevronDown, Link2 } from "lucide-react";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "sonner";

import { useAuth } from "#/hooks/useAuth";
import { getPageHeader } from "#/lib/shared/meta";
import {
  DarkBodyWrapper,
  PageWrapper,
  RoundedTopWrapper,
} from "#/components/Wrappers";
import { PageHeader } from "#/components/Headers";
import { Tabs } from "#/components/Tabs";
import { Button } from "@repo/ui/components/button";
import { AppAvatar, DoubleAvatar } from "@repo/ui/components/avatar";
import { HomeHeader } from "../_home/components/HomeHeader";
import FancyMoneyBagIcon from "@repo/ui/icons/fancy-money-bag-icon";

export const Route = createFileRoute("/_authenticated/referrals/")({
  head: () => getPageHeader({ title: "Referrals" }),
  component: ReferralsPage,
});

type ReferralItem = {
  id: number;
  name: string;
  role: string;
  time: string;
  amount: string;
  avatar: string;
};

const referrals: ReferralItem[] = [
  {
    id: 1,
    name: "Aisha Mariam",
    role: "Polling agent (A)",
    time: "02:53 AM",
    amount: "+₦1000",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop",
  },
  {
    id: 2,
    name: "Aisha Mariam",
    role: "User",
    time: "02:53 AM",
    amount: "+₦1000",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop",
  },
  {
    id: 3,
    name: "Aisha Mariam",
    role: "Polling agent (A)",
    time: "02:53 AM",
    amount: "+₦1000",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=160&h=160&fit=crop",
  },
];

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
      <span className={`text-lg leading-none text-white font-medium`}>
        {value}
      </span>
    </div>
  );
}

function ReferralsPage() {
  const navigate = useNavigate();
  const { party, selectedElectionGroup } = useAuth();
  const [activeTab, setActiveTab] = useState<"Earnings" | "Referred">(
    "Earnings",
  );
  const [_, copy] = useCopyToClipboard();

  const referralCode = "DAN-40";
  const partyName = party?.shortName || party?.name || "Accord";
  const electionLabel =
    selectedElectionGroup?.name || "2026 Governorship Election (Osun)";

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

  const summary = useMemo(
    () => ({
      referredCount: 53,
      earnings: "₦53,000",
      rank: "#1",
    }),
    [],
  );

  return (
    <PageWrapper>
      <DarkBodyWrapper>
        <PageHeader
          title="Referrals"
          className="px-2 pb-2 pt-3 text-white"
          buttonClassName="[&_svg]:text-white"
          onBackClick={() => navigate({ to: "/" })}
        />

        <HomeHeader
          daysLeft={daysLeft}
          avatarImage={party.logo}
          textClassName="text-white"
          containerClassName="pt-0"
        />

        <div className="mt-1 px-4">
          <SummaryItem
            icon={
              <DoubleAvatar
                src1="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop"
                src2="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop"
              />
            }
            label="Agents Referred"
            value={summary.referredCount}
          />

          <SummaryItem
            icon={<FancyMoneyBagIcon className="size-8" />}
            label="Earnings"
            value={summary.earnings}
          />
        </div>

        <div className="mt-3 space-y-2.5 px-4">
          <div className="flex items-center justify-between text-sm">
            <p className="text-white/50">Referral code:</p>
            <div className="flex items-center gap-2 font-medium text-[#FFD44D]">
              <FancyMoneyBagIcon className="size-4" />
              <span>1k per agent referred</span>
            </div>
          </div>

          <Button
            type="button"
            variant="leaderboardGrey"
            size="extra-large"
            onClick={() => {
              copy(referralCode);
              toast.success("Copied to clipboard", {
                position: "top-center",
              });
            }}
            className="w-full"
          >
            {referralCode}
          </Button>
        </div>

        <RoundedTopWrapper>
          {/* <p className="mb-4 text-sm text-neutral-500">{partyName}</p> */}
          <Tabs
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as "Earnings" | "Referred")}
            tabs={[
              { label: "Earnings", value: "Earnings" },
              { label: "Referred", value: "Referred" },
            ]}
            className="rounded-[12px] bg-neutral-100 p-1.5"
          />

          <div className="mt-7 space-y-6">
            {activeTab === "Earnings"
              ? referrals.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-black">
                        <ArrowDownLeft className="size-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[16px] font-semibold text-neutral-800">
                          Agent referred successfully
                        </p>
                        <p className="text-[15px] text-neutral-500">
                          {item.time}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[18px] font-extrabold text-black">
                      {item.amount}
                    </span>
                  </div>
                ))
              : referrals.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <AppAvatar
                        src={item.avatar}
                        alt={item.name}
                        className="size-12"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[16px] font-medium text-neutral-800">
                          {item.name}
                        </p>
                        <p className="truncate text-[15px] text-[#E5A100]">
                          {item.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[13px] text-neutral-500">
                        {item.time}
                      </span>
                      <button
                        type="button"
                        className="flex size-12 items-center justify-center rounded-full bg-neutral-200 text-neutral-700 transition hover:bg-neutral-300"
                      >
                        <Link2 className="size-5 -rotate-45" />
                      </button>
                    </div>
                  </div>
                ))}
          </div>
        </RoundedTopWrapper>
      </DarkBodyWrapper>
    </PageWrapper>
  );
}
