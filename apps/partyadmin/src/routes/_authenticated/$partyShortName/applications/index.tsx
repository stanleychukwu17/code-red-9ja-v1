/**
 * @file Pending Party Applications Page
 * @description Primary queue for party administrators to review, approve, or reject incoming agent applications.
 * Uses cursor-based infinite queries for the pending list and secondary count queries for tab badges.
 */

import { useEffect, useState } from "react";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { ApplicationsTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { getApplicationTabs, validateApplicationsSearch } from "./-data";
import { ApplicationsFilterBar } from "#/components/applications/ApplicationsFilterBar";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { batchApproveApplications, getApplications } from "#/lib/server/applications";
import { useUserParty } from "#/hooks/useUserParty";
import { useApplicationsFilters } from "#/hooks/useApplicationsFilters";
import { QUERY_KEYS } from "#/lib/config";
import { useIntersectionObserver } from "usehooks-ts";
import { Filter, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogPadding } from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/$partyShortName/applications/")({
  validateSearch: validateApplicationsSearch,
  head: () => getPageHeader({ title: "Applications" }),
  component: RouteComponent,
});

const PAGE_LIMIT = 50;

/**
 * Pending Applications Page Component
 * Renders the pending applications queue with cascaded filters (Election Group, State, LGA, Ward).
 */
function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const { electionGroupId, stateId, lgaId, wardId, pollingUnitId, handleFiltersChange } = useApplicationsFilters();
  const { party } = useUserParty();
  const partyId = party?.id;
  const queryClient = useQueryClient();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Batch approve pending polling agents in selected LGA/Ward
  const batchApproveMutation = useMutation({
    mutationFn: async () => {
      if (!partyId || !electionGroupId || !stateId || !lgaId) {
        throw new Error("Party, Election Group, State, and LGA are required");
      }

      const res = await batchApproveApplications({
        data: {
          partyId,
          electionGroupId,
          stateId,
          lgaId,
          wardId: wardId || undefined,
        },
      });

      if (!res.success) {
        throw new Error(res.message || "Failed to batch approve applications");
      }

      return res;
    },

    onSuccess: (res: any) => {
      toast.success(res?.message || "Applications batch approved successfully");

      // Refresh applications cache and close modal
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setIsConfirmOpen(false);
    },

    onError: (err: any) => {
      toast.error(err.message || "Failed to batch approve applications");
    },
  });

  // Cursor-paginated pending applications (primary list)
  const { data: pendingPages, isLoading: isPendingLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: QUERY_KEYS.applications.list("pending", partyId, electionGroupId, stateId, lgaId, wardId, pollingUnitId),
    initialPageParam: undefined as number | undefined,
    // Only query once required election group and state filters are selected
    enabled: Boolean(partyId && electionGroupId && stateId),
    queryFn: ({ pageParam }) => getApplications({
      data: {
        status: "pending",
        limit: PAGE_LIMIT,
        cursor: pageParam,
        partyId,
        electionGroupId,
        stateId,
        lgaId,
        wardId,
        pollingUnitId,
      },
    }),
    // Resolve next cursor from either root or nested meta payload
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.meta ?? lastPage?.data?.meta;
      return meta?.has_more ? meta.next_cursor : undefined;
    },
    staleTime: Infinity,
  });

  // Observe bottom sentinel element to detect when user reaches the end of the list
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  // Automatically fetch the next batch when sentinel becomes visible
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten paginated page slices into a single continuous items array
  const pendingApps = pendingPages?.pages.flatMap((p) => p?.data?.applications ?? []) ?? [];

  return (
    <Layout>
      <PageHeader
        title="Applications"
        activeTab="pending"
        tabs={getApplicationTabs(partyShortName, {
          election_group_id: electionGroupId,
          state_id: stateId,
          lga_id: lgaId,
          ward_id: wardId,
          polling_unit_id: pollingUnitId,
        })}
      />

      <ApplicationsFilterBar
        electionGroupId={electionGroupId}
        stateId={stateId}
        lgaId={lgaId}
        wardId={wardId}
        pollingUnitId={pollingUnitId}
        onFiltersChange={handleFiltersChange}
        onAcceptAll={() => setIsConfirmOpen(true)}
        showAcceptAll={true}
        isAcceptingAll={batchApproveMutation.isPending}
      />

      {!electionGroupId || !stateId ? (
        <div className="py-20 flex flex-col items-center justify-center text-center px-4">
          <div className="size-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-3">
            <Filter className="size-6" />
          </div>
          <h3 className="text-base font-semibold text-c-80">
            Select an Election Group and State
          </h3>
          <p className="text-sm text-c-50 max-w-sm mt-1">
            Please choose an election group and state above to view applications.
          </p>
        </div>
      ) : isPendingLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-c-50 gap-2">
          <Loader2 className="size-8 animate-spin text-blue-600" />
          <p className="text-sm">Loading applications...</p>
        </div>
      ) : pendingApps.length === 0 ? (
        <div className="py-20 text-center text-c-50">
          No pending applications found.
        </div>
      ) : (
        <>
          <ApplicationsTable items={pendingApps} />
          {hasNextPage && (
            <div
              ref={sentinelRef}
              className="flex items-center justify-center py-6 text-sm text-c-50 min-h-10"
            >
              {isFetchingNextPage && (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-5 animate-spin text-blue-600" />
                  <span>Loading more applications...</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md p-0 rounded-2xl border border-border shadow-2xl overflow-hidden bg-background">
          <DialogHeader title="Confirm Batch Approval" />
          <DialogPadding className="space-y-3 py-4">
            <p className="text-sm text-c-80 font-medium">
              Are you sure you want to accept all pending polling agent applications in this {wardId ? "Ward" : "LGA"}?
            </p>
            <p className="text-xs text-c-50 leading-relaxed">
              This will automatically assign approved applicants to polling units within their selected location up to recruitment quotas and deduct agent slots/remuneration according to party rules. Supervisors are not included in batch approval.
            </p>
          </DialogPadding>
          <DialogFooter className="flex items-center justify-end gap-3 px-6 py-4 bg-background border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={batchApproveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => batchApproveMutation.mutate()}
              disabled={batchApproveMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {batchApproveMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Approving...
                </>
              ) : (
                "Confirm & Accept All"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
