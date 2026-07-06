import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAppSelector } from "#/redux/hooks";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { getApplications, cancelApplication } from "#/lib/server/applications";
import { getPageHeader } from "#/lib/shared/meta";
import { PageWrapper } from "#/components/Wrappers";
import { Button } from "@repo/ui/components/button";
import { StickyFooter } from "#/components/Footers";
import { toast } from "sonner";
import { Tabs } from "#/components/Tabs";
import { PageHeader } from "#/components/Headers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import CancelIcon from "@repo/ui/icons/cancel-icon";
import MapPinIcon from "@repo/ui/icons/map-pin-icon";
import { cn } from "@repo/ui/lib/utils";

export const Route = createFileRoute("/_authenticated/applications/")({
  head: () => getPageHeader({ title: "My Applications" }),
  component: ApplicationsIndexPage,
});

const PartyLogo = ({ shortName }: { shortName?: string }) => {
  let bgClass = "bg-[#1E3A8A]";
  if (shortName === "APC") bgClass = "bg-blue-600";
  else if (shortName === "PDP") bgClass = "bg-red-600";
  else if (shortName === "NDC") bgClass = "bg-green-600";
  else if (shortName === "LP") bgClass = "bg-red-700";
  else if (shortName === "NNPP") bgClass = "bg-blue-800";
  else if (shortName === "APGA") bgClass = "bg-green-700";
  else if (shortName === "SDP") bgClass = "bg-orange-500";
  else if (shortName === "ADC") bgClass = "bg-teal-600";
  else if (shortName === "YPP") bgClass = "bg-yellow-600";

  return (
    <div
      className={`w-8 h-8 rounded-full ${bgClass} flex items-center justify-center text-white text-[9px] font-extrabold select-none shrink-0 border border-neutral-100 shadow-sm`}
    >
      <span className="scale-90">{shortName || ""}</span>
    </div>
  );
};

