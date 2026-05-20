import { useEffect } from "react";
import { useAppDispatch } from "@/redux/hooks";
import { setAuthData, clearAuthData } from "@/redux/slice/authSlice";
import { refreshUserToken } from "@/lib/server/auth";

export default function LoadAuthSession() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await refreshUserToken({});
        if (response.status === "success") {
          dispatch(
            setAuthData({
              user: response.user,
              accessToken: response.accessToken,
            })
          );
        } else {
          // If refresh token validation fails or is missing, ensure state is cleared
          dispatch(clearAuthData());
        }
      } catch (error) {
        console.error("Failed to restore auth session:", error);
        dispatch(clearAuthData());
      }
    };

    // Restore session immediately on mount / page refresh
    restoreSession();

    // Periodically refresh the token every 14 minutes (since access token expires in 15 minutes)
    const interval = setInterval(restoreSession, 14 * 60 * 1000);

    return () => clearInterval(interval);
  }, [dispatch]);

  return null;
}
