/**
 * @file Appoint Party Official Dialog
 * @description Dialog allowing administrators to select and appoint an active party member
 * to a vacant or available chapter position. Matches the custom design with circular member avatars,
 * position/role handles, and a checkmark trigger dropdown to select the appointment type.
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogCloseButton,
} from "@repo/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Loader2, Search, Check, Shield } from "lucide-react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import { toast } from "sonner";
import { getUsersList } from "#/lib/server/users";
import { assignPartyOfficial, type PartyPositionItem } from "#/lib/server/parties";
import type { UserType } from "#/components/tiles/user-tile";

export interface AppointOfficialDialogProps {
  open: boolean;
  onClose: () => void;
  position: PartyPositionItem | null;
  chapterId?: number;
  chapterTier: string;
  chapterContextLabel: string;
  partyId?: number;
  onSuccess?: () => void;
}

const APPOINTMENT_TYPES = [
  { value: "substantive", label: "Substantive" },
  { value: "acting", label: "Acting" },
  { value: "caretaker", label: "Caretaker" },
  { value: "interim", label: "Interim" },
] as const;

export function AppointOfficialDialog({
  open,
  onClose,
  position,
  chapterId,
  chapterTier,
  chapterContextLabel,
  partyId,
  onSuccess,
}: AppointOfficialDialogProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch] = useDebounceValue(searchQuery, 400);

  // Track which user is currently being appointed
  const [submittingUserId, setSubmittingUserId] = React.useState<number | null>(null);

  // Fetch party members
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, } = useInfiniteQuery({
    queryKey: ["appointPartyMembers", partyId, debouncedSearch],
    queryFn: async ({ pageParam }) => {
      if (!partyId) return { success: true, data: { users: [] } };
      const res = await getUsersList({
        data: {
          party_id: partyId,
          limit: 30,
          cursor: pageParam || undefined,
          search: debouncedSearch.trim() || undefined,
        },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to load members");
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => {
      if (lastPage?.meta?.has_more) {
        return lastPage.meta.next_cursor || "";
      }
      return undefined;
    },
    enabled: open && !!partyId,
    staleTime: 60 * 1000,
  });

  const members: UserType[] = React.useMemo(() => {
    return data ? data.pages.flatMap((page) => page.data?.users || []) : [];
  }, [data]);

  // Handle appointment submission with selected appointment type
  const handleAppoint = async (
    userId: number,
    appointmentType: "substantive" | "acting" | "caretaker" | "interim",
  ) => {
    if (!partyId || !position) return;

    if (!chapterId || chapterId <= 0) {
      toast.error("Unable to resolve chapter for appointment. Please try again.");
      return;
    }

    setSubmittingUserId(userId);
    try {
      const res = await assignPartyOfficial({
        data: {
          partyId,
          chapterId,
          userId,
          positionId: position.id,
          appointmentType,
        },
      });

      if (res?.success) {
        toast.success(
          `Appointed as ${appointmentType !== "substantive" ? `${appointmentType} ` : ""}${position.name}`,
        );
        queryClient.invalidateQueries({ queryKey: ["partyOfficials"] });
        onSuccess?.();
        onClose();
      } else {
        toast.error(res?.message || "Failed to appoint official");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to appoint official");
    } finally {
      setSubmittingUserId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-6 sm:p-8 overflow-hidden rounded-2xl">
        {/* Header matching design */}
        <DialogHeader className="flex flex-row items-start justify-between pb-4 border-b border-border/50 text-left px-0 pt-0 w-full">
          <div>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-c-90 tracking-tight">
              Position for {position?.name || "Official"}
            </DialogTitle>
          </div>

          {/* Context indicator on the top right + close button */}
          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="block text-xs font-normal text-c-50">Working on</span>
              <span className="block text-sm font-semibold text-c-80 capitalize">
                {chapterContextLabel || `${chapterTier} chapter`}
              </span>
            </div>
            <DialogClose asChild>
              <DialogCloseButton />
            </DialogClose>
          </div>
        </DialogHeader>

        {/* Search input matching design pill */}
        <div className="pt-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-c-40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search with username or member fullname"
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-sidebar-mobile hover:bg-hover-3 focus:bg-background text-sm text-c-90 placeholder:text-c-40 border border-border/40 focus:border-primary focus:outline-none transition"
              autoFocus
            />
          </div>
        </div>

        {/* Members Grid Container */}
        <div className="flex-1 overflow-y-auto pt-4 pb-2 pr-1">
          {isLoading && members.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center gap-2 text-c-40">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm">Loading party members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="py-20 text-center text-c-50">
              <p className="text-base font-medium">No members found</p>
              <p className="text-xs text-c-40 mt-1">
                {searchQuery
                  ? "Try searching with a different name or username"
                  : "No registered members found in this party"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-8 justify-items-center">
              {members.map((member) => {
                const fullName =
                  [member.first_name, member.last_name].filter(Boolean).join(" ") ||
                  member.username ||
                  "Party Member";

                const isSubmitting = submittingUserId === member.id;

                // Handle tag: current leadership position if held, or username handle
                const roleTag =
                  member.role_level && member.role_level !== "member"
                    ? `@ ${member.role_level.replace(/_/g, " ")}`
                    : member.username
                      ? `@${member.username}`
                      : "@ member";

                return (
                  <div
                    key={member.id}
                    className="flex flex-col items-center justify-start text-center w-full max-w-32 group"
                  >
                    {/* Member Avatar */}
                    <div className="size-24 sm:size-26 rounded-full overflow-hidden border border-border/60 shadow-xs bg-sidebar-mobile dark:bg-card flex items-center justify-center shrink-0">
                      {member.avatar || member.avatar_url ? (
                        <img
                          src={member.avatar || member.avatar_url}
                          alt={fullName}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-c-50 uppercase">
                          {member.first_name?.[0] || ""}
                          {member.last_name?.[0] || ""}
                        </span>
                      )}
                    </div>

                    {/* Member Full Name */}
                    <h5
                      className="mt-3 text-[15px] font-bold text-c-90 leading-tight capitalize truncate w-full"
                      title={fullName}
                    >
                      {fullName}
                    </h5>

                    {/* Handle or current role */}
                    <p
                      className="mt-0.5 text-[11px] font-normal text-c-50 truncate w-full"
                      title={roleTag}
                    >
                      {roleTag}
                    </p>

                    {/* Checkmark Appointment Trigger Dropdown */}
                    <div className="mt-2.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={isSubmitting}>
                          <button
                            type="button"
                            className="size-8 rounded-full border border-border/70 hover:border-primary hover:bg-primary/10 text-c-60 hover:text-primary flex items-center justify-center transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Appoint member"
                          >
                            {isSubmitting ? (
                              <Loader2 className="size-4 animate-spin text-primary" />
                            ) : (
                              <Check className="size-4 stroke-[2.5]" />
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-44">
                          <div className="px-2 py-1.5 text-[11px] font-semibold text-c-40 uppercase tracking-wider">
                            Appointment Type
                          </div>
                          {APPOINTMENT_TYPES.map((type) => (
                            <DropdownMenuItem
                              key={type.value}
                              className="cursor-pointer text-xs flex items-center justify-between"
                              onClick={() => handleAppoint(member.id, type.value)}
                            >
                              <span>{type.label}</span>
                              <Shield className="size-3 text-c-40" />
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Infinite Scroll Trigger */}
          {hasNextPage && (
            <div className="pt-6 pb-2 flex justify-center">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-sidebar-mobile hover:bg-hover-7 text-c-70 border border-border/40 transition disabled:opacity-50"
              >
                {isFetchingNextPage ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin" /> Loading more...
                  </span>
                ) : (
                  "Load more members"
                )}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
