import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { PartiesLayout, PartiesTable } from "@/components/parties/PartiesLayout";

export const Route = createFileRoute("/_authenticated/parties")({
  head: () => getPageHeader({ title: "Parties" }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <PartiesLayout>
      <PartiesTable
        rows={[
          {
            code: "APC",
            name: "All Progressives Congress",
            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/All_Progressives_Congress_logo.svg/240px-All_Progressives_Congress_logo.svg.png",
            puAgents: "0 (0%)",
          },
          {
            code: "ADC",
            name: "African Democratic Congress",
            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/African_Democratic_Congress_logo.jpg/240px-African_Democratic_Congress_logo.jpg",
            puAgents: "103.5k (0%)",
          },
          {
            code: "PDP",
            name: "People's Democratic Party",
            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Peoples_Democratic_Party_%28Nigeria%29_logo.png/240px-Peoples_Democratic_Party_%28Nigeria%29_logo.png",
            puAgents: "0 (0%)",
          },
          {
            code: "LP",
            name: "Labour Party",
            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Labour_Party_of_Nigeria_logo.png/240px-Labour_Party_of_Nigeria_logo.png",
            puAgents: "0 (0%)",
          },
          {
            code: "NNPP",
            name: "New Nigeria Peoples Party",
            logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/New_Nigeria_Peoples_Party_logo.png/240px-New_Nigeria_Peoples_Party_logo.png",
            puAgents: "0 (0%)",
          },
        ]}
      />
    </PartiesLayout>
  );
}
