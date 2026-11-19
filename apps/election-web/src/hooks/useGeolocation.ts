import { useState, useEffect, useCallback } from "react";

export type GeoCoordinates = {
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
};

export type UseGeolocationOptions = {
  enabled?: boolean;
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
};

export type UseGeolocationReturn = {
  geoCoords: GeoCoordinates;
  isLocating: boolean;
  geoError: string | null;
  hasLocation: boolean;
  requestLocation: () => void;
  clearError: () => void;
};

/**
 * Hook to request and track device GPS geolocation coordinates.
 *
 * Provides:
 * - `geoCoords`: Current latitude, longitude, and accuracy in meters
 * - `isLocating`: True while actively acquiring satellite / network fix
 * - `geoError`: Human-readable error message if GPS is disabled or permission denied
 * - `hasLocation`: Boolean convenience flag (true if lat & lng are defined)
 * - `requestLocation`: Triggers an active GPS acquisition request
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  // Defaults: 20s satellite fix timeout, 5-minute (300,000ms) maximum cached coordinate age
  const { enabled = true, enableHighAccuracy = true, timeout = 20000, maximumAge = 300000 } = options;

  const [geoCoords, setGeoCoords] = useState<GeoCoordinates>({});
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Trigger active browser geolocation fix
  const requestLocation = useCallback(() => {
    // Guard against environments where geolocation API is unavailable (e.g. SSR)
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGeoError("Geolocation is not supported by your browser");
      return;
    }

    // Reset previous error and start loading state
    setIsLocating(true);
    setGeoError(null);

    // Request device position with high accuracy and specified timeout
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // On success: store rounded coordinates and clear errors
        setGeoCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: Math.round(pos.coords.accuracy),
        });

        setIsLocating(false);
        setGeoError(null);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          setGeoError("Location permission denied. Please allow location in your browser / phone settings.");
        } else if (err.code === 2) {
          setGeoError("Location unavailable. Please ensure phone GPS is switched on.");
        } else if (err.code === 3) {
          setGeoError("Location request timed out. Please tap retry.");
        } else {
          setGeoError("Unable to acquire location.");
        }
      },
      { enableHighAccuracy, timeout, maximumAge },
    );
  }, [enableHighAccuracy, timeout, maximumAge]);

  // Automatically request coordinates on mount if enabled
  useEffect(() => {
    if (enabled) {
      requestLocation();
    }
  }, [enabled, requestLocation]);

  return {
    geoCoords,
    isLocating,
    geoError,
    hasLocation: Boolean(geoCoords.latitude && geoCoords.longitude),
    requestLocation,
    clearError: () => setGeoError(null),
  };
}
