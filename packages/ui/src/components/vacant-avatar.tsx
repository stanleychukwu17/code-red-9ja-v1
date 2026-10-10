import type * as React from "react";
import { cn } from "../lib/utils";

export interface VacantPositionAvatarProps extends React.ComponentProps<"div"> { }

/**
 * Vacant position placeholder avatar with radial gradient lighting.
 * Typically used in party position roster cards for unoccupied roles.
 */
export function VacantPositionAvatar({ className, style, ...props }: VacantPositionAvatarProps) {
	return (
		<div
			data-slot="vacant-position-avatar"
			className={cn("size-36 rounded-full shrink-0 shadow-xs", className)}
			style={{
				background:
					"radial-gradient(circle at 75% 75%, #b2f354 0%, #d5f997 45%, #f2fde2 80%, #ffffff 100%)",
				...style,
			}}
			{...props}
		/>
	);
}

export interface VacantOfficialAvatarProps extends React.ComponentProps<"div"> { }

/**
 * Vacant official placeholder avatar with diagonal linear gradient.
 * Typically used in party official preview cards for unassigned executive slots.
 */
export function VacantOfficialAvatar({ className, ...props }: VacantOfficialAvatarProps) {
	return (
		<div
			data-slot="vacant-official-avatar"
			className={cn(
				"w-14 h-14 rounded-full bg-linear-to-br from-sidebar-mobile to-lime shrink-0",
				className
			)}
			{...props}
		/>
	);
}
