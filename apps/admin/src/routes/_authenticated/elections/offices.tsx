import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { DateBullet } from "@repo/ui/components/bullets/date-bullet";

// Define the route for /elections/offices under the _authenticated layout
export const Route = createFileRoute("/_authenticated/elections/offices")({
  head: () => getPageHeader({ title: "Offices" }),
  component: RouteComponent,
});

function RouteComponent() {
  // Controls the visibility of the "Create New Office" modal dialog
  const [isAddOfficeOpen, setIsAddOfficeOpen] = useState(false);

  // Query to fetch political offices (e.g. President, Governor, Senator)
  const { data: offices = [], isLoading } = useQuery({
    queryKey: ["offices"],
    staleTime: Infinity,
    queryFn: async () => {
      const res = await getOffices({
        data: { limit: 100, orderBy: "rank", order: "ASC" },
      });
      if (res && res.success && res.data) {
        return res.data.offices || [];
      }
      throw new Error(res?.message || "Failed to fetch offices");
    },
  });

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

      {/* Dialog for creating a new political office */}
      <OfficeFormDialog
        open={isAddOfficeOpen}
        onClose={() => setIsAddOfficeOpen(false)}
      />
    </Layout>
  );
}
