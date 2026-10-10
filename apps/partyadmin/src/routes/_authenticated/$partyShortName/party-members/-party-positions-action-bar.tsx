/**
 * @file Party Positions Action Bar
 * @description Top action bar with chapter tier navigation and action buttons (Catalog).
 */

import * as React from "react";
import { Button } from "@repo/ui/components/button";
import { BookOpen } from "lucide-react";
import { PartyTierNav } from "./-party-tier-nav";

export interface PartyPositionsActionBarProps {
  chapterTier: string;
  onTierChange: (tier: string) => void;
  selectedCountryId?: number;
  onCountryChange: (id?: number) => void;
  selectedZonalId?: number;
  onZonalChange: (id?: number) => void;
  selectedStateId?: number;
  onStateChange: (id?: number) => void;
  selectedLgaId?: number;
  onLgaChange: (id?: number) => void;
  selectedWardId?: number;
  onWardChange: (id?: number) => void;
  onOpenCatalog: () => void;
}

/**
 * Top action bar with chapter tier navigation and action buttons (Catalog).
 */
export function PartyPositionsActionBar({
  chapterTier,
  onTierChange,
  selectedCountryId,
  onCountryChange,
  selectedZonalId,
  onZonalChange,
  selectedStateId,
  onStateChange,
  selectedLgaId,
  onLgaChange,
  selectedWardId,
  onWardChange,
  onOpenCatalog,
}: PartyPositionsActionBarProps) {
  return (
    <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 mb-4">
      {/* Tier Tabs Navigation with Inline Dynamic Geographic Selectors */}
      <PartyTierNav
        chapterTier={chapterTier}
        onTierChange={onTierChange}
        selectedCountryId={selectedCountryId}
        onCountryChange={onCountryChange}
        selectedZonalId={selectedZonalId}
        onZonalChange={onZonalChange}
        selectedStateId={selectedStateId}
        onStateChange={onStateChange}
        selectedLgaId={selectedLgaId}
        onLgaChange={onLgaChange}
        selectedWardId={selectedWardId}
        onWardChange={onWardChange}
      />

      {/* Action Buttons: Catalog */}
      <div className="flex items-center gap-2.5">
        <Button
          type="button"
          variant="ghost"
          onClick={onOpenCatalog}
          className="h-10 px-3.5 rounded-xl bg-sidebar-mobile hover:bg-sidebar-mobile/80 text-c-70 text-[13px] font-medium flex items-center gap-2"
        >
          <BookOpen className="size-4 text-c-50" />
          <span>Position Catalog</span>
        </Button>
      </div>
    </div>
  );
}
