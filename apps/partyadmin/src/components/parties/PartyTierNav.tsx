import * as React from "react";
import { getAllCountries, getStates, getZones } from "#/lib/server/countries";
import { getLGAs, getWards } from "#/lib/server/applications";
import { SelectCountry } from "@repo/ui/components/selects/country-select";
import { SelectZone } from "@repo/ui/components/selects/zone-select";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import { cn } from "@repo/ui/lib/utils";

export interface PartyTierNavProps {
  chapterTier: string;
  onTierChange: (tier: string) => void;
  selectedCountryId?: number;
  onCountryChange?: (countryId?: number) => void;
  selectedZonalId?: number;
  onZonalChange?: (zonalId?: number) => void;
  selectedStateId?: number;
  onStateChange?: (stateId?: number) => void;
  selectedLgaId?: number;
  onLgaChange?: (lgaId?: number) => void;
  selectedWardId?: number;
  onWardChange?: (wardId?: number) => void;
  className?: string;
}

export const TIER_TABS = [
  { key: "national", label: "National" },
  { key: "zonal", label: "Zonal" },
  { key: "state", label: "State" },
  { key: "lga", label: "LGA" },
  { key: "ward", label: "Ward" },
] as const;

/**
 * PartyTierNav Component
 * Encapsulates chapter tier navigation tabs along with contextual cascading
 * geographic selectors (Country, Zone, State, LGA, Ward) using custom UI select components.
 */
export function PartyTierNav({
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
  className,
}: PartyTierNavProps) {
  // Handle tier switch and reset all subordinate filters
  const handleTierChange = (tier: string) => {
    onTierChange(tier);
    onCountryChange?.(tier === "national" ? 161 : undefined);
    onZonalChange?.(undefined);
    onStateChange?.(undefined);
    onLgaChange?.(undefined);
    onWardChange?.(undefined);
  };

  // Handle country selection and reset child region filters
  const handleCountryChange = (countryId?: number) => {
    onCountryChange?.(countryId);
    onStateChange?.(undefined);
    onLgaChange?.(undefined);
    onWardChange?.(undefined);
  };

  // Handle state selection and reset downstream LGA and Ward filters
  const handleStateChange = (stateId?: number) => {
    onStateChange?.(stateId);
    onLgaChange?.(undefined);
    onWardChange?.(undefined);
  };

  // Handle LGA selection and reset downstream Ward filter
  const handleLgaChange = (lgaId?: number) => {
    onLgaChange?.(lgaId);
    onWardChange?.(undefined);
  };

  return (
    <div className={cn("gap-y-2", className)}>
      {/* Tier Tabs Navigation */}
      <div className="min-w-140 flex items-center p-1 bg-c-10 dark:bg-card border border-transparent dark:border-border rounded-xl overflow-x-auto">
        {TIER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTierChange(tab.key)}
            className={`grow px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition whitespace-nowrap
              ${chapterTier === tab.key ? "bg-background text-c-90 shadow-xs" : "text-c-60 hover:text-c-90"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {["national", "zonal", "state", "lga", "ward"].includes(chapterTier) && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {/* Custom Select: Country (when National is selected) */}
          {chapterTier === "national" && (
            <div className="w-44">
              <SelectCountry
                selectedId={selectedCountryId}
                update={(country) => {
                  handleCountryChange(country?.id ? Number(country.id) : undefined);
                }}
                fetchCountries={getAllCountries}
                showAll
                size="sm"
                className="w-full"
              />
            </div>
          )}

          {/* Custom Select: Zone (when Zonal is selected) */}
          {chapterTier === "zonal" && (
            <div className="w-44">
              <SelectZone
                selectedId={selectedZonalId}
                update={(zone) => {
                  onZonalChange?.(zone?.id ? Number(zone.id) : undefined);
                }}
                fetchZones={getZones}
                showAll="All Zones"
                size="sm"
                className="w-full"
              />
            </div>
          )}

          {/* Custom Select: State (when State, LGA, or Ward is selected) */}
          {["state", "lga", "ward"].includes(chapterTier) && (
            <div className="w-44">
              <SelectState
                selectedId={selectedStateId}
                update={(state) => {
                  handleStateChange(state?.id ? Number(state.id) : undefined);
                }}
                fetchStates={getStates}
                countryOriginalId={selectedCountryId || 161}
                showAll
                size="sm"
                className="w-full"
              />
            </div>
          )}

          {/* Custom Select: LGA (when LGA or Ward is selected) */}
          {["lga", "ward"].includes(chapterTier) && (
            <div className="w-44">
              <SelectLga
                selectedId={selectedLgaId}
                update={(lga) => {
                  handleLgaChange(lga?.id ? Number(lga.id) : undefined);
                }}
                fetchLGAs={getLGAs}
                stateId={selectedStateId}
                disabled={!selectedStateId}
                showAll
                size="sm"
                className="w-full"
              />
            </div>
          )}

          {/* Custom Select: Ward (when Ward is selected) */}
          {chapterTier === "ward" && (
            <div className="w-44">
              <SelectWard
                selectedId={selectedWardId}
                update={(ward) => {
                  onWardChange?.(ward?.id ? Number(ward.id) : undefined);
                }}
                fetchWards={getWards}
                lgaId={selectedLgaId}
                stateId={selectedStateId}
                disabled={!selectedLgaId}
                showAll
                size="sm"
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
