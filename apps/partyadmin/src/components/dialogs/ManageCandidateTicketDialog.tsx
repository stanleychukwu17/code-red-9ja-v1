/**
 * @file Manage Candidate Ticket Dialog
 * @description Dialog allowing party administrators to manage the official nomination ticket
 * for an election instance. For joint-ticket executive races (e.g. President, Governor,
 * LGA Chairman), it allows selecting and managing both the principal candidate and running mate.
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogPadding } from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { AppAvatar } from "@repo/ui/components/avatar";
import { UserFinderCommand } from "@repo/ui/components/custom/UserFinderCommand";
import { UsersIcon, Trash2, UserPlus, RefreshCw, UserCheck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fieldPartyCandidate } from "#/lib/server/elections";
import { getUsersList } from "#/lib/server/users";
import { useUserParty } from "#/hooks/useUserParty";
import type { ElectionInstanceType } from "../tiles/election-instance-tile";

export type ManageCandidateTicketDialogProps = {
  open: boolean;
  onClose: () => void;
  data: ElectionInstanceType;
};

/**
 * Resolves joint-ticket configuration and role labels based on election title or office.
 */
export const getTicketConfig = (electionTitle: string, officeName?: string, scope?: string) => {
  const t = `${electionTitle} ${officeName || ""} ${scope || ""}`.toLowerCase();

  if (t.includes("president")) {
    return {
      hasRunningMate: true,
      principalRole: "Presidential Candidate",
      runningMateRole: "Vice Presidential Candidate (Running Mate)",
    };
  }
  if (t.includes("governor") || t.includes("governorship")) {
    return {
      hasRunningMate: true,
      principalRole: "Gubernatorial Candidate",
      runningMateRole: "Deputy Governor Candidate (Running Mate)",
    };
  }
  if (t.includes("chairman") || t.includes("chairmanship")) {
    return {
      hasRunningMate: true,
      principalRole: "Local Government Chairman Candidate",
      runningMateRole: "Vice Chairman Candidate (Running Mate)",
    };
  }

  return {
    hasRunningMate: false,
    principalRole: officeName || "Party Candidate",
    runningMateRole: "Running Mate",
  };
};

