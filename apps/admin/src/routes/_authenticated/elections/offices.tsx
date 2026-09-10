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

// Define the route for /elections/offices under the _authenticated layout
export const Route = createFileRoute("/_authenticated/elections/offices")({
  head: () => getPageHeader({ title: "Offices" }),
  component: RouteComponent,
});

function RouteComponent() {
  // Controls the visibility of the "Create New Office" modal dialog
  const [isAddOfficeOpen, setIsAddOfficeOpen] = useState(false);

  // Paginated query to fetch political offices (e.g. President, Governor, Senator) using cursor pagination
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["offices"],
      queryFn: async ({ pageParam }) => {
        const res = await getOffices({
          data: { limit: 20, cursor: pageParam as string, orderBy: "rank", order: "ASC" },
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

  // Intersection observer attached to the bottom sentinel element for infinite scrolling
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  // Automatically fetch the next page of offices when the user scrolls near the bottom
  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten the paginated office pages into a single continuous list for the table
  const offices = data
    ? data.pages.flatMap((page) => page.data?.offices || [])
    : [];

  return (
    <Layout>
      {/* Elections section navigation tabs (Groups, Instances, Offices, Explanation) */}
      <PageHeader title="Elections" activeTab="offices" tabs={ELECTION_TABS} />

      {/* Action toolbar: date filter, table filter, and button to open "Add Office" modal */}
      <PageSearchLayer
        rightComponent={
          <>
            <DateBullet update={(val) => console.log(val)} />
            <FilterButton />
            <AddButton onClick={() => setIsAddOfficeOpen(true)} />
          </>
        }
      />

      {/* Main content: displays loading state or the offices table */}
      {isLoading && offices.length === 0 ? (
        <div className="py-12 text-center text-c-50 text-[15px]">
          Loading offices...
        </div>
      ) : (
        <OfficesTable items={offices} />
      )}

      {/* Sentinel element to trigger next page fetch on scroll */}
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

      {/* Dialog for creating a new political office */}
      <OfficeFormDialog
        open={isAddOfficeOpen}
        onClose={() => setIsAddOfficeOpen(false)}
      />
    </Layout>
  );
}
