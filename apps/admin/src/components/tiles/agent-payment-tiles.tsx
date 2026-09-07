import * as React from "react";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { AppAvatar } from "@repo/ui/components/avatar";
import type { ElectionPayItem, ReferralPayItem } from "#/lib/server/agent-payments";
import { Loader2 } from "lucide-react";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getReasonColor(reason?: string) {
  if (!reason) return "text-c-50";
  const lower = reason.toLowerCase();
  if (lower.includes("results not uploaded")) return "text-[#EF4444]";
  return "text-[#F59E0B]";
}

// ─── Election Pay Table Header ─────────────────────────────────────────────────

export function ElectionPayTableHeader({
  status = "unpaid",
}: {
  status?: "unpaid" | "paid" | "ineligible";
}) {
  return (
    <TileHeader>
      <TileLeft className="min-w-[240px]">
        <span className="text-c-90 font-bold text-[14px]">User</span>
      </TileLeft>
      <TileRight className="text-sm text-c-50 font-medium">
        <span className="w-[100px] text-left">Party</span>
        <span className="w-[180px] text-left">Role</span>
        {status === "paid" ? (
          <>
            <span className="w-[180px] text-left">Paid amount</span>
            <span className="w-[140px] text-left">Paid at</span>
          </>
        ) : status === "ineligible" ? (
          <>
            <span className="w-[180px] text-left">Earned amount</span>
            <span className="w-[180px] text-left">Reason</span>
            <div className="w-[90px] shrink-0" />
          </>
        ) : (
          <>
            <span className="w-[180px] text-left">Earned amount</span>
            <div className="w-[90px] shrink-0" />
          </>
        )}
      </TileRight>
    </TileHeader>
  );
}

// ─── Election Pay Table Tile ───────────────────────────────────────────────────

export function ElectionPayTableTile({
  data,
  status = "unpaid",
  onPay,
  isPaying = false,
}: {
  data: ElectionPayItem;
  status?: "unpaid" | "paid" | "ineligible";
  onPay?: (item: ElectionPayItem) => void;
  isPaying?: boolean;
}) {
  return (
    <TileRow>
      <TileLeft className="min-w-[240px]">
        <div className="flex items-center gap-3">
          <AppAvatar
            src={data.user_avatar}
            alt={data.user_name}
            fallbackText={data.user_name?.slice(0, 2).toUpperCase()}
            className="size-9 rounded-full ring-1 ring-c-20 shrink-0"
          />
          <span className="text-[14px] text-c-80 font-medium truncate">
            {data.user_name}
          </span>
        </div>
      </TileLeft>
      <TileRight className="min-w-fit gap-4 items-center text-[13.5px]">
        {/* Party */}
        <span className="w-[100px] text-left text-c-80 font-medium">
          {data.party_code || "—"}
        </span>

        {/* Role */}
        <span className="w-[180px] text-left text-c-80">
          {data.role || "Polling agent"}
        </span>

        {status === "paid" ? (
          <>
            {/* Paid amount */}
            <div className="w-[180px] text-left">
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                {data.earned_amount}
              </span>{" "}
              <span className="text-c-50 font-normal">
                ({data.earned_percentage ?? 0}%)
              </span>
            </div>

            {/* Paid at date */}
            <span className="w-[140px] text-left text-c-80">
              {data.paid_at || "—"}
            </span>
          </>
        ) : status === "ineligible" ? (
          <>
            {/* Earned amount */}
            <div className="w-[180px] text-left">
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                {data.earned_amount}
              </span>{" "}
              <span className="text-c-50 font-normal">
                ({data.earned_percentage ?? 0}%)
              </span>
            </div>

            {/* Reason */}
            <span className={`w-[180px] text-left font-medium ${getReasonColor(data.reason)}`}>
              {data.reason || "Incomplete requirements"}
            </span>

            {/* Pay Button */}
            <div className="w-[90px] flex justify-end">
              <button
                type="button"
                disabled={isPaying}
                onClick={(e) => {
                  e.stopPropagation();
                  onPay?.(data);
                }}
                className="bg-[#00D084] hover:bg-[#00B974] disabled:opacity-50 text-neutral-900 font-semibold px-5 py-1.5 rounded-full text-[13.5px] transition-colors flex items-center justify-center min-w-[68px]"
              >
                {isPaying ? <Loader2 className="size-4 animate-spin" /> : "Pay"}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Earned amount */}
            <div className="w-[180px] text-left">
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                {data.earned_amount}
              </span>{" "}
              <span className="text-c-50 font-normal">
                ({data.earned_percentage ?? 0}%)
              </span>
            </div>

            {/* Pay Button */}
            <div className="w-[90px] flex justify-end">
              <button
                type="button"
                disabled={isPaying}
                onClick={(e) => {
                  e.stopPropagation();
                  onPay?.(data);
                }}
                className="bg-[#00D084] hover:bg-[#00B974] disabled:opacity-50 text-neutral-900 font-semibold px-5 py-1.5 rounded-full text-[13.5px] transition-colors flex items-center justify-center min-w-[68px]"
              >
                {isPaying ? <Loader2 className="size-4 animate-spin" /> : "Pay"}
              </button>
            </div>
          </>
        )}
      </TileRight>
    </TileRow>
  );
}

