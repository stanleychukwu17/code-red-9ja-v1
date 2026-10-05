import { useRouteContext } from "@tanstack/react-router";
import { useAppSelector } from "#/redux/hooks";

/**
 * Shape of the authenticated party administrator or supervisor user entity.
 */
export interface UserDetails {
	id?: number;
	fake_id: number;
	username: string;
	first_name: string;
	last_name: string;
	role: string;
	avatar_url?: string;
	account_status: string;
	party_id?: number;
	party?: {
		id?: number;
		short_name?: string;
		name?: string;
		logo?: string;
		slots?: number;
		agent_payment_balance_kobo?: number;
		agent_payment_allocation_kobo?: Record<string, number>;
		created_at?: string;
		updated_at?: string;
	};
}

/**
 * Hook to retrieve the active authenticated user in partyadmin.
 * Synchronously resolves from Redux auth slice or TanStack Router root context with 0 network overhead.
 *
 * @returns The active UserDetails entity, or null if unauthenticated.
 */
export const useUser = (): UserDetails | null => {
	const reduxUser = useAppSelector((state) => state.auth.user);
	let routeUser: any = null;
	try {
		const context = useRouteContext({ from: "__root__" }) as any;
		routeUser = context?.userDetails;
	} catch (e) {
		// Router context might not be available outside component tree
	}
	return (reduxUser || routeUser || null) as UserDetails | null;
};
