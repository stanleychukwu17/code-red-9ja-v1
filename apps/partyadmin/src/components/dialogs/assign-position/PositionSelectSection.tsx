/**
 * @file Position / Office Selector
 * @description Renders the position dropdown filtered by the active chapter tier,
 * including occupancy limit indicators and custom/standard badges.
 */

import * as React from "react";
import { Loader2 } from "lucide-react";
import type { PartyPositionItem } from "#/lib/server/parties";
import type { ChapterType } from "./ChapterHierarchySection";

interface PositionSelectSectionProps {
  chapterType: ChapterType;
  positions: PartyPositionItem[];
  isLoading: boolean;
  selectedPositionId?: number;
  onSelectPosition: (positionId?: number) => void;
}

export function PositionSelectSection({
  chapterType,
  positions,
  isLoading,
  selectedPositionId,
  onSelectPosition,
}: PositionSelectSectionProps) {
  return (
    <div>
      <label className="block text-[14px] font-semibold text-c-80 mb-2">
        2. Select Position / Office
      </label>

      {isLoading ? (
        <div className="flex items-center gap-2 text-c-50 text-[14px] py-2">
          <Loader2 className="size-4 animate-spin text-orange" /> Loading positions...
        </div>
      ) : positions.length === 0 ? (
        <p className="text-[13px] text-orange bg-orange/10 border border-orange/20 p-3 rounded-xl">
          No positions configured for the {chapterType} level.
        </p>
      ) : (
        <select
          value={selectedPositionId || ""}
          onChange={(e) => onSelectPosition(e.target.value ? Number(e.target.value) : undefined)}
          className="w-full h-11 px-3 text-[14px] rounded-xl border border-border bg-background text-c-90 focus:outline-none focus:ring-1 focus:ring-orange"
        >
          <option value="">Choose a position...</option>
          {positions.map((pos) => (
            <option key={pos.id} value={pos.id}>
              {pos.name} ({pos.position_type === "custom" ? "Custom" : "Standard"} - Max: {pos.max_occupants})
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
