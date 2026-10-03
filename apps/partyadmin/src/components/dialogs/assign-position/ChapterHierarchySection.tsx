/**
 * @file Chapter Hierarchy Selector
 * @description Allows selecting chapter level (National, Zonal, State, LGA, Ward)
 * and cascades down to specific State, LGA, or Ward entity selection.
 */

import * as React from "react";

export type ChapterType = "national" | "zonal" | "state" | "lga" | "ward";

interface ChapterHierarchySectionProps {
  chapterType: ChapterType;
  onChapterTypeChange: (type: ChapterType) => void;
  selectedStateId?: number;
  onStateChange: (stateId: number) => void;
  selectedLgaId?: number;
  onLgaChange: (lgaId: number) => void;
  selectedWardId?: number;
  onWardChange: (wardId: number) => void;
  statesList: Array<{ id: number; name: string }>;
  lgasList: Array<{ id: number; name: string }>;
  wardsList: Array<{ id: number; name: string }>;
}

export function ChapterHierarchySection({
  chapterType,
  onChapterTypeChange,
  selectedStateId,
  onStateChange,
  selectedLgaId,
  onLgaChange,
  selectedWardId,
  onWardChange,
  statesList,
  lgasList,
  wardsList,
}: ChapterHierarchySectionProps) {
  const tiers: ChapterType[] = ["national", "zonal", "state", "lga", "ward"];

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[14px] font-semibold text-c-80 mb-2">
          1. Select Chapter Tier
        </label>
        <div className="grid grid-cols-5 gap-2">
          {tiers.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => onChapterTypeChange(tier)}
              className={`py-2 px-3 text-[13px] font-medium rounded-xl border transition capitalize ${
                chapterType === tier
                  ? "bg-orange text-white border-orange shadow-sm"
                  : "bg-hover-3 text-c-70 border-border hover:bg-hover-5"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Geographic Entity Pickers (State / LGA / Ward) */}
      {["state", "lga", "ward"].includes(chapterType) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-c-5 rounded-xl border border-border">
          <div>
            <label className="block text-[12px] font-medium text-c-60 mb-1">State</label>
            <select
              value={selectedStateId || ""}
              onChange={(e) => onStateChange(Number(e.target.value))}
              className="w-full h-10 px-3 text-[14px] rounded-lg border border-border bg-background text-c-90 focus:outline-none focus:ring-1 focus:ring-orange"
            >
              <option value="">Select State</option>
              {statesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {["lga", "ward"].includes(chapterType) && (
            <div>
              <label className="block text-[12px] font-medium text-c-60 mb-1">LGA</label>
              <select
                value={selectedLgaId || ""}
                onChange={(e) => onLgaChange(Number(e.target.value))}
                disabled={!selectedStateId}
                className="w-full h-10 px-3 text-[14px] rounded-lg border border-border bg-background text-c-90 focus:outline-none focus:ring-1 focus:ring-orange disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select LGA</option>
                {lgasList.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {chapterType === "ward" && (
            <div>
              <label className="block text-[12px] font-medium text-c-60 mb-1">Ward</label>
              <select
                value={selectedWardId || ""}
                onChange={(e) => onWardChange(Number(e.target.value))}
                disabled={!selectedLgaId}
                className="w-full h-10 px-3 text-[14px] rounded-lg border border-border bg-background text-c-90 focus:outline-none focus:ring-1 focus:ring-orange disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select Ward</option>
                {wardsList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
