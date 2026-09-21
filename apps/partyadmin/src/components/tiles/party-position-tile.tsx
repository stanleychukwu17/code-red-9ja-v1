/**
 * @file Party Position Assignment Table Header & Tile Components
 * @description Renders table rows for officials assigned to constitutional and custom party positions.
 * Displays official avatar, display title, chapter jurisdiction, appointment type badge, and actions.
 */

import * as React from "react";
import {
  TileHeader,
  TileLeft,
  TileRight,
  TileRow,
} from "@repo/ui/components/tiles";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { MoreHorizontal, UserX, Calendar, ShieldCheck, MapPin } from "lucide-react";
import type { PartyOfficialItem } from "#/lib/server/parties";

export function PartyPositionTableHeader() {
  return (
    <TileHeader>
      <TileLeft>
        <p className="truncate w-full text-[16px] font-medium text-c-80">
          Party official
        </p>
      </TileLeft>

      <TileRight>
        <p className="text-c-50 text-[14px] w-52 hidden md:block">
          Position / Display title
        </p>
        <p className="text-c-50 text-[14px] w-36 hidden lg:block">
          Chapter jurisdiction
        </p>
        <p className="text-c-50 text-[14px] w-32 hidden sm:block">
          Appointment type
        </p>
        <p className="text-c-50 text-[14px] w-28 hidden xl:block">
          Tenure
        </p>
        <div className="ml-2 shrink-0 size-7" />
      </TileRight>
    </TileHeader>
  );
}

const APPOINTMENT_TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  substantive: {
    bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
    label: "Substantive",
    text: "text-emerald-700",
  },
  acting: {
    bg: "bg-sky-50 border-sky-200 text-sky-700",
    label: "Acting",
    text: "text-sky-700",
  },
  caretaker: {
    bg: "bg-amber-50 border-amber-200 text-amber-700",
    label: "Caretaker",
    text: "text-amber-700",
  },
  interim: {
    bg: "bg-purple-50 border-purple-200 text-purple-700",
    label: "Interim",
    text: "text-purple-700",
  },
};

export function PartyPositionTableTile({
  official,
  onVacate,
}: {
  official: PartyOfficialItem;
  onVacate?: (official: PartyOfficialItem) => void;
}) {
  const fullName = [official.first_name, official.middle_name, official.last_name]
    .filter(Boolean)
    .join(" ") || "Unnamed Official";

  const appt = APPOINTMENT_TYPE_STYLES[official.appointment_type] || {
    bg: "bg-gray-50 border-gray-200 text-gray-700",
    label: official.appointment_type,
    text: "text-gray-700",
  };

  const tenureStartDate = official.tenure_start
    ? new Date(official.tenure_start).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
    : "-";

  return (
    <TileRow className="hover:bg-[#fafafa] transition-colors">
      <TileLeft>
        <div className="size-10 rounded-full bg-[#f3f4f6] text-c-70 font-semibold text-[15px] flex items-center justify-center shrink-0 overflow-hidden border border-[#e5e7eb]">
          {official.avatar ? (
            <img
              src={official.avatar}
              alt={fullName}
              className="size-full object-cover"
            />
          ) : (
            <span>
              {official.first_name?.charAt(0) || "U"}
              {official.last_name?.charAt(0) || ""}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-[#1f2937]">
            {fullName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {official.username ? (
              <span className="text-[13px] text-c-50 truncate">
                @{official.username}
              </span>
            ) : null}
            {official.position_type === "custom" ? (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#fff7ed] text-[#ea580c] font-medium border border-[#ffedd5]">
                Custom
              </span>
            ) : null}
          </div>
        </div>
      </TileLeft>

      <TileRight>
        {/* Position / Display Title */}
        <div className="w-52 hidden md:block">
          <p className="text-[14px] font-medium text-[#ff9a3c] truncate">
            {official.display_title || official.position_name}
          </p>
          <p className="text-[12px] text-c-40 truncate">
            {official.position_name}
          </p>
        </div>

        {/* Chapter Jurisdiction */}
        <div className="w-36 hidden lg:block">
          <span className="inline-flex items-center gap-1 text-[13px] text-c-70 font-medium capitalize">
            <MapPin className="size-3.5 text-c-40 shrink-0" />
            <span className="truncate">
              {official.chapter_type === "national"
                ? "National"
                : official.geo_name
                  ? `${official.geo_name} (${official.chapter_type.toUpperCase()})`
                  : official.chapter_type}
            </span>
          </span>
        </div>

        {/* Appointment Type Badge */}
        <div className="w-32 hidden sm:block">
          <span
            className={`inline-block px-2.5 py-1 text-[12px] font-medium rounded-full border ${appt.bg}`}
          >
            {appt.label}
          </span>
        </div>

        {/* Tenure */}
        <div className="w-28 hidden xl:block">
          <p className="text-[13px] text-c-60 flex items-center gap-1.5">
            <Calendar className="size-3.5 text-c-40 shrink-0" />
            <span>{tenureStartDate}</span>
          </p>
        </div>

        {/* Row Action Menu */}
        <div className="ml-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="size-8 flex items-center justify-center rounded-lg hover:bg-[#eef0f2] text-c-50 hover:text-c-80 transition"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                className="text-red-600 focus:text-red-700 cursor-pointer flex items-center gap-2"
                onClick={() => onVacate?.(official)}
              >
                <UserX className="size-4" />
                <span>Vacate Office</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TileRight>
    </TileRow>
  );
}
