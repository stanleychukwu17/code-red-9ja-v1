import { Button } from "@repo/ui/components/button";
import { AlertTriangle, MapPin, Loader2, RotateCw } from "lucide-react";
import type { GeoCoordinates } from "#/hooks/useGeolocation";

export type LocationStatusBannerProps = {
  geoCoords: GeoCoordinates;
  isLocating: boolean;
  geoError: string | null;
  onRequestLocation: () => void;
};

/**
 * Banner displaying GPS acquisition status or warning when coordinates are missing.
 */
export function LocationStatusBanner({
  geoCoords,
  isLocating,
  geoError,
  onRequestLocation,
}: LocationStatusBannerProps) {
  const hasCoords = Boolean(geoCoords.latitude && geoCoords.longitude);

  if (isLocating) {
    return (
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground">
        <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
        <span>Acquiring polling unit GPS location...</span>
      </div>
    );
  }

  if (hasCoords) {
    return (
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            GPS location verified {geoCoords.accuracyMeters ? `(±${geoCoords.accuracyMeters}m accuracy)` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={onRequestLocation}
          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
        >
          <RotateCw className="size-3" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-amber-950 dark:text-amber-100">
            Location not detected
          </p>
          <p className="text-amber-800/90 dark:text-amber-300/90">
            Updates without verified polling unit coordinates will cause a{" "}
            <span className="font-bold underline">reduction in payment</span>.
            {geoError ? ` (${geoError})` : ""}
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onRequestLocation}
        className="shrink-0 h-7 text-xs px-2.5 font-semibold bg-amber-100/60 hover:bg-amber-100 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100 cursor-pointer"
      >
        <RotateCw className="size-3 mr-1" />
        Enable GPS
      </Button>
    </div>
  );
}
