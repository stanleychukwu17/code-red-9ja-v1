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
import { WardsTable } from "#/components/Tables";
import { BODIES_TABS } from "./data";

export const Route = createFileRoute("/_authenticated/bodies/wards")({
  head: () => getPageHeader({ title: "Bodies - Wards" }),
  component: RouteComponent,
});

const WARDS_DATA = [
  { title: "Bende I", meta: ["174", "Bende North", "Bende", "Abia"] },
  { title: "Bende II", meta: ["174", "Bende North", "Bende", "Abia"] },
  { title: "Bende III", meta: ["174", "Bende South", "Bende", "Abia"] },
  { title: "Bende IV", meta: ["174", "Bende South", "Bende", "Abia"] },
  { title: "Isuikwuato I", meta: ["174", "Isuikwuato", "Isuikwuato", "Abia"] },
  { title: "Isuikwuato II", meta: ["174", "Isuikwuato", "Isuikwuato", "Abia"] },
];

import { useBodiesDialogs } from "#/components/dialogs/useBodiesDialogs";

function RouteComponent() {
  const { dialogProps, renderDialogs } = useBodiesDialogs();

  return (
    <Layout>
      <PageHeader title="Bodies" activeTab="wards" tabs={BODIES_TABS} />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton {...dialogProps} />
          </>
        }
      />

      <WardsTable items={WARDS_DATA} />
      {renderDialogs()}
    </Layout>
  );
}

