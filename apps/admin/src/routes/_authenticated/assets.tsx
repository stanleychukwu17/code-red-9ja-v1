import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import * as React from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { FolderKanban } from "lucide-react";

export const Route = createFileRoute("/_authenticated/assets")({
  head: () => getPageHeader({ title: "Media Assets" }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Layout>
      <PageHeader title="Media Assets" activeTab="" />
      <PageSearchLayer
        rightComponent={
          <>
            <AddButton onClick={() => { }} />
          </>
        }
      />
      <div className="flex flex-col items-center justify-center min-h-100 rounded-xl bg-sidebar-softer/50 p-8 text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
          <FolderKanban className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">Media & Asset Manager</h3>
        <p className="text-sm text-muted-foreground max-w-md mt-1">
          Explore folders in your Cloudflare R2 bucket, manage development assets (.ai, images, videos), and upload new assets.
        </p>
      </div>
    </Layout>
  );
}
