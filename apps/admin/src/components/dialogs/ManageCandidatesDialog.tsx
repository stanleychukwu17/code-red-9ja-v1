import {
  getElectionCandidates,
  syncElectionCandidates,
} from "#/lib/server/elections";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search } from "lucide-react";
import * as React from "react";
import type { UserResult } from "./UserFormDialog";
import { UserFormDialog } from "./UserFormDialog";
import { CandidateRow } from "./CandidateRow";
import { UserFinderCommand } from "@repo/ui/components/custom/UserFinderCommand";
import { getUsersList } from "#/lib/server/users";
import { TinyError } from "@repo/ui/components/custom/TinyError";

interface ManageCandidatesDialogProps {
  electionId: number;
  open: boolean;
  onClose: () => void;
}

export function ManageCandidatesDialog({
  electionId,
  open,
  onClose,
}: ManageCandidatesDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] =
    React.useState(false);
  const [isExistingDialogOpen, setIsExistingDialogOpen] = React.useState(false);
  const [candidates, setCandidates] = React.useState<any[]>([]);

  // Fetch detailed candidates for the election
  const { data: candidatesRes, isLoading } = useQuery({
    queryKey: ["election-candidates", electionId],
    queryFn: async () => {
      const res = await getElectionCandidates({ data: electionId });
      if (res && res.success && res.data?.candidates) {
        return res.data.candidates;
      }
      throw new Error(res?.message || "Failed to load candidates");
    },
    enabled: open && !!electionId,
  });

  // Sync state with query result
  React.useEffect(() => {
    if (candidatesRes) {
      setCandidates(
        candidatesRes.map((c: any) => ({
          id: c.candidate_id,
          first_name: `${c.first_name} ${c.last_name}`,
          avatar_url: c.avatar || undefined,
          party_id: c.party_id || undefined,
          party_short_name: c.party_short_name || "",
          party_logo: c.party_logo || "",
        })),
      );
    }
  }, [candidatesRes]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await syncElectionCandidates({
        data: {
          electionId,
          candidates: candidates.map((c) => ({
            candidate_id: c.id,
            party_id: c.party_id,
            party_short_name: c.party_short_name,
          })),
        },
      });
      if (!res.success) {
        throw new Error(res.message || "Failed to sync candidates");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      queryClient.invalidateQueries({
        queryKey: ["election-candidates", electionId],
      });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Something went wrong.");
    },
  });

  const handleAddMultipleExistingCandidates = (selectedUsers: any[]) => {
    setCandidates((prev) => {
      const updated = [...prev];
      selectedUsers.forEach((userItem) => {
        if (!updated.some((c) => c.id === userItem.id)) {
          updated.push({
            id: userItem.id,
            first_name: `${userItem.first_name} ${userItem.last_name}`,
            avatar_url: userItem.avatar || undefined,
            party_id: userItem.party_id || undefined,
          });
        }
      });
      return updated;
    });
  };

  const handleAddNewCandidateSuccess = (newCand: UserResult) => {
    setCandidates((prev) => [
      ...prev,
      {
        id: newCand.id,
        first_name: newCand.first_name,
        avatar_url: newCand.avatar_url,
        party_id: newCand.party_id,
        party_short_name: newCand.party_short_name,
        party_logo: newCand.party_logo,
      },
    ]);
  };

  const handleUpdateCandidateParty = async (index: number, newParty: any) => {
    setCandidates((prev) =>
      prev.map((c, i) =>
        i === index
          ? {
              ...c,
              party_id: newParty.id,
              party_short_name: newParty.short_name,
              party_logo: newParty.logo,
            }
          : c,
      ),
    );
  };

  const handleRemoveCandidate = (index: number) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  };

  // Filter candidates by search query
  const filteredCandidates = candidates.filter((c) =>
    c.first_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl   overflow-visible max-h-[90vh] flex flex-col">
          <DialogHeader title="Manage candidates" />

          <DialogPadding className="flex-1 overflow-y-auto space-y-6 pb-6 pt-4 min-h-0">
            <TinyError error={error} />

            {/* Search and Action Buttons */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-c-40" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-[#f5f5f5] rounded-xl text-sm border-none focus:outline-none focus:ring-1 focus:ring-[#00cf79]"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="black"
                  size="lg"
                  className="px-4"
                  onClick={() => setIsExistingDialogOpen(true)}
                >
                  <Plus className="size-4" />
                  <span>Existing</span>
                </Button>
                <Button
                  type="button"
                  variant="black"
                  size="lg"
                  onClick={() => setIsCandidateDialogOpen(true)}
                  className="px-4"
                >
                  <Plus className="size-4" />
                  <span>New</span>
                </Button>
              </div>
            </div>

            {/* Candidate List */}
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="size-8 text-[#00cf79] animate-spin" />
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="h-40 rounded-xl bg-[#f7f7f7] border border-dashed border-[#e2e8f0] flex items-center justify-center">
                <span className="text-[15px] text-c-40 font-semibold">
                  0 candidates matched
                </span>
              </div>
            ) : (
              <div className="space-y-1 pr-1 py-2 max-h-[40vh] overflow-y-auto">
                {filteredCandidates.map((cand, idx) => (
                  <CandidateRow
                    key={cand.id}
                    candidate={cand}
                    index={idx}
                    onUpdateParty={handleUpdateCandidateParty}
                    onRemove={handleRemoveCandidate}
                  />
                ))}
              </div>
            )}
          </DialogPadding>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="2xl"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserFormDialog
        open={isCandidateDialogOpen}
        onClose={() => setIsCandidateDialogOpen(false)}
        onSuccess={handleAddNewCandidateSuccess}
      />

      <UserFinderCommand
        open={isExistingDialogOpen}
        onClose={() => setIsExistingDialogOpen(false)}
        onAddUsers={handleAddMultipleExistingCandidates}
        alreadySelectedIds={candidates.map((c) => c.id)}
        fetchUsers={async ({ cursor, search }) => {
          const res = await getUsersList({
            data: { cursor, search, limit: 20 },
          });
          if (res && res.success && res.data?.users) {
            return {
              users: res.data.users,
              nextCursor: res.data.meta?.next_cursor,
            };
          }
          return { users: [] };
        }}
        title="Search Candidates"
        placeholder="Search candidates to add"
        selectMode="multiple"
      />
    </>
  );
}
