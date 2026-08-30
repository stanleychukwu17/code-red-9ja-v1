import { useEffect } from "react";
import { useAppDispatch } from "#/redux/hooks";
import { refreshUserToken } from "#/lib/server/auth/auth";
import { updateAuthState } from "#/redux/slice/authSlice";
import { useQuery } from "@tanstack/react-query";

// This component is used to restore the auth session on page refresh,
// It will automatically refresh the accessToken and refreshToken every 14 minutes
// and clear the auth data if the refreshToken is invalid or missing
export default function LoadAuthSession() {
  const dispatch = useAppDispatch();

  const { data: response, error } = useQuery({
    queryKey: ["authSession"],
    queryFn: refreshUserToken,
    refetchInterval: 14 * 60 * 1000, // 14minutes interval since the jwt token expire in 15mins
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    dispatch(updateAuthState({ userHydrated: true }));

    if (response?.status === "success" && response.user) {
      dispatch(updateAuthState({ user: response.user }));
    } else if (error || response?.status === "error") {
      dispatch(updateAuthState({ user: null }));
    }
  }, [response, error, dispatch]);

  return null;
}
