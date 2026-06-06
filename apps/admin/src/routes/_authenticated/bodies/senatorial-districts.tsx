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
import { DistrictsTable } from "#/components/Tables";
import { BODIES_TABS } from "./data";

export const Route = createFileRoute(
  "/_authenticated/bodies/senatorial-districts",
)({
  head: () => getPageHeader({ title: "Bodies - Senatorial Districts" }),
  component: RouteComponent,
});

const DISTRICTS_DATA = [
  { title: "Abia North", meta: ["174", "Abia"] },
  { title: "Abia South", meta: ["174", "Abia"] },
  { title: "Abia Central", meta: ["174", "Abia"] },
  { title: "Adamawa North", meta: ["174", "Adamawa"] },
  { title: "Adamawa Central", meta: ["174", "Adamawa"] },
  { title: "Adamawa Central", meta: ["174", "Adamawa"] },
];

import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();

  return (
    <Layout>
      <PageHeader title="Bodies" activeTab="districts" tabs={BODIES_TABS} />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton {...dialogProps} />
          </>
        }
      />

      <DistrictsTable items={DISTRICTS_DATA} />
      {renderDialogs()}
    </Layout>
  );
}

