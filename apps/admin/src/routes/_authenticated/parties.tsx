import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import * as React from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { PartiesTable, type PartyType } from "#/components/Tables";
import { PartyFormDialog } from "#/components/dialogs/PartyFormDialog";
import { getParties } from "#/lib/server/parties";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/parties")({
  head: () => getPageHeader({ title: "Parties" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { data: parties = [], isLoading, error, refetch, } = useQuery<PartyType[]>({
    queryKey: ["parties"],
    queryFn: async () => {
      const res = await getParties();
      if (res && res.success && res.data?.parties) {
        return res.data.parties;
      }
      throw new Error(res?.message || "Failed to load parties");
    },
    staleTime: Infinity
  });

  // Dialog state for creating a new party
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  // opens the partyForm Dialog
  const handleCreateClick = () => {
    setCreateDialogOpen(true);
  };

  return (
    <Layout>
      <PageHeader title="Parties" activeTab="" />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton onClick={handleCreateClick} />
          </>
        }
      />

      {isLoading ? (
        <div className="w-full h-60 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-c-50" />
        </div>
      ) : error ? (
        <div className="w-full p-6 text-center text-red-600 font-medium">
          {error instanceof Error ? error.message : "Failed to load parties"}
        </div>
      ) : parties.length === 0 ? (
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No parties found. Click the + button to add one.
        </div>
      ) : (
        <PartiesTable items={parties} />
      )}

      {/* Create dialog only — edit/delete now handled by PartyDropdown in each tile */}
      <PartyFormDialog
        open={createDialogOpen}
        mode="create"
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={() => refetch()}
      />
    </Layout>
  );
}
