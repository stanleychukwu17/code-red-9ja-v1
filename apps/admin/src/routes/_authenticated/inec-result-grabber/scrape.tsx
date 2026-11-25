import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { useState } from "react";
import { Layout, PageHeader } from "@repo/ui/components/custom/AdminLayouts";
import { INEC_RESULT_GRABBER_TABS } from "./-data";
import {
  DiscoverElectionsCard,
  type DiscoverFilter,
} from "./-components/DiscoverElectionsCard";
import {
  PinINECElectionCard,
  type INECElectionPreview,
} from "./-components/PinINECElectionCard";
import { SyncMongoIDsCard } from "./-components/SyncMongoIDsCard";
import { discoverINECElections } from "#/lib/server/inec_grabber";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute(
  "/_authenticated/inec-result-grabber/scrape",
)({
  head: () => getPageHeader({ title: "Discover INEC Elections" }),
  component: RouteComponent,
});

function RouteComponent() {
  const [discoverFilter, setDiscoverFilter] = useState<DiscoverFilter>({
    officeId: "",
    stateId: "",
    year: "2023",
  });
  const [discoverParams, setDiscoverParams] = useState<{
    officeId: string;
    stateId?: string;
    year?: number;
  } | null>(null);
  const [selectedInecElectionId, setSelectedInecElectionId] =
    useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Query IReV for matching elections by office, optional state, and year (cached per filter)
  const discoverQuery = useQuery({
    queryKey: ["inec-discover-elections", discoverParams],
    queryFn: async () => {
      if (!discoverParams) return [] as INECElectionPreview[];
      const res = await discoverINECElections({ data: discoverParams });
      if (!res?.success) {
        throw new Error(res?.message || "Failed to discover INEC elections");
      }
      return (res.data?.elections ?? []) as INECElectionPreview[];
    },
    enabled: !!discoverParams,
    staleTime: Infinity,
  });

  const inecElections = discoverQuery.data ?? [];
  const selectedElection = inecElections.find(
    (e) => e._id === selectedInecElectionId,
  );

  const handleDiscover = () => {
    if (!discoverFilter.officeId) {
      setErrorMessage("Select an office / election type");
      return;
    }
    const parsedYear = discoverFilter.year.trim()
      ? Number(discoverFilter.year.trim())
      : undefined;
    setErrorMessage("");
    setSelectedInecElectionId("");
    setDiscoverParams({
      officeId: discoverFilter.officeId,
      stateId: discoverFilter.stateId || undefined,
      year: parsedYear,
    });
  };

  const combinedError =
    errorMessage ||
    (discoverQuery.error instanceof Error ? discoverQuery.error.message : "");

  return (
    <Layout>
      <PageHeader
        title="INEC Results"
        activeTab="scrape"
        tabs={INEC_RESULT_GRABBER_TABS}
      />

      <div className="max-w-3xl space-y-6 py-6">
        <DiscoverElectionsCard
          value={discoverFilter}
          isFetching={discoverQuery.isFetching}
          onChange={setDiscoverFilter}
          onDiscover={handleDiscover}
        />

        {combinedError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {combinedError}
          </div>
        )}

        {inecElections.length > 0 && (
          <PinINECElectionCard
            key={inecElections.map((e) => e._id).join(",")}
            elections={inecElections}
            selectedElectionId={selectedInecElectionId}
            onSelect={setSelectedInecElectionId}
          />
        )}

        <SyncMongoIDsCard selectedElection={selectedElection} />
      </div>
    </Layout>
  );
}
