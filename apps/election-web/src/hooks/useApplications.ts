import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getApplications } from "#/lib/server/applications";
import { QUERY_KEYS } from "#/lib/config";
import { useUser } from "./useUser";
import { getActiveApplication } from "#/routes/_authenticated/applications/utils/partyValidation";

export type UseApplicationsOptions = {
	status?: string;
	activeElectionOnly?: boolean;
	enabled?: boolean;
	staleTime?: number;
};

/**
 * Hook to query and manage polling agent applications for the authenticated user.
 *
 * Exposes:
 * - `applications`: Raw list of returned applications
 * - `activeApps`: Filtered list of applications in active states (pending, approved, success, accepted)
 * - `activeApplication`: The primary active application for upcoming/present election, if any
 * - `appCount`: Count of active applications
 * - `isLoading`, `isFetching`, `refetch`, `error`
 */
export function useApplications(options: UseApplicationsOptions = {}) {
	const { id: userId } = useUser() ?? {};
	const { status = "pending", activeElectionOnly = true, enabled = true, staleTime = Infinity } = options;

	// Query key scoped to user and application filters
	const queryKey = useMemo(() => {
		return [
			...QUERY_KEYS.pollingAgentApplications(userId),
			{ status, activeElectionOnly },
		];
	}, [userId, status, activeElectionOnly]);

	// Fetch applications from server
	const { data: applications = [], isLoading, isFetching, refetch, error } = useQuery({
		queryKey,
		enabled: enabled && !!userId,
		staleTime,
		queryFn: async () => {
			const res = await getApplications({
				data: {
					user_id: userId,
					status,
					active_election_only: activeElectionOnly,
				},
			});
			if (!res?.success || !res.data?.applications) {
				return [];
			}
			return res.data.applications;
		},
	});

	// Filter active status applications
	const activeApps = useMemo(() => {
		return (applications || []).filter((app: any) =>
			["pending", "approved", "success", "accepted"].includes(app.status),
		);
	}, [applications]);

	// Primary active application for upcoming election
	const activeApplication = useMemo(() => {
		return getActiveApplication(applications);
	}, [applications]);

	return {
		applications,
		activeApps,
		activeApplication,
		appCount: activeApps.length,
		isLoading,
		isFetching,
		refetch,
		error,
	};
}

/**
 * Convenience hook strictly querying active applications for upcoming elections.
 */
export function useActiveApplications(options?: Omit<UseApplicationsOptions, "activeElectionOnly">) {
	return useApplications({ ...options, activeElectionOnly: true });
}