export function ManageCandidateTicketDialog({ open, onClose, data }: ManageCandidateTicketDialogProps) {
  // Debug log election instance payload (id, title, office, candidate details)
  console.log(data);

  // TanStack Query client used to invalidate the elections cache on update
  const queryClient = useQueryClient();

  // Retrieve active tenant party to scope member searches to this party
  const { party } = useUserParty();
  const userPartyId = party?.id;

  // Active slot being picked via UserFinderCommand: 'candidate' | 'running_mate' | null
  const [targetSlot, setTargetSlot] = useState<"candidate" | "running_mate" | null>(null);

  // Detect whether this race requires a joint ticket (e.g. President, Governor, LGA Chairman)
  const ticketConfig = getTicketConfig(data.title, data.officeName, data.scope);

  // Mutation to persist candidate ticket updates on the server
  const mutation = useMutation({
    mutationFn: async ({ candidateId, runningMateId }: { candidateId?: number; runningMateId?: number }) => {
      // Calls server action with election ID and updated candidate ID
      const res = await fieldPartyCandidate({
        data: {
          electionId: data.id,
          candidateId: candidateId !== undefined ? candidateId : Number(data.candidate?.id || 0),
        },
      });
      if (!res.success) {
        throw new Error(res.message || "Failed to update candidate ticket");
      }
      return res.data;
    },
    onSuccess: () => {
      // Refresh election instances list so the table updates immediately
      queryClient.invalidateQueries({ queryKey: ["elections"] });
    },
  });

  // Handles member selection from the UserFinderCommand dialog
  const handleSelectUser = (selectedUsers: any[]) => {
    if (selectedUsers.length > 0) {
      const chosenId = selectedUsers[0].id;
      // Assign selected user to the active ticket slot
      if (targetSlot === "candidate") {
        mutation.mutate({ candidateId: chosenId });
      }
      // Close the member picker dialog
      setTargetSlot(null);
    }
  };

  // Removes/un-fields the assigned candidate from the ticket
  const handleRemoveCandidate = (slot: "candidate" | "running_mate") => {
    if (slot === "candidate") {
      // Passing candidateId: 0 removes the candidate assignment
      mutation.mutate({ candidateId: 0 });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent
          className="max-w-140 p-0 rounded-2xl border-none shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader title="Manage Nomination Ticket" />

          <DialogPadding className="flex-1 overflow-y-auto space-y-6 pb-6 pt-5 min-h-0 custom-scrollbar">
            {/* Election Banner Info */}
            <div className="bg-[#f8f9fa] dark:bg-c-10/50 p-4 rounded-xl border border-border/50">
              <p className="text-xs font-semibold text-c-50 uppercase tracking-wider">
                Contested Race
              </p>
              <h3 className="text-base font-bold text-c-90 mt-0.5">
                {data.title}
              </h3>
            </div>

            {/* Slot 1: Principal Nominee Card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-c-90 flex items-center gap-1.5">
                  <UserCheck className="size-4 text-[#00cf79]" />
                  {ticketConfig.principalRole}
                </span>
                {data.candidate && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#00cf79]/15 text-[#009b5a]">
                    Fielded
                  </span>
                )}
              </div>

              {data.candidate ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-white dark:bg-c-5 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <AppAvatar
                      src={data.candidate.avatar}
                      alt={data.candidate.name}
                      className="size-14 rounded-full border border-border shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-c-90 text-[15px] truncate">
                        {data.candidate.name}
                      </p>
                      <p className="text-xs text-c-50 mt-0.5">
                        {ticketConfig.principalRole}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTargetSlot("candidate")}
                      className="text-xs h-9 flex items-center gap-1.5"
                    >
                      <RefreshCw className="size-3.5" />
                      Change
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCandidate("candidate")}
                      className="text-xs h-9 text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-1.5"
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-dashed border-[#dcdcdc] dark:border-c-20 bg-background/50">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-c-10 flex items-center justify-center text-c-40 shrink-0">
                      <UsersIcon className="size-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-c-60">
                        No candidate fielded
                      </p>
                      <p className="text-xs text-c-40">
                        Field an accredited party member for this race.
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="black"
                    size="sm"
                    onClick={() => setTargetSlot("candidate")}
                    className="text-xs h-9 shrink-0 flex items-center gap-1.5"
                  >
                    <UserPlus className="size-3.5" />
                    Select Candidate
                  </Button>
                </div>
              )}
            </div>

            {/* Slot 2: Joint Ticket Running Mate Card (Conditional) */}
            {ticketConfig.hasRunningMate && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-c-90 flex items-center gap-1.5">
                    <UsersIcon className="size-4 text-[#0099FF]" />
                    {ticketConfig.runningMateRole}
                  </span>
                  {data.runningMate && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#0099FF]/15 text-[#007acc]">
                      Running Mate
                    </span>
                  )}
                </div>

                {data.runningMate ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-white dark:bg-c-5 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <AppAvatar
                        src={data.runningMate.avatar}
                        alt={data.runningMate.name}
                        className="size-14 rounded-full border border-border shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-c-90 text-[15px] truncate">
                          {data.runningMate.name}
                        </p>
                        <p className="text-xs text-c-50 mt-0.5">
                          {ticketConfig.runningMateRole}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTargetSlot("running_mate")}
                        className="text-xs h-9 flex items-center gap-1.5"
                      >
                        <RefreshCw className="size-3.5" />
                        Change
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCandidate("running_mate")}
                        className="text-xs h-9 text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-1.5"
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-dashed border-[#dcdcdc] dark:border-c-20 bg-background/50">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-full bg-c-10 flex items-center justify-center text-c-40 shrink-0">
                        <UsersIcon className="size-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-c-60">
                          No running mate assigned
                        </p>
                        <p className="text-xs text-c-40">
                          Select a vice candidate to complete the nomination ticket.
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTargetSlot("running_mate")}
                      className="text-xs h-9 shrink-0 flex items-center gap-1.5"
                    >
                      <UserPlus className="size-3.5" />
                      Select Running Mate
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogPadding>
        </DialogContent>
      </Dialog>

      {/* Lazy UserFinderCommand modal scoped to the clicked slot */}
      {targetSlot && (
        <UserFinderCommand
          open={!!targetSlot}
          onClose={() => setTargetSlot(null)}
          onAddUsers={handleSelectUser}
          alreadySelectedIds={
            targetSlot === "candidate" && data.candidate
              ? [Number(data.candidate.id)]
              : targetSlot === "running_mate" && data.runningMate
                ? [Number(data.runningMate.id)]
                : []
          }
          fetchUsers={async ({ cursor, search }) => {
            const res = await getUsersList({
              data: {
                party_id: userPartyId,
                cursor,
                search,
                limit: 20,
              },
            });
            if (res && res.success && res.data?.users) {
              return {
                users: res.data.users,
                nextCursor: res.data.meta?.next_cursor,
              };
            }
            return { users: [] };
          }}
          filterPartyId={userPartyId}
          title={
            targetSlot === "candidate"
              ? `Select ${ticketConfig.principalRole}`
              : `Select ${ticketConfig.runningMateRole}`
          }
          placeholder="Search party members..."
        />
      )}
    </>
  );
}
