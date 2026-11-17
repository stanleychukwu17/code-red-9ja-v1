import { createServerFn } from "@tanstack/react-start";
import { API_URL } from "../config";
import { apiFetchJson } from "./fetch";

export type NotificationCategory =
	| "all"
	| "social"
	| "election"
	| "party"
	| "wallet"
	| "campaign"
	| "security"
	| "system";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface NotificationItem {
	id: number;
	recipient_user_id: number;
	actor_user_id?: number | null;
	party_id?: number | null;
	category: string;
	type: string;
	priority: NotificationPriority;
	group_key?: string | null;
	actor_count: number;
	metadata: Record<string, any>;
	read_at?: string | null;
	created_at: string;
	updated_at: string;
	actor_first_name?: string | null;
	actor_last_name?: string | null;
	actor_username?: string | null;
	actor_avatar?: string | null;
}

export interface PaginatedNotificationsResponse {
	notifications: NotificationItem[];
	unread_count: number;
	page: number;
	limit: number;
}

/**
 * Server function to fetch paginated user notifications.
 */
export const getUserNotifications = createServerFn({ method: "GET" })
	.inputValidator((data?: { page?: number; limit?: number }) => data || {})
	.handler(async ({ data: { page = 1, limit = 20 } }) => {
		try {
			const res = await apiFetchJson<{
				success: boolean;
				message?: string;
				data: PaginatedNotificationsResponse;
			}>(API_URL.notifications.list(page, limit));
			return {
				success: true,
				data: res.data || { notifications: [], unread_count: 0, page, limit },
			};
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Failed to fetch notifications";
			return {
				success: false,
				message,
				data: { notifications: [], unread_count: 0, page, limit },
			};
		}
	});

/**
 * Server function to fetch unread notifications count.
 */
export const getNotificationUnreadCount = createServerFn({ method: "GET" }).handler(async () => {
	try {
		const res = await apiFetchJson<{
			success: boolean;
			message?: string;
			data: { unread_count: number };
		}>(API_URL.notifications.unreadCount);
		return {
			success: true,
			data: res.data || { unread_count: 0 },
		};
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Failed to fetch unread count";
		return {
			success: false,
			message,
			data: { unread_count: 0 },
		};
	}
});

/**
 * Server function to mark a notification as read.
 */
export const markNotificationAsRead = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number | string }) => data)
	.handler(async ({ data: { id } }) => {
		try {
			await apiFetchJson(API_URL.notifications.markAsRead(id), {
				method: "PATCH",
			});
			return { success: true };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Failed to mark notification as read";
			return { success: false, message };
		}
	});

/**
 * Server function to mark all notifications as read.
 */
export const markAllNotificationsAsRead = createServerFn({ method: "POST" }).handler(async () => {
	try {
		await apiFetchJson(API_URL.notifications.markAllRead, {
			method: "PATCH",
		});
		return { success: true };
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Failed to mark all notifications as read";
		return { success: false, message };
	}
});

/**
 * Server function to delete a notification.
 */
export const deleteNotification = createServerFn({ method: "POST" })
	.inputValidator((data: { id: number | string }) => data)
	.handler(async ({ data: { id } }) => {
		try {
			await apiFetchJson(API_URL.notifications.delete(id), {
				method: "DELETE",
			});
			return { success: true };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Failed to delete notification";
			return { success: false, message };
		}
	});
