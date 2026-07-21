import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { UsersTable } from "#/components/Tables";
import { USERS_TABS } from "./-data";
import { UserFormDialog } from "#/components/dialogs/UserFormDialog";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getUsersList } from "#/lib/server/users";
import { Loader2 } from "lucide-react";
import { useIntersectionObserver, useDebounceValue } from "usehooks-ts";

// Define the route for the users page, requiring authentication.
export const Route = createFileRoute("/_authenticated/users/users")({
  // Set the page header metadata (e.g. document title)
  head: () => getPageHeader({ title: "Users - App users" }),
  component: RouteComponent,
});

function RouteComponent() {
  // State to control the visibility of the "Add User" form dialog
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 500);

  // useInfiniteQuery handles fetching data in pages for infinite scrolling
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    // queryKey uniquely identifies this query in the cache
    queryKey: ["users", "user", debouncedSearchQuery],

    // queryFn is the function that actually fetches the data
    queryFn: async ({ pageParam }) => {
      console.log("SEARCH:", debouncedSearchQuery);
      const res = await getUsersList({
        data: {
          limit: 20,
          cursor: pageParam,
          search: debouncedSearchQuery || undefined,
        },
      });
      console.log("RES:", res);

      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to load app users");
    },

    // The initial cursor to use for the first request (empty string means start from the beginning)
    initialPageParam: "",

    // getNextPageParam determines the cursor for the next page based on the last fetched page
    getNextPageParam: (lastPage) => {
      // If the API indicates there is more data, return the next_cursor to be used as the next pageParam
      if (lastPage && lastPage.meta && lastPage.meta.has_more) {
        return lastPage.meta.next_cursor || "";
      }

      // Return undefined when there is no more data to fetch (sets hasNextPage to false)
      return undefined;
    },

    // Disable refetch when switching back to the tab
    refetchOnWindowFocus: false,
  });

  // useIntersectionObserver provides a ref to attach to a DOM element (the sentinel)
  // and a boolean (isIntersecting) indicating if that element is currently visible on screen
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1, // Trigger when at least 10% of the sentinel element is visible
  });

  // Infinite Scroll Trigger Effect
  // When the sentinel element becomes visible (isIntersecting), and there is more data,
  // and we aren't already fetching, trigger the fetch for the next page
  React.useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten the pages array from useInfiniteQuery into a single continuous array of user items
  const appUsers = data
    ? data.pages.flatMap((page) => page.data?.users || [])
    : [];

  return (
    <Layout>
      {/* Page header with tabs for navigation between different user type tables */}
      <PageHeader title="Users" activeTab="users" tabs={USERS_TABS} />

      {/* Search and filter action bar */}
      <PageSearchLayer
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        rightComponent={
          <>
            <FilterButton />
            {/* Opens the "Add User" dialog when clicked */}
            <AddButton onClick={() => setIsFormOpen(true)} />
          </>
        }
      />

      {/* Render conditionally based on the current state: Loading -> Error -> Empty -> Data */}
      {isLoading && appUsers.length === 0 ? (
        // Initial loading state spinner
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        // Error state message
        <div className="w-full p-6 text-center text-red-600 font-medium">
          {error instanceof Error ? error.message : "Failed to load app users"}
        </div>
      ) : appUsers.length === 0 ? (
        // Empty state (no users found)
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No app users found.
        </div>
      ) : (
        // Data state: list of users
        <>
          {/* Main table component displaying the users */}
          <UsersTable items={appUsers} refetch={refetch} />

          {/* Sentinel element for infinite scroll: placed at the bottom of the list */}
          {/* When this element scrolls into view, the IntersectionObserver triggers fetchNextPage */}
          {hasNextPage && (
            <div
              ref={sentinelRef}
              className="py-6 flex items-center justify-center text-c-50 text-[14px]"
            >
              {isFetchingNextPage ? (
                <Loader2 className="size-5 animate-spin mr-2" />
              ) : null}
              {isFetchingNextPage
                ? "Loading more..."
                : "Scroll down to load more"}
            </div>
          )}
        </>
      )}

      {/* Dialog form for creating/editing users */}
      <UserFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        // Refetch the data when a user is successfully added so the table updates
        onSuccess={() => refetch()}
      />
    </Layout>
  );
}
