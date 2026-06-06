import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { Plus } from "lucide-react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  FilterButton,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { FederalConstituenciesTable } from "#/components/Tables";
import { BODIES_TABS } from "./data";

export const Route = createFileRoute(
  "/_authenticated/bodies/federal-constituencies",
)({
  head: () => getPageHeader({ title: "Bodies - Federal Constituencies" }),
  component: RouteComponent,
});

const FEDERAL_CONSTITUENCIES_DATA = [
  { title: "Bende", meta: ["174", "Abia North", "Abia"] },
  { title: "Arochukwu/Ohafia", meta: ["174", "Abia North", "Abia"] },
  { title: "Umuahia/Ikwuano", meta: ["174", "Abia Central", "Abia"] },
  { title: "Isiala Ngwa North/South", meta: ["174", "Abia Central", "Abia"] },
  { title: "Aba North/Aba South", meta: ["174", "Abia South", "Abia"] },
  { title: "Ukwa East/Ukwa West", meta: ["174", "Abia South", "Abia"] },
];

import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();

  return (
    <Layout>
      <PageHeader
        title="Bodies"
        activeTab="federal-constituencies"
        tabs={BODIES_TABS}
      />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton {...dialogProps} />
          </>
        }
      />

      <FederalConstituenciesTable items={FEDERAL_CONSTITUENCIES_DATA} />
      {renderDialogs()}
    </Layout>
  );
}

