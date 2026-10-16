import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState, useEffect, useMemo } from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { Button } from "@repo/ui/components/button";
import {
  ElectionInstancesTable,
  type ElectionInstanceType,
} from "#/components/Tables";
import { NationwideElectionFormDialog } from "#/components/dialogs/NationwideElectionFormDialog";
import { StateElectionFormDialog } from "#/components/dialogs/StateElectionFormDialog";
import { SenatorialDistrictElectionFormDialog } from "#/components/dialogs/SenatorialDistrictElectionFormDialog";
import { FederalConstituencyElectionFormDialog } from "#/components/dialogs/FederalConstituencyElectionFormDialog";
import { StateConstituencyElectionFormDialog } from "#/components/dialogs/StateConstituencyElectionFormDialog";
import { LgaElectionFormDialog } from "#/components/dialogs/LgaElectionFormDialog";
import { WardElectionFormDialog } from "#/components/dialogs/WardElectionFormDialog";
import { DeleteAlertDialog } from "#/components/alerts/delete-alert";
import { BulkChangeGroupDialog } from "#/components/dialogs/BulkChangeGroupDialog";
import { ELECTION_TABS } from "./-data";
import { getElections, bulkDeleteElections } from "#/lib/server/elections";
import { useIntersectionObserver } from "usehooks-ts";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layers, X } from "lucide-react";
import TrashcanIcon from "@repo/ui/icons/trashcan-icon";
import { toast } from "sonner";

// Route definition with page metadata for the TanStack router
export const Route = createFileRoute("/_authenticated/elections/instances")({
  head: () => getPageHeader({ title: "Elections" }),
  component: RouteComponent,
});

