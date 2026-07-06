import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { updateSiteState } from "@/redux/slice/siteSlice";
import { fetchCountryDetailsFromLocalIPService } from "@/lib/client/ip";

export default function LoadVisitorDetails() {
  const dispatch = useAppDispatch();
  const visitorDetails = useAppSelector((state) => state.site.visitorDetails);

  useEffect(() => {
    // If we already have the visitor details in Redux, do nothing
    if (visitorDetails) return;

    const fetchIpDetails = async () => {
      const response = await fetchCountryDetailsFromLocalIPService();
      if (response && response.success && response.data) {
        dispatch(updateSiteState({
          visitorDetails: response.data,
        }));

        const ip = response.data.ip;
        document.cookie = `client_ip=${encodeURIComponent(ip)}; path=/; max-age=2592000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
      } else {
        // Fallback or error case
        dispatch(updateSiteState({
          visitorDetails: { ip: "unknown", location: { country: "Nigeria" } },
        }));
        document.cookie = `client_ip=unknown; path=/; max-age=2592000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
      }
    };

    fetchIpDetails();
  }, [visitorDetails, dispatch]);

  return null;
}
