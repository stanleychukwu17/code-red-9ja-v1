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
import {
  ScrapeControlsCard,
  type ScrapeOptions,
} from "./-components/ScrapeControlsCard";
import { SyncMongoIDsCard } from "./-components/SyncMongoIDsCard";
import {
  controlledScrapeINEC,
  discoverINECElections,
} from "#/lib/server/inec_grabber";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute(
  "/_authenticated/inec-result-grabber/scrape",
)({
  head: () => getPageHeader({ title: "Controlled INEC Scrape" }),
  component: RouteComponent,
});

function RouteComponent() {
  const queryClient = useQueryClient();

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
  const [scrapeOptions, setScrapeOptions] = useState<ScrapeOptions>({
    scopeStateId: "",
    lgaId: "",
    wardId: "",
    maxPUs: "5",
    uploadToR2: true,
    saveToLocal: false,
    aiExtract: true,
    force: true,
  });
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Step 1: Query IReV for matching elections by office, optional state, and year (cached per filter)
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
    setStatusMessage("");
    setSelectedInecElectionId("");
    setScrapeOptions((prev) => ({
      ...prev,
      scopeStateId: "",
      lgaId: "",
      wardId: "",
    }));
    setDiscoverParams({
      officeId: discoverFilter.officeId,
      stateId: discoverFilter.stateId || undefined,
      year: parsedYear,
    });
  };

  // Pinning an INEC election resets LGA/Ward filters
  const handleSelectInecElection = (inecElectionId: string) => {
    setSelectedInecElectionId(inecElectionId);
    setScrapeOptions((prev) => ({
      ...prev,
      scopeStateId: "",
      lgaId: "",
      wardId: "",
    }));
  };

  // Step 3: Execute the controlled scrape (links matching local election if found, else election_id = NULL)
  const runScrapeMutation = useMutation({
    mutationFn: async () => {
      if (!discoverFilter.officeId) {
        throw new Error("Select an office / election type first");
      }
      if (!selectedInecElectionId) {
        throw new Error("Pin an upstream INEC election from Step 2 first");
      }
      const parsedYear = discoverFilter.year.trim()
        ? Number(discoverFilter.year.trim())
        : undefined;
      const parsedMaxPUs = scrapeOptions.maxPUs.trim()
        ? Number(scrapeOptions.maxPUs.trim())
        : undefined;

      const res = await controlledScrapeINEC({
        data: {
          officeId: discoverFilter.officeId,
          stateId: discoverFilter.stateId || undefined,
          year: parsedYear,
          inecElectionId: selectedInecElectionId,
          lgaId: scrapeOptions.lgaId || undefined,
          wardId: scrapeOptions.wardId || undefined,
          maxPUs: parsedMaxPUs,
          uploadToR2: scrapeOptions.uploadToR2,
          saveToLocal: import.meta.env.DEV ? scrapeOptions.saveToLocal : false,
          aiExtract: scrapeOptions.aiExtract,
          force: scrapeOptions.force,
        },
      });
      if (!res?.success) {
        throw new Error(res?.message || "Controlled scrape failed");
      }
      return res.data;
    },
    onSuccess: (data) => {
      setErrorMessage("");
      const collected = data?.results_collected ?? 0;
      const matchedElectionId = data?.matched_election_id;
      const targetInfo = matchedElectionId
        ? `linked to local election #${matchedElectionId}`
        : "saved standalone (election_id = NULL)";
      setStatusMessage(
        `Scrape finished (${targetInfo}): ${collected} new polling unit result(s) collected.`,
      );
      queryClient.invalidateQueries({ queryKey: ["inec-result-grabbers"] });
      queryClient.invalidateQueries({ queryKey: ["inec-result-grabber-logs"] });
    },
    onError: (err: Error) => {
      setErrorMessage(err.message);
      setStatusMessage("");
    },
  });

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

        {inecElections.length > 0 && (
          <PinINECElectionCard
            key={inecElections.map((e) => e._id).join(",")}
            elections={inecElections}
            selectedElectionId={selectedInecElectionId}
            onSelect={handleSelectInecElection}
          />
        )}

        <ScrapeControlsCard
          value={scrapeOptions}
          selectedInecElectionId={selectedInecElectionId}
          stateId={discoverFilter.stateId}
          isRunning={runScrapeMutation.isPending}
          errorMessage={combinedError}
          statusMessage={statusMessage}
          onChange={setScrapeOptions}
          onRun={() => runScrapeMutation.mutate()}
        />

        <SyncMongoIDsCard selectedElection={selectedElection} />
      </div>
    </Layout>
  );
}
