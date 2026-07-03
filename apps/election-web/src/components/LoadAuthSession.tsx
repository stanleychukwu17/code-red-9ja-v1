import { useEffect } from "react";
import { useAppDispatch } from "#/redux/hooks";
import { refreshUserToken } from "#/lib/server/auth/auth";
import { updateAuthState } from "#/redux/slice/authSlice";

// This component is used to restore the auth session on page refresh,
// It will automatically refresh the accessToken and refreshToken every 14 minutes
// and clear the auth data if the refreshToken is invalid or missing
export default function LoadAuthSession() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const refreshSession = async () => {
      try {
        const response = await refreshUserToken();

        if (response.status === "success") {
          const user = response.user;
          if (user) dispatch(updateAuthState({ user }));
        }
      } catch (error) {
        dispatch(updateAuthState({ user: null }));
        console.error(`Error refreshing user token: `, error);
      }
    };

    // Initial refresh on mount
    refreshSession();
    dispatch(updateAuthState({ userHydrated: true }));

    // Periodically refresh the token every 14 minutes (since access token expires in 15 minutes)
    const interval = setInterval(() => refreshSession(), 14 * 60 * 1000); // refresh every 14 minutes until done

    return () => clearInterval(interval);
  }, [dispatch]);

  return null;
}
