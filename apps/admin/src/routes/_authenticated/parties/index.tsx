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
import { PartiesTable } from "#/components/Tables";
import { CreatePartyDialog } from "#/components/dialogs/CreatePartyDialog";

export const Route = createFileRoute("/_authenticated/parties/")({
  head: () => getPageHeader({ title: "Parties" }),
  component: RouteComponent,
});

const PARTIES_DATA = [
  {
    code: "APC",
    name: "All Progressives Congress",
    logo: "https://upload.wikimedia.org/wikipedia/en/6/62/Logo_of_the_Peoples_Democratic_Party_%28Nigeria%29.png",
    puAgents: "0 (0%)",
  },
  {
    code: "ADC",
    name: "African Democratic Congress",
    logo: "https://upload.wikimedia.org/wikipedia/en/6/62/Logo_of_the_Peoples_Democratic_Party_%28Nigeria%29.png",
    puAgents: "103.5k (0%)",
  },
  {
    code: "PDP",
    name: "People's Democratic Party",
    logo: "https://upload.wikimedia.org/wikipedia/en/6/62/Logo_of_the_Peoples_Democratic_Party_%28Nigeria%29.png",
    puAgents: "0 (0%)",
  },
  {
    code: "LP",
    name: "Labour Party",
    logo: "https://upload.wikimedia.org/wikipedia/en/6/62/Logo_of_the_Peoples_Democratic_Party_%28Nigeria%29.png",
    puAgents: "0 (0%)",
  },
  {
    code: "NNPP",
    name: "New Nigeria Peoples Party",
    logo: "https://upload.wikimedia.org/wikipedia/en/6/62/Logo_of_the_Peoples_Democratic_Party_%28Nigeria%29.png",
    puAgents: "0 (0%)",
  },
];

function RouteComponent() {
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);

  return (
    <Layout>
      <PageHeader title="Parties" activeTab="" />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton onClick={() => setIsAddPartyOpen(true)} />
          </>
        }
      />

      <PartiesTable items={PARTIES_DATA} />

      <CreatePartyDialog
        open={isAddPartyOpen}
        onClose={() => setIsAddPartyOpen(false)}
      />
    </Layout>
  );
}