function RouteComponent() {
  const queryClient = useQueryClient();

  // Modal dialog visibility states for creating elections at each administrative hierarchy tier
  const [isNationwideOpen, setIsNationwideOpen] = useState(false);
  const [isStateOpen, setIsStateOpen] = useState(false);
  const [isSenatorialOpen, setIsSenatorialOpen] = useState(false);
  const [isFederalOpen, setIsFederalOpen] = useState(false);
  const [isStateConstOpen, setIsStateConstOpen] = useState(false);
  const [isLgaOpen, setIsLgaOpen] = useState(false);
  const [isWardOpen, setIsWardOpen] = useState(false);

  // Selection states for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkGroupOpen, setIsBulkGroupOpen] = useState(false);

  // Paginated query: loads elections using keyset cursor pagination
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ["elections"],
    queryFn: async ({ pageParam }) => {
      const res = await getElections({
        data: {
          limit: 20,
          cursor: pageParam as string,
        },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to fetch elections");
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => {
      // Keyset cursor pagination check: return next_cursor if additional records remain
      if (lastPage && lastPage.meta && lastPage.meta.has_more) {
        return lastPage.meta.next_cursor || "";
      }
      return undefined;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // Intersection observer sentinel for auto-triggering the next page fetch when scrolled into view
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  // Automatically fetch next page of elections when sentinel enters viewport
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten paginated query results into a single array of election instances
  const elections: ElectionInstanceType[] = useMemo(() => {
    return data ? data.pages.flatMap((page) => page.data?.elections ?? []) : [];
  }, [data]);

  const selectedElections = useMemo(() => {
    return elections.filter((e) => selectedIds.has(e.id));
  }, [elections, selectedIds]);

  const electionsWithCandidates = useMemo(() => {
    return selectedElections.filter((e) => (e.candidates_count ?? 0) > 0);
  }, [selectedElections]);

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === elections.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(elections.map((e) => e.id)));
    }
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      if (electionsWithCandidates.length > 0) {
        throw new Error(
          `Cannot delete: ${electionsWithCandidates.length} election(s) already have registered candidates.`,
        );
      }
      const res = await bulkDeleteElections({
        data: { ids: Array.from(selectedIds) },
      });
      if (!res.success) {
        throw new Error(res.message || "Failed to delete elections");
      }
      return res;
    },
    onSuccess: (res) => {
      toast.success(
        res.message ||
        `Successfully deleted ${selectedIds.size} election instances.`,
      );
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      queryClient.invalidateQueries({ queryKey: ["election-groups"] });
      setSelectedIds(new Set());
      setIsBulkDeleteOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete selected elections");
    },
  });

  return (
    <Layout>
      {/* Top page header with tab navigation */}
      <PageHeader
        title="Elections"
        activeTab="instances"
        tabs={ELECTION_TABS}
      />

      {/* Action bar: Search input, filter trigger, and creation dialog dropdown options */}
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton
              onAddNationwideElection={() => setIsNationwideOpen(true)}
              onAddStateElection={() => setIsStateOpen(true)}
              onAddSenatorialElection={() => setIsSenatorialOpen(true)}
              onAddFederalConstituencyElection={() => setIsFederalOpen(true)}
              onAddStateConstituencyElection={() => setIsStateConstOpen(true)}
              onAddLgaElection={() => setIsLgaOpen(true)}
              onAddWardElection={() => setIsWardOpen(true)}
            />
          </>
        }
      />

      {/* Main elections roster table with initial loading state */}
      {isLoading && elections.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading elections...
        </div>
      ) : (
        <ElectionInstancesTable
          items={elections}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
        />
      )}

      {/* Infinite scroll sentinel and loading indicator */}
      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="py-6 flex items-center justify-center text-c-50 text-[14px]"
        >
          {isFetchingNextPage
            ? "Loading more elections..."
            : "Scroll down to load more"}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 sm:gap-4 px-5 py-3 rounded-2xl bg-background/95 backdrop-blur-xl border border-border shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-5">
              {selectedIds.size}
            </span>
            <span className="text-sm font-semibold text-c-80 hidden sm:inline">
              selected
            </span>
          </div>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBulkGroupOpen(true)}
              className="h-8.5 px-3 text-xs font-semibold flex items-center gap-1.5 rounded-lg border border-border/60 hover:bg-c-10"
            >
              <Layers className="size-3.5" />
              <span>Change Group</span>
            </Button>

            <Button
              type="button"
              variant="red"
              size="sm"
              onClick={() => {
                if (electionsWithCandidates.length > 0) {
                  toast.error(
                    `Cannot delete: ${electionsWithCandidates.length} of the ${selectedIds.size} selected election(s) have registered candidates. Please remove candidates before deleting.`,
                  );
                  return;
                }
                setIsBulkDeleteOpen(true);
              }}
              className="h-8.5 px-3 text-xs font-semibold flex items-center gap-1.5 rounded-lg"
            >
              <TrashcanIcon className="size-3.5" />
              <span>Delete ({selectedIds.size})</span>
            </Button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-c-40 hover:text-c-80 p-1.5 rounded-lg hover:bg-c-10 transition cursor-pointer ml-1"
              title="Clear selection"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Dialogs */}
      <DeleteAlertDialog
        open={isBulkDeleteOpen}
        setOpen={setIsBulkDeleteOpen}
        isPending={bulkDeleteMutation.isPending}
        title={`Delete ${selectedIds.size} Election Instances?`}
        subtitle={`Are you sure you want to delete ${selectedIds.size} selected election instance${selectedIds.size === 1 ? "" : "s"}? This action cannot be undone.`}
        delete={() => bulkDeleteMutation.mutate()}
      />

      <BulkChangeGroupDialog
        open={isBulkGroupOpen}
        onClose={() => setIsBulkGroupOpen(false)}
        selectedElections={selectedElections}
        onSuccess={() => setSelectedIds(new Set())}
      />

      {/* Creation form dialogs for each geographic/administrative level */}
      {isNationwideOpen && (
        <NationwideElectionFormDialog
          open={isNationwideOpen}
          onClose={() => setIsNationwideOpen(false)}
        />
      )}
      {isStateOpen && (
        <StateElectionFormDialog
          open={isStateOpen}
          onClose={() => setIsStateOpen(false)}
        />
      )}
      {isSenatorialOpen && (
        <SenatorialDistrictElectionFormDialog
          open={isSenatorialOpen}
          onClose={() => setIsSenatorialOpen(false)}
        />
      )}
      {isFederalOpen && (
        <FederalConstituencyElectionFormDialog
          open={isFederalOpen}
          onClose={() => setIsFederalOpen(false)}
        />
      )}
      {isStateConstOpen && (
        <StateConstituencyElectionFormDialog
          open={isStateConstOpen}
          onClose={() => setIsStateConstOpen(false)}
        />
      )}
      {isLgaOpen && (
        <LgaElectionFormDialog
          open={isLgaOpen}
          onClose={() => setIsLgaOpen(false)}
        />
      )}
      {isWardOpen && (
        <WardElectionFormDialog
          open={isWardOpen}
          onClose={() => setIsWardOpen(false)}
        />
      )}
    </Layout>
  );
}
