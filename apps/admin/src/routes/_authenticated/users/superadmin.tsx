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
import { UsersTable } from "#/components/Tables";
import { USERS_TABS } from "./data";

export const Route = createFileRoute("/_authenticated/users/superadmin")({
  head: () => getPageHeader({ title: "Users - Superadmin" }),
  component: RouteComponent,
});

const SUPER_ADMINS_DATA = [
  {
    name: "Daniel Chukwu",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    status: "Active",
    dateAdded: "May 26, 26",
  },
  {
    name: "Ogbona Chukwu",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    status: "Active",
    dateAdded: "May 26, 26",
  },
];

function RouteComponent() {
  return (
    <Layout>
      <PageHeader title="Users" activeTab="superadmin" tabs={USERS_TABS} />
      <PageSearchLayer
        rightComponent={
          <>
            <FilterButton />
            <AddButton />
          </>
        }
      />

      <UsersTable items={SUPER_ADMINS_DATA} />
    </Layout>
  );
}
