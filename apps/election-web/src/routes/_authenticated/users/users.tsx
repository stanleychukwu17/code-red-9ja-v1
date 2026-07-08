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
import { useInfiniteQuery } from "@tanstack/react-query";
import { getUsersList } from "#/lib/server/users";
import { Loader2 } from "lucide-react";
import { useIntersectionObserver } from "usehooks-ts";

export const Route = createFileRoute("/_authenticated/users/users")({
  head: () => getPageHeader({ title: "Users - App users" }),
  component: RouteComponent,
});

function RouteComponent() {
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["users", "user"],
    queryFn: async ({ pageParam }) => {
      const res = await getUsersList({
        data: { role: "user", limit: 20, cursor: pageParam },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to load app users");
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

  // Infinite Scroll Trigger
  React.useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten pages to items — preserve full entity data
  const appUsers = data
    ? data.pages.flatMap((page) => page.data?.users || [])
    : [];

  return (
    <Layout>
      <PageHeader title="Users" activeTab="users" tabs={USERS_TABS} />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton onClick={() => setIsFormOpen(true)} />
          </>
        }
      />

      {isLoading && appUsers.length === 0 ? (
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        <div className="w-full p-6 text-center text-red-600 font-medium">
          {error instanceof Error ? error.message : "Failed to load app users"}
        </div>
      ) : appUsers.length === 0 ? (
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No app users found.
        </div>
      ) : (
        <>
          <UsersTable items={appUsers} refetch={refetch} />

          {/* Sentinel element for infinite scroll */}
          {hasNextPage && (
            <div
              ref={sentinelRef}
              className="py-6 flex items-center justify-center text-c-50 text-[14px]"
            >
              {isFetchingNextPage ? (
                <Loader2 className="size-5 animate-spin mr-2" />
              ) : null}
              {isFetchingNextPage ? "Loading more..." : "Scroll down to load more"}
            </div>
          )}
        </>
      )}

    </Layout>
  );
}
