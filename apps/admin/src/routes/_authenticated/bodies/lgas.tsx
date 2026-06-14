import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { LgasTable } from "#/components/Tables";
import type { LgaType } from "#/components/Tables";
import { BODIES_TABS } from "./data";
import { useEffect } from "react";
import { getLGAs } from "#/lib/server/countries";
import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";
import { useIntersectionObserver } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/bodies/lgas")({
  head: () => getPageHeader({ title: "Bodies - LGAs" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["lgas"],
    queryFn: async ({ pageParam }) => {
      const res = await getLGAs({
        data: { limit: 20, cursor: pageParam },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to fetch LGAs");
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

  const lgas: LgaType[] = data
    ? data.pages.flatMap((page) =>
        (page.data?.lgas || []).map((l: {
          id: number;
          name: string;
          abbreviation: string;
          state_id: number;
          state_name: string;
          senatorial_district_id: number;
          senatorial_district_name: string;
          federal_constituency_id: number;
          federal_constituency_name: string;
        }) => ({
          id: l.id,
          name: l.name,
          abbreviation: l.abbreviation,
          state_id: l.state_id,
          state_name: l.state_name,
          senatorial_district_id: l.senatorial_district_id,
          senatorial_district_name: l.senatorial_district_name,
          federal_constituency_id: l.federal_constituency_id,
          federal_constituency_name: l.federal_constituency_name,
        }))
      )
    : [];

  return (
    <Layout>
      <PageHeader title="Bodies" activeTab="lgas" tabs={BODIES_TABS} />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton {...dialogProps} />
          </>
        }
      />

      {isLoading && lgas.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading LGAs...
        </div>
      ) : (
        <LgasTable items={lgas} />
      )}

      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="py-6 flex items-center justify-center text-c-50 text-[14px]"
        >
          {isFetchingNextPage ? "Loading more LGAs..." : "Scroll down to load more"}
        </div>
      )}

      {renderDialogs()}
    </Layout>
  );
}