const formatDate = (val: any) => {
  const dateObj = val?.Time || val;
  if (!dateObj) return "";
  try {
    return new Date(dateObj).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (e) {
    return "";
  }
};

function ApplicationsIndexPage() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const queryClient = useQueryClient();

  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "track">("active");
  const [cancelledIds, setCancelledIds] = useState<number[]>([]);

  const cancelMutation = useMutation({
    mutationFn: async (appId: number) => {
      const res = await cancelApplication({ data: { id: appId } });
      if (!res.success) {
        throw new Error(res.message || "Failed to cancel application");
      }
      return res;
    },
    onSuccess: () => {
      toast.success("Application cancelled successfully", {
        position: "top-center",
      });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setSelectedApp(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to cancel application", {
        position: "top-center",
      });
    },
  });

  const { data: applications = [], isLoading: loading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await getApplications();
      if (!res || !res.success || !res.data?.applications) {
        return [];
      }
      return res.data.applications;
    },
    select: (data) => {
      return data.map((app: any) => {
        const statusStr = app.status || "pending";
        return {
          id: app.id,
          election: {
            name: app.election_group_name || "Unknown Election",
            date: formatDate(app.election_date) || "TBD",
          },
          polling_unit: {
            name:
              app.polling_unit_name?.String ||
              app.polling_unit_name ||
              "Unknown Polling Unit",
            ward: {
              name: app.lga_name?.String || app.lga_name || "Unknown Ward",
            },
          },
          status: statusStr,
          role: "Primary Party Agent",
          applied_on: formatDate(app.created_at) || "N/A",
          accepted_on:
            statusStr === "approved" ||
            statusStr === "success" ||
            statusStr === "accepted"
              ? formatDate(app.updated_at)
              : null,
          rejected_reason:
            app.rejected_reason?.String || app.rejected_reason || "",
          state: app.state_name?.String || app.state_name || "Unknown State",
          party: {
            name: app.party_name,
            short_name: app.party_short_name,
            logo: app.party_logo,
          },
        };
      });
    },
  });

  const visibleApps = applications.filter(
    (a: any) => !cancelledIds.includes(a.id),
  );

  const activeCount = visibleApps.filter(
    (a: any) =>
      a.status === "pending" ||
      a.status === "approved" ||
      a.status === "success" ||
      a.status === "accepted",
  ).length;

  if (loading) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center bg-black/95">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  if (selectedApp) {
    const isAccepted =
      selectedApp.status === "approved" ||
      selectedApp.status === "success" ||
      selectedApp.status === "accepted";
    const isRejected = selectedApp.status === "rejected";
    const isCancelled = selectedApp.status === "cancelled";

    let statusLabel = "AWAITING ACCEPTANCE";
    let statusColor = "text-neutral-500";
    if (isAccepted) {
      statusLabel = "ACCEPTED";
      statusColor = "text-[#00DF82]";
    } else if (isRejected) {
      statusLabel = "REJECTED";
      statusColor = "text-[#FF4252]";
    } else if (isCancelled) {
      statusLabel = "CANCELLED";
      statusColor = "text-[#FF9800]";
    }

    return (
      <PageWrapper>
        <div className="w-full flex flex-col justify-between px-4 pt-4 min-h-screen">
          <div className="w-full">
            {/* Header */}
            <div className="flex items-center justify-between w-full pb-6">
              <Button
                type="button"
                variant="ghost"
                size="4xl"
                onClick={() => setSelectedApp(null)}
                className="w-16 [&_svg]:size-7 [&_svg]:text-c-70 -ml-4"
              >
                <ArrowLeft />
              </Button>
              <h1 className="text-[18px] font-bold text-neutral-800">
                {selectedApp.election.name}
              </h1>
              <PartyLogo shortName={selectedApp.party?.short_name} />
            </div>

            {/* Status Display */}
            <div className="text-center py-8 space-y-2">
              <h2
                className={`text-[36px] font-black tracking-wide ${statusColor}`}
              >
                {statusLabel}
              </h2>
              <p className="text-[14px] text-neutral-400 font-bold">
                {selectedApp.accepted_on
                  ? `Accepted on ${selectedApp.accepted_on}`
                  : `Applied on ${selectedApp.applied_on}`}
              </p>
            </div>

            {/* Details Grid */}
            <div className="space-y-5 border-t border-neutral-100 pt-6 mt-2">
              <div className="flex justify-between items-center text-[15px]">
                <span className="text-neutral-400 font-bold">Role</span>
                <span className="text-neutral-800 font-extrabold">
                  {selectedApp.role}
                </span>
              </div>
              <div className="flex justify-between items-center text-[15px]">
                <span className="text-neutral-400 font-bold">Applied on</span>
                <span className="text-neutral-800 font-extrabold">
                  {selectedApp.applied_on}
                </span>
              </div>
              {isAccepted && (
                <div className="flex justify-between items-center text-[15px]">
                  <span className="text-neutral-400 font-bold">
                    Accepted on
                  </span>
                  <span className="text-neutral-800 font-extrabold">
                    {selectedApp.accepted_on}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-[15px]">
                <span className="text-neutral-400 font-bold">State</span>
                <span className="text-neutral-800 font-extrabold">
                  {selectedApp.state}
                </span>
              </div>
              <div className="flex justify-between items-center text-[15px]">
                <span className="text-neutral-400 font-bold">Ward</span>
                <span className="text-neutral-800 font-extrabold">
                  {selectedApp.polling_unit.ward?.name || "Unknown Ward"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[15px]">
                <span className="text-neutral-400 font-bold">Polling Unit</span>
                <span className="text-neutral-800 font-extrabold text-right max-w-[240px] truncate">
                  {selectedApp.polling_unit.name}
                </span>
              </div>
              <div className="flex justify-between items-center text-[15px]">
                <span className="text-neutral-400 font-bold">Party</span>
                <div className="flex items-center gap-1.5 font-extrabold text-neutral-800">
                  <PartyLogo shortName={selectedApp.party?.short_name} />
                  <span>{selectedApp.party?.short_name || ""}</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-[15px]">
                <span className="text-neutral-400 font-bold">
                  Election date
                </span>
                <span className="text-neutral-800 font-extrabold">
                  {selectedApp.election.date}
                </span>
              </div>
              {isRejected && selectedApp.rejected_reason && (
                <div className="flex justify-between items-center text-[15px]">
                  <span className="text-neutral-400 font-bold">Reason</span>
                  <span className="text-neutral-800 font-extrabold text-right max-w-[240px]">
                    {selectedApp.rejected_reason}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedApp.status === "pending" && (
          <StickyFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="deepGrey"
                  size="4xl"
                  className="w-full rounded-full"
                >
                  Cancel Application
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Application</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this application? This
                    action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={cancelMutation.isPending}>
                    Keep Application
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async (e) => {
                      e.preventDefault();
                      cancelMutation.mutate(selectedApp.id);
                    }}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </StickyFooter>
        )}
      </PageWrapper>
    );
  }

  // Filter application list by selected tab
  const filteredApps = visibleApps.filter((app: any) => {
    if (activeTab === "active") {
      return (
        app.status === "pending" ||
        app.status === "approved" ||
        app.status === "success" ||
        app.status === "accepted"
      );
    } else {
      return app.status === "rejected" || app.status === "cancelled";
    }
  });

  return (
    <PageWrapper>
      <div className="w-full pt-4 flex flex-col flex-1 bg-black/95">
        {/* Header */}
        <PageHeader
          title="Party Agent"
          className="text-white/90"
          buttonClassName="[&_svg]:text-white/70"
        />

        {/* Stats Black Card */}
        <div className="flex flex-col items-center justify-center px-4 space-y-4">
          <div className="flex flex-col items-center gap-1 mt-2 text-white">
            <span className="text-2xl font-semibold">{activeCount}</span>
            <span className="text-xs">Active Applications</span>
          </div>

          <Button
            type="button"
            variant="deepGrey"
            size="4xl"
            className="w-full shrink-0 bg-white/20 text-white"
            onClick={() => navigate({ to: "/applications/apply" })}
          >
            Apply for another
          </Button>
        </div>

        {/* Applications list */}
        <div className="mt-6 space-y-1 bg-background px-4 pb-8 h-full rounded-t-3xl space-y-5">
          {/* Tabs Selector */}
          <Tabs
            className="mt-6"
            activeTab={activeTab}
            onTabChange={(val) => setActiveTab(val as "active" | "track")}
            tabs={[
              { label: "Active", value: "active" },
              { label: "Track record", value: "track" },
            ]}
          />

          <div className="space-y-5">
            <h2 className="text-[18px] font-medium text-c-80">
              Your Applications
            </h2>

            {filteredApps.length === 0 ? (
              <p className="text-c-50 font-medium py-6 text-center">
                No applications in this tab.
              </p>
            ) : (
              <div>
                {filteredApps.map((app: any) => {
                  const isApproved =
                    app.status === "approved" ||
                    app.status === "success" ||
                    app.status === "accepted";
                  const isRejected = app.status === "rejected";

                  let bulletEl = (
                    <div className="size-6 rounded-full bg-c-20 shrink-0 mt-0.5" />
                  );
                  if (isApproved) {
                    bulletEl = (
                      <div className="size-6 rounded-full bg-secondary text-primary flex items-center justify-center shrink-0 mt-0.5 animate-none">
                        <Check className="size-3.5" strokeWidth={2} />
                      </div>
                    );
                  } else if (isRejected) {
                    bulletEl = (
                      <div className="size-6 rounded-full bg-red text-white flex items-center justify-center shrink-0 font-black text-[10px] mt-0.5 select-none leading-none">
                        <CancelIcon />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="flex items-start gap-4 px-2 py-4 rounded-[16px] hover:bg-neutral-50 cursor-pointer transition"
                    >
                      {bulletEl}
                      <div className="flex flex-col gap-1.5 select-none">
                        <span className="text-[17px] text-neutral-900 leading-tight">
                          {app.election.name}
                        </span>
                        <div className="flex items-center gap-2 text-c-50">
                          <MapPinIcon
                            className="text-c-70 size-4"
                            strokeWidth={1.3}
                          />
                          <span>{app.polling_unit.name}</span>
                        </div>
                        {!isApproved && (
                          <span
                            className={cn(
                              "mt-0.5",
                              isRejected ? "text-red" : "text-neutral-400",
                            )}
                          >
                            {isRejected ? "Rejected" : "Awaiting acceptance"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
