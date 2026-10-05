import { useRouteContext } from "@tanstack/react-router";
import { useAppSelector } from "#/redux/hooks";

/**
 * Shape of the authenticated user's profile and session details.
 */
export interface UserDetails {
	id: number;
	fake_id?: number;
	email?: string;
	avatar?: string;
	phone?: string;
	username?: string;
	referral_code?: string;
	last_name?: string;
	first_name?: string;
	middle_name?: string;
	gender?: string;
	role?: string;
	role_level?: string;
	account_status?: string;
	party_id?: number;
	polling_unit_id?: number;
	current_state?: number;
	current_lga?: number;
	current_ward?: number;
	whatsapp_phone?: string;
	data_phone?: string;
	educational_status?: string;
	highest_degree?: string;
	graduation_year?: string;
	school_name?: string;
	voters_card_image?: string;
	address?: string;
	party?: {
		id?: number;
		short_name?: string;
		name?: string;
		logo?: string;
		slots?: number;
		agent_payment_balance_kobo?: number;
		agent_payment_allocation?: Record<string, number>;
		created_at?: string;
		updated_at?: string;
	};
}

/**
 * Hook to retrieve the current authenticated user.
 *
 * Resolves user from active client session (Redux) or SSR/pre-hydration
 * state (TanStack Router route context) with zero network overhead.
 *
 * @returns The active `UserDetails` object, or `null` if unauthenticated
 */
export const useUser = (): UserDetails | null => {
	const routerContext = useRouteContext({ strict: false }) as any;
	const reduxUser = useAppSelector((state) => state.auth.user) as UserDetails | null;
	return reduxUser || (routerContext?.userDetails as UserDetails | null) || null;
};
