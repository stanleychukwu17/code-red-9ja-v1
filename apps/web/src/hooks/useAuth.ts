import { useAppSelector } from "#/redux/hooks";

/**
 * Hook to access real-time authenticated user state and hydration status.
 * State is reactively derived from Redux (auth slice).
 */
export function useAuth() {
	const { user, userHydrated } = useAppSelector((state) => state.auth);

	return {
		user,
		isHydrated: userHydrated,
		isLoggedIn: Boolean(user),
	};
}

/**
 * Convenience hook returning boolean flag indicating if the current user is authenticated.
 */
export function useIsUserLoggedIn(): boolean {
	const { isLoggedIn } = useAuth();
	return isLoggedIn;
}