// ─── Referral Pay Table Header ─────────────────────────────────────────────────

export function ReferralPayTableHeader({
  status = "unpaid",
}: {
  status?: "unpaid" | "paid";
}) {
  return (
    <TileHeader>
      <TileLeft className="min-w-[260px]">
        <span className="text-c-90 font-bold text-[14px]">User</span>
      </TileLeft>
      <TileRight className="text-sm text-c-50 font-medium">
        <span className="w-[180px] text-left">Ag. w/ duties completed</span>
        <span className="w-[140px] text-left">Agents referred</span>
        <span className="w-[140px] text-left">Total referrals</span>
        {status === "paid" ? (
          <>
            <span className="w-[180px] text-left">Paid amount</span>
            <span className="w-[140px] text-left">Paid at</span>
          </>
        ) : (
          <>
            <span className="w-[180px] text-left">Earned amount</span>
            <div className="w-[90px] shrink-0" />
          </>
        )}
      </TileRight>
    </TileHeader>
  );
}

// ─── Referral Pay Table Tile ───────────────────────────────────────────────────

export function ReferralPayTableTile({
  data,
  status = "unpaid",
  onPay,
  isPaying = false,
}: {
  data: ReferralPayItem;
  status?: "unpaid" | "paid";
  onPay?: (item: ReferralPayItem) => void;
  isPaying?: boolean;
}) {
  return (
    <TileRow>
      <TileLeft className="min-w-[260px]">
        <div className="flex items-center gap-3">
          <AppAvatar
            src={data.user_avatar}
            alt={data.user_name}
            fallbackText={data.user_name?.slice(0, 2).toUpperCase()}
            className="size-9 rounded-full ring-1 ring-c-20 shrink-0"
          />
          <span className="text-[14px] text-c-80 font-medium truncate">
            {data.user_label || data.user_name}
          </span>
        </div>
      </TileLeft>
      <TileRight className="min-w-fit gap-4 items-center text-[13.5px]">
        {/* Ag. w/ duties completed */}
        <span className="w-[180px] text-left text-c-80">
          {data.duties_completed_formatted}
        </span>

        {/* Agents referred */}
        <span className="w-[140px] text-left text-c-80">
          {data.agent_referrals?.toLocaleString() ?? 0}
        </span>

        {/* Total referrals */}
        <span className="w-[140px] text-left text-c-80">
          {data.total_referrals?.toLocaleString() ?? 0}
        </span>

        {status === "paid" ? (
          <>
            {/* Paid amount */}
            <div className="w-[180px] text-left">
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                {data.earned_amount}
              </span>
            </div>

            {/* Paid at */}
            <span className="w-[140px] text-left text-c-80">
              {data.paid_at || "—"}
            </span>
          </>
        ) : (
          <>
            {/* Earned amount */}
            <div className="w-[180px] text-left">
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                {data.earned_amount}
              </span>
            </div>

            {/* Pay Button */}
            <div className="w-[90px] flex justify-end">
              <button
                type="button"
                disabled={isPaying}
                onClick={(e) => {
                  e.stopPropagation();
                  onPay?.(data);
                }}
                className="bg-[#00D084] hover:bg-[#00B974] disabled:opacity-50 text-neutral-900 font-semibold px-5 py-1.5 rounded-full text-[13.5px] transition-colors flex items-center justify-center min-w-[68px]"
              >
                {isPaying ? <Loader2 className="size-4 animate-spin" /> : "Pay"}
              </button>
            </div>
          </>
        )}
      </TileRight>
    </TileRow>
  );
}
