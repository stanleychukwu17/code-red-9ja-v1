import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppDispatch } from "#/redux/hooks";
import { refreshUserToken } from "#/lib/server/auth/auth";
import { updateAuthState } from "#/redux/slice/authSlice";

// This component is used to restore the auth session on page refresh,
// It will automatically refresh the accessToken and refreshToken every 14 minutes
// and clear the auth data if the refreshToken is invalid or missing
export default function LoadAuthSession() {
  const dispatch = useAppDispatch();

  const { isError } = useQuery({
    queryKey: ["authSession"],
    queryFn: async () => {
      const response = await refreshUserToken();
      if (response.success && response.data?.user) {
        dispatch(updateAuthState({ user: response.data.user }));
        return response.data.user;
      }
      throw new Error(response.message || "Failed to refresh token");
    },
    refetchInterval: 14 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    dispatch(updateAuthState({ userHydrated: true }));
  }, [dispatch]);

  useEffect(() => {
    if (isError) {
      dispatch(updateAuthState({ user: null }));
    }
  }, [isError, dispatch]);

  return null;
}
