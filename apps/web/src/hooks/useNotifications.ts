import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { QUERY_KEYS } from "#/lib/config";
import {
	deleteNotification,
	getNotificationUnreadCount,
	getUserNotifications,
	markAllNotificationsAsRead,
	markNotificationAsRead,
	type NotificationItem,
	type PaginatedNotificationsResponse,
} from "#/lib/server/notifications";

export type { NotificationItem, PaginatedNotificationsResponse };

export const notificationsQueryOptions = (page = 1, limit = 20) =>
	queryOptions({
		queryKey: QUERY_KEYS.notifications.list(page, limit),
		queryFn: async (): Promise<PaginatedNotificationsResponse> => {
			const res = await getUserNotifications({ data: { page, limit } });
			if (res && res.success && res.data) {
				return res.data;
			}
			return { notifications: [], unread_count: 0, page, limit };
		},
		staleTime: 30 * 1000,
		refetchOnWindowFocus: true,
	});

export const unreadCountQueryOptions = () =>
	queryOptions({
		queryKey: QUERY_KEYS.notifications.unreadCount,
		queryFn: async (): Promise<number> => {
			const res = await getNotificationUnreadCount();
			if (res && res.success && res.data) {
				return res.data.unread_count ?? 0;
			}
			return 0;
		},
		staleTime: 30 * 1000,
		refetchInterval: 60 * 1000,
		refetchOnWindowFocus: true,
	});

export function useNotifications(page = 1, limit = 20) {
	return useQuery(notificationsQueryOptions(page, limit));
}

export function useNotificationUnreadCount() {
	return useQuery(unreadCountQueryOptions());
}

export function useMarkNotificationRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: number | string) => {
			return await markNotificationAsRead({ data: { id } });
		},
		onMutate: async (id) => {
			// Cancel ongoing queries
			await queryClient.cancelQueries({ queryKey: QUERY_KEYS.notifications.root });

			// Optimistically update lists in cache
			queryClient.setQueriesData<PaginatedNotificationsResponse>(
				{ queryKey: QUERY_KEYS.notifications.root },
				(old) => {
					if (!old || !old.notifications) return old;
					const wasUnread = old.notifications.some(
						(n) => String(n.id) === String(id) && !n.read_at,
					);
					const updatedList = old.notifications.map((n) =>
						String(n.id) === String(id)
							? { ...n, read_at: n.read_at || new Date().toISOString() }
							: n,
					);
					return {
						...old,
						unread_count: wasUnread ? Math.max(0, old.unread_count - 1) : old.unread_count,
						notifications: updatedList,
					};
				},
			);

			// Optimistically decrement unread badge count
			queryClient.setQueryData<number>(QUERY_KEYS.notifications.unreadCount, (prev) =>
				prev && prev > 0 ? prev - 1 : 0,
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.root });
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unreadCount });
		},
	});
}

export function useMarkAllNotificationsRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			return await markAllNotificationsAsRead();
		},
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: QUERY_KEYS.notifications.root });

			queryClient.setQueriesData<PaginatedNotificationsResponse>(
				{ queryKey: QUERY_KEYS.notifications.root },
				(old) => {
					if (!old || !old.notifications) return old;
					const updatedList = old.notifications.map((n) => ({
						...n,
						read_at: n.read_at || new Date().toISOString(),
					}));
					return {
						...old,
						unread_count: 0,
						notifications: updatedList,
					};
				},
			);

			queryClient.setQueryData<number>(QUERY_KEYS.notifications.unreadCount, 0);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.root });
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unreadCount });
		},
	});
}

export function useDeleteNotification() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: number | string) => {
			return await deleteNotification({ data: { id } });
		},
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: QUERY_KEYS.notifications.root });

			queryClient.setQueriesData<PaginatedNotificationsResponse>(
				{ queryKey: QUERY_KEYS.notifications.root },
				(old) => {
					if (!old || !old.notifications) return old;
					const deletedItem = old.notifications.find((n) => String(n.id) === String(id));
					const wasUnread = deletedItem && !deletedItem.read_at;
					const filtered = old.notifications.filter((n) => String(n.id) !== String(id));
					return {
						...old,
						unread_count: wasUnread ? Math.max(0, old.unread_count - 1) : old.unread_count,
						notifications: filtered,
					};
				},
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.root });
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications.unreadCount });
		},
	});
}
