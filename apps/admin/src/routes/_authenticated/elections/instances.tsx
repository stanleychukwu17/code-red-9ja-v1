import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState, useEffect } from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { ElectionInstancesTable, type ElectionInstanceType } from "#/components/Tables";
import { NationwideElectionFormDialog } from "#/components/dialogs/NationwideElectionFormDialog";
import { StateElectionFormDialog } from "#/components/dialogs/StateElectionFormDialog";
import { SenatorialDistrictElectionFormDialog } from "#/components/dialogs/SenatorialDistrictElectionFormDialog";
import { FederalConstituencyElectionFormDialog } from "#/components/dialogs/FederalConstituencyElectionFormDialog";
import { StateConstituencyElectionFormDialog } from "#/components/dialogs/StateConstituencyElectionFormDialog";
import { LgaElectionFormDialog } from "#/components/dialogs/LgaElectionFormDialog";
import { WardElectionFormDialog } from "#/components/dialogs/WardElectionFormDialog";
import { ELECTION_TABS } from "./-data";
import { getElections } from "#/lib/server/elections";
import { useIntersectionObserver } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/elections/instances")({
  head: () => getPageHeader({ title: "Elections" }),
  component: RouteComponent,
});



function RouteComponent() {
  const [isNationwideOpen, setIsNationwideOpen] = useState(false);
  const [isStateOpen, setIsStateOpen] = useState(false);
  const [isSenatorialOpen, setIsSenatorialOpen] = useState(false);
  const [isFederalOpen, setIsFederalOpen] = useState(false);
  const [isStateConstOpen, setIsStateConstOpen] = useState(false);
  const [isLgaOpen, setIsLgaOpen] = useState(false);
  const [isWardOpen, setIsWardOpen] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["elections"],
      queryFn: async ({ pageParam }) => {
        const res = await getElections({
          data: { limit: 20, cursor: pageParam as string },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch elections");
      },
      initialPageParam: "",
      getNextPageParam: (lastPage) => {
        if (lastPage && lastPage.meta && lastPage.meta.has_more) {
          return lastPage.meta.next_cursor || "";
        }
        return undefined;
      },
    });

  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const elections: ElectionInstanceType[] = data
    ? data.pages.flatMap((page) => page.data?.elections ?? [])
    : [];

  return (
    <Layout>
      <PageHeader
        title="Elections"
        activeTab="instances"
        tabs={ELECTION_TABS}
      />
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

      {isLoading && elections.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading elections...
        </div>
      ) : (
        <ElectionInstancesTable items={elections} />
      )}

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

      <NationwideElectionFormDialog
        open={isNationwideOpen}
        onClose={() => setIsNationwideOpen(false)}
      />
      <StateElectionFormDialog
        open={isStateOpen}
        onClose={() => setIsStateOpen(false)}
      />
      <SenatorialDistrictElectionFormDialog
        open={isSenatorialOpen}
        onClose={() => setIsSenatorialOpen(false)}
      />
      <FederalConstituencyElectionFormDialog
        open={isFederalOpen}
        onClose={() => setIsFederalOpen(false)}
      />
      <StateConstituencyElectionFormDialog
        open={isStateConstOpen}
        onClose={() => setIsStateConstOpen(false)}
      />
      <LgaElectionFormDialog
        open={isLgaOpen}
        onClose={() => setIsLgaOpen(false)}
      />
      <WardElectionFormDialog
        open={isWardOpen}
        onClose={() => setIsWardOpen(false)}
      />
    </Layout>
  );
}
