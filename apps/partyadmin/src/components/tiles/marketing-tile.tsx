import * as React from "react";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { Ellipsis } from "lucide-react";
import { formatISODate } from "@repo/ui/lib/date";

export type MarketingCampaignType = {
  id: number;
  party_id: number;
  party_name?: string;
  party_short_name?: string;
  election_group_id: number;
  election_group_name?: string;
  election_id: number;
  election_name?: string;
  plan_id: number;
  plan_name?: string;
  plan_price_kobo?: number;
  plan_color?: string;
  type: string;
  states?: { id: number; name: string }[] | string[] | any;
  duration_in_days: number;
  start_date?: string;
  end_date?: string;
  status: "pending" | "active" | "completed" | "cancelled" | string;
  budget_kobo?: number | string;
  budget_per_day_kobo?: number | string;
  referral_amount_kobo?: number | string;
  amount_spent_kobo?: number | string;
  budget: number | string;
  referral_amount?: number | string;
  amount_spent: number | string;
  created_at?: string;
  days_left?: number;
  total_days?: number;
  budget_per_day?: number | string;
};

export function MarketingTableHeader() {
  return (
    <TileHeader className="w-fit">
      <TileLeft className="min-w-fit">
        <span className="text-c-50 text-[14px] w-[110px] shrink-0 font-medium">
          Status
        </span>
        <span className="text-c-50 text-[14px] font-medium min-w-[200px] flex-1">
          Election
        </span>
      </TileLeft>
      <TileRight className="min-w-fit">
        <span className="text-c-50 text-[14px] w-[100px] shrink-0 font-medium">
          Days left
        </span>
        <span className="text-c-50 text-[14px] w-[100px] shrink-0 font-medium">
          Start date
        </span>
        <span className="text-c-50 text-[14px] w-[100px] shrink-0 font-medium">
          End date
        </span>
        <span className="text-c-50 text-[14px] w-[160px] shrink-0 font-medium">
          Election group
        </span>
        <span className="text-c-50 text-[14px] w-[120px] shrink-0 font-medium">
          Plan
        </span>
        <span className="text-c-50 text-[14px] w-[140px] shrink-0 font-medium">
          States
        </span>
        <span className="text-c-50 text-[14px] w-[140px] shrink-0 font-medium">
          Budget
        </span>
        <span className="text-c-50 text-[14px] w-[140px] shrink-0 font-medium">
          Budget (per day)
        </span>
        <span className="text-c-50 text-[14px] w-[180px] shrink-0 font-medium">
          Amount spent
        </span>
        <span className="text-c-50 text-[14px] w-[100px] shrink-0 font-medium">
          Created at
        </span>
        <div className="w-8 shrink-0 ml-2" />
      </TileRight>
    </TileHeader>
  );
}

function formatNaira(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₦0.00";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(num)
    .replace("NGN", "₦");
}

import { MarketingStatusBadge } from "@repo/ui/components/custom/marketing-status-badge";

export function MarketingTableTile({ data }: { data: MarketingCampaignType }) {
  const budgetNum =
    typeof data.budget === "string"
      ? parseFloat(data.budget)
      : data.budget || 0;
  const spentNum =
    typeof data.amount_spent === "string"
      ? parseFloat(data.amount_spent)
      : data.amount_spent || 0;
  const spentPct =
    budgetNum > 0 ? ((spentNum / budgetNum) * 100).toFixed(1) : "0.0";
  const perDayNum = data.budget_per_day
    ? data.budget_per_day
    : data.duration_in_days > 0
      ? budgetNum / data.duration_in_days
      : 0;

  const startDateLabel = data.start_date ? formatISODate(data.start_date) : "—";
  const endDateLabel = data.end_date ? formatISODate(data.end_date) : "—";
  const createdAtLabel = data.created_at ? formatISODate(data.created_at) : "—";

  // Calculate days left derived from end_date (or end_date - start_date)
  const daysLeft = React.useMemo(() => {
    if (data.days_left !== undefined) return data.days_left;
    if (!data.end_date) return data.duration_in_days || 0;
    const end = new Date(data.end_date).getTime();
    const now = Date.now();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [data.days_left, data.end_date, data.duration_in_days]);

  const totalDays = data.total_days ?? data.duration_in_days ?? 0;

  // Format states display: "FirstState, +N" or "No state"
  const statesLabel = React.useMemo(() => {
    let rawList: any[] = [];
    if (Array.isArray(data.states)) {
      rawList = data.states;
    } else if (typeof data.states === "string" && data.states.trim().length > 0) {
      try {
        const parsed = JSON.parse(data.states);
        if (Array.isArray(parsed)) rawList = parsed;
      } catch (_) {}
    }

    if (rawList.length === 0) return "No state";
    const firstName =
      typeof rawList[0] === "string"
        ? rawList[0]
        : rawList[0]?.name ?? "No state";
    if (rawList.length > 1) {
      return `${firstName}, +${rawList.length - 1}`;
    }
    return firstName;
  }, [data.states]);

  return (
    <TileRow className="w-fit">
      <TileLeft className="min-w-fit">
        <MarketingStatusBadge status={data.status} />
        <p className="truncate font-medium text-[15px] text-c-80 min-w-[200px] flex-1">
          {data.election_name || "—"}
        </p>
      </TileLeft>
      <TileRight className="min-w-fit">
        <span className="text-[15px] text-c-80 font-bold w-[100px] shrink-0">
          {daysLeft}{" "}
          <span className="text-c-50 font-normal">
            ({totalDays})
          </span>
        </span>
        <span className="text-[15px] text-c-70 w-[100px] shrink-0">
          {startDateLabel}
        </span>
        <span className="text-[15px] text-c-70 w-[100px] shrink-0">
          {endDateLabel}
        </span>
        <div className="w-[160px] shrink-0 pr-2">
          <span className="bg-c-10 dark:bg-white/10 text-c-80 font-medium text-[13px] px-2.5 py-1 rounded-md truncate inline-block max-w-full">
            {data.election_group_name || "—"}
          </span>
        </div>
        <div className="w-[120px] shrink-0 font-bold text-[15px]">
          <span style={{ color: data.plan_color || "#FF8D28" }}>
            {data.plan_name || "No Plan"}
          </span>
        </div>
        <span className="text-[15px] text-c-70 w-[140px] shrink-0 truncate">
          {statesLabel}
        </span>
        <span className="text-[15px] text-c-80 w-[140px] shrink-0">
          {formatNaira(budgetNum)}
        </span>
        <span className="text-[15px] text-c-80 w-[140px] shrink-0">
          {formatNaira(perDayNum)}
        </span>
        <span className="text-[15px] text-c-80 font-bold w-[180px] shrink-0">
          {formatNaira(spentNum)}{" "}
          <span className="text-c-50 font-normal">({spentPct}%)</span>
        </span>
        <span className="text-[15px] text-c-70 w-[100px] shrink-0">
          {createdAtLabel}
        </span>
        <button className="ml-2 w-8 shrink-0 flex items-center justify-center text-c-50 hover:text-c-90">
          <Ellipsis className="size-5" />
        </button>
      </TileRight>
    </TileRow>
  );
}
