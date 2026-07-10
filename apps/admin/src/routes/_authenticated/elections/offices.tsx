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
import { OfficesTable } from "#/components/Tables";
import { OfficeFormDialog } from "#/components/dialogs/OfficeFormDialog";
import { ELECTION_TABS } from "./-data";
import { getOffices } from "#/lib/server/offices";
import { useIntersectionObserver } from "usehooks-ts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { DateBullet } from "@repo/ui/components/bullets/date-bullet";

export const Route = createFileRoute("/_authenticated/elections/offices")({
  head: () => getPageHeader({ title: "Offices" }),
  component: RouteComponent,
});

function RouteComponent() {
  const [isAddOfficeOpen, setIsAddOfficeOpen] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["offices"],
      queryFn: async ({ pageParam }) => {
        const res = await getOffices({
          data: { limit: 20, cursor: pageParam as string },
        });
        if (res && res.success && res.data) {
          return res;
        }
        throw new Error(res?.message || "Failed to fetch offices");
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

  const offices = data
    ? data.pages.flatMap((page) => page.data?.offices || [])
    : [];

  return (
    <Layout>
      <PageHeader title="Elections" activeTab="offices" tabs={ELECTION_TABS} />
      <PageSearchLayer
        rightComponent={
          <>
            <DateBullet update={(val) => console.log(val)} />
            <FilterButton />
            <AddButton onClick={() => setIsAddOfficeOpen(true)} />
          </>
        }
      />

      {isLoading && offices.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading offices...
        </div>
      ) : (
        <OfficesTable items={offices} />
      )}

      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="py-6 flex items-center justify-center text-c-50 text-[14px]"
        >
          {isFetchingNextPage
            ? "Loading more offices..."
            : "Scroll down to load more"}
        </div>
      )}

      <OfficeFormDialog
        open={isAddOfficeOpen}
        onClose={() => setIsAddOfficeOpen(false)}
      />
    </Layout>
  );
}
