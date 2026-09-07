import {
  approveApplication,
  getLGAs,
  getPollingUnitRecommendations,
  getPollingUnits,
  getWards,
  rejectApplication,
} from "#/lib/server/applications";
import { changeAgentRole } from "#/lib/server/agents";
import { getStates } from "#/lib/server/countries";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { SelectElectionRole } from "@repo/ui/components/selects/election-role-select";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import { cn } from "@repo/ui/lib/utils";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Check,
  Loader2,
  Shield,
  ShieldCheck,
  FileText,
  ExternalLink,
  CheckCircle,
  ArrowRightLeft,
  MapPin,
} from "lucide-react";
import * as React from "react";
import { useIntersectionObserver } from "usehooks-ts";

export type ApplicationData = {
  id?: number;
  userId?: number;
  status?: string;
  role?: string;
  name: string;
  avatar: string;
  location: string;
  election: string;
  stateName?: string;
  lgaName?: string;
  wardName?: string;
  pollingUnitName?: string;
  degreeCertificateUrl?: string;
  voterId?: string;
  phone?: string;
  callingPhone?: string;
  whatsappPhone?: string;
  dataPhone?: string;
  schoolName?: string;
  degree?: string;
  graduationYear?: string;
  educationalStatus?: string;
  address?: string;
  wardId?: number;
  pollingUnitId?: number;
  electionGroupId?: number;
  partyId?: number;
  stateId?: number;
  lgaId?: number;
  partyLogo?: string;
  partyShortName?: string;
  voters_card_image?: any;
};

export const getRoleLabel = (r?: string) => {
  switch (r) {
    case "state_election_supervisor":
    case "state_supervisor":
      return "State Election Supervisor";
    case "lga_election_supervisor":
    case "lga_supervisor":
      return "LGA Election Supervisor";
    case "ward_election_supervisor":
    case "ward_supervisor":
      return "Ward Election Supervisor";
    default:
      return "Polling Unit Agent";
  }
};

const getPgString = (val: any) => {
  if (val && typeof val === "object" && "String" in val) {
    return val.String || "";
  }
  return val || "";
};

const fetchStatesAdapter = async (args: {
  data: { countryId: number; limit?: number; cursor?: string };
}) => {
  return getStates({
    data: {
      countryId: args.data.countryId,
      limit: args.data.limit,
      cursor: args.data.cursor,
    },
  });
};

const fetchLgasAdapter = async (args: {
  data: { stateId?: number; limit?: number; cursor?: string };
}) => {
  return getLGAs({
    data: {
      stateId: args.data.stateId,
    },
  });
};

const fetchWardsAdapter = async (args: {
  data: { lga_id?: number; stateId?: number; limit?: number; cursor?: string };
}) => {
  return getWards({
    data: {
      lga_id: args.data.lga_id,
      stateId: args.data.stateId,
    },
  });
};

interface PartyApplicationDialogProps {
  open: boolean;
  onClose: () => void;
  application: ApplicationData;
}

type PollingUnitOption = {
  id: string;
  name: string;
  subLocation: string;
  agentsCount: number;
  ward: string;
};

export function PartyApplicationDialog({
  open,
  onClose,
  application,
}: PartyApplicationDialogProps) {
  const queryClient = useQueryClient();
  const [selectedUnitId, setSelectedUnitId] = React.useState<string>("");
  const [currentOptions, setCurrentOptions] = React.useState<
    PollingUnitOption[]
  >([]);
  const [openChooseDialog, setOpenChooseDialog] = React.useState(false);

  const [role, setRole] = React.useState<string>(
    application.role || "polling_agent",
  );
  const [selectedState, setSelectedState] = React.useState<number | "">(
    application.stateId || "",
  );
  const [selectedLga, setSelectedLga] = React.useState<number | "">(
    application.lgaId || "",
  );
  const [selectedWard, setSelectedWard] = React.useState<number | "">(
    application.wardId || "",
  );

  React.useEffect(() => {
    if (open) {
      setRole(application.role || "polling_agent");
      setSelectedState(application.stateId || "");
      setSelectedLga(application.lgaId || "");
      setSelectedWard(application.wardId || "");
      if (application.pollingUnitId) {
        setSelectedUnitId(String(application.pollingUnitId));
      } else {
        setSelectedUnitId("");
      }
    }
  }, [open, application]);

  const votersCardImage = getPgString(application.voters_card_image);

  // Fetch recommendations only if role is polling_agent
  const canFetchRecommendations =
    open &&
    role === "polling_agent" &&
    !!application.partyId &&
    !!application.electionGroupId;

  const { data: recData, isLoading: isUnitsLoading } = useQuery({
    queryKey: [
      "puRecommendations",
      application.partyId,
      application.electionGroupId,
      application.lgaId,
      application.wardId,
      application.pollingUnitId,
    ],
    queryFn: async () => {
      const res = await getPollingUnitRecommendations({
        data: {
          partyID: application.partyId!,
          electionGroupID: application.electionGroupId!,
          lgaID: application.lgaId,
          wardID: application.wardId,
          pollingUnitID: application.pollingUnitId,
        },
      });
      if (res && res.success && Array.isArray(res.data?.polling_units)) {
        return res.data.polling_units as Array<{
          id: number;
          name: string;
          ward_name: string;
          lga_name: string;
          state_name: string;
          agents_count: number;
        }>;
      }
      return [];
    },
    enabled: canFetchRecommendations,
  });

  const pollingUnits: PollingUnitOption[] = React.useMemo(() => {
    if (!recData) return [];
    return recData.map((pu) => ({
      id: String(pu.id),
      name: pu.name,
      subLocation: pu.lga_name || pu.state_name || "",
      agentsCount: pu.agents_count,
      ward: pu.ward_name || "UNKNOWN WARD",
    }));
  }, [recData]);

  const isAccepted = application.status === "accepted";

  // Auto-select applicant's polling unit on load
  React.useEffect(() => {
    if (pollingUnits.length > 0) {
      let opts = [...pollingUnits];
      const applicantUnit = application.pollingUnitId
        ? opts.find((u) => u.id === String(application.pollingUnitId))
        : undefined;
      if (
        !applicantUnit &&
        application.pollingUnitId &&
        application.pollingUnitName
      ) {
        opts = [
          {
            id: String(application.pollingUnitId),
            name: application.pollingUnitName,
            subLocation:
              `${application.wardName || ""} ${application.lgaName || ""}`.trim(),
            agentsCount: 1,
            ward: application.wardName || "",
          },
          ...opts,
        ];
      }
      setCurrentOptions(opts);
      setSelectedUnitId(String(application.pollingUnitId || opts[0]?.id || ""));
    } else if (application.pollingUnitId && application.pollingUnitName) {
      setCurrentOptions([
        {
          id: String(application.pollingUnitId),
          name: application.pollingUnitName,
          subLocation:
            `${application.wardName || ""} ${application.lgaName || ""}`.trim(),
          agentsCount: 1,
          ward: application.wardName || "",
        },
      ]);
      setSelectedUnitId(String(application.pollingUnitId));
    }
  }, [pollingUnits, application.pollingUnitId, application.pollingUnitName]);

  const handleChooseAnother = () => {
    setOpenChooseDialog(true);
  };

  const handleSelectUnit = (id: string) => {
    setSelectedUnitId(id);
  };

  const changeRoleMutation = useMutation({
    mutationFn: async (values: {
      newRole: string;
      stateId?: number;
      lgaId?: number;
      wardId?: number;
      pollingUnitId?: number;
    }) => {
      const targetUserId = application.userId || (application as any).user_id;
      if (!targetUserId) {
        throw new Error("Missing User ID for agent");
      }
      if (!application.partyId) {
        throw new Error("Missing Party ID");
      }
      if (!application.electionGroupId) {
        throw new Error("Missing Election Group ID");
      }
      const res = await changeAgentRole({
        data: {
          userId: targetUserId,
          partyId: application.partyId,
          electionGroupId: application.electionGroupId,
          currentRoleType: application.role || "polling_agent",
          newRoleType: values.newRole,
          stateId: values.stateId,
          lgaId: values.lgaId,
          wardId: values.wardId,
          pollingUnitId: values.pollingUnitId,
        },
      });
      if (!res.success) {
        throw new Error(res.message || "Failed to update agent assignment");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["agent-performance"] });
      queryClient.invalidateQueries({
        queryKey: ["polling-agent-performance"],
      });
      queryClient.invalidateQueries({
        queryKey: ["ward-supervisor-performance"],
      });
      queryClient.invalidateQueries({
        queryKey: ["lga-supervisor-performance"],
      });
      queryClient.invalidateQueries({
        queryKey: ["state-supervisor-performance"],
      });
      alert("Agent assignment updated successfully!");
      onClose();
    },
    onError: (err: any) => {
      alert(err.message || "Failed to update agent assignment");
    },
  });

  const handleSaveChanges = async () => {
    if (role === "polling_agent" && !selectedUnitId) {
      alert("Please select a polling unit for this polling agent.");
      return;
    }
    if (role === "state_election_supervisor" && !selectedState) {
      alert("Please select a state.");
      return;
    }
    if (
      role === "lga_election_supervisor" &&
      (!selectedState || !selectedLga)
    ) {
      alert("Please select a state and LGA.");
      return;
    }
    if (
      role === "ward_election_supervisor" &&
      (!selectedState || !selectedLga || !selectedWard)
    ) {
      alert("Please select a state, LGA, and Ward.");
      return;
    }

    changeRoleMutation.mutate({
      newRole: role,
      stateId: selectedState ? Number(selectedState) : undefined,
      lgaId: selectedLga ? Number(selectedLga) : undefined,
      wardId: selectedWard ? Number(selectedWard) : undefined,
      pollingUnitId:
        role === "polling_agent" && selectedUnitId
          ? Number(selectedUnitId)
          : undefined,
    });
  };

  const approveMutation = useMutation({
    mutationFn: async (values: {
      role: string;
      pollingUnitId?: number;
      stateId?: number;
      lgaId?: number;
      wardId?: number;
    }) => {
      if (!application.id) {
        throw new Error("Missing Application ID");
      }
      const res = await approveApplication({
        data: {
          id: application.id,
          roleType: values.role,
          pollingUnitID: values.pollingUnitId,
          stateId: values.stateId,
          lgaId: values.lgaId,
          wardId: values.wardId,
        },
      });
      if (!res.success) {
        throw new Error(res.message || "Failed to approve application");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      onClose();
    },
    onError: (err: any) => {
      alert(err.message || "Failed to approve application");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!application.id) {
        throw new Error("Missing Application ID");
      }
      const res = await rejectApplication({
        data: {
          id: application.id,
          reason,
        },
      });
      if (!res.success) {
        throw new Error(res.message || "Failed to reject application");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      onClose();
    },
    onError: (err: any) => {
      alert(err.message || "Failed to reject application");
    },
  });

  const handleAccept = async () => {
    if (
      role === "polling_agent" &&
      !selectedUnitId &&
      pollingUnits.length > 0
    ) {
      alert("Please select a polling unit to assign.");
      return;
    }
    if (role === "state_election_supervisor" && !selectedState) {
      alert("Please select a state.");
      return;
    }
    if (
      role === "lga_election_supervisor" &&
      (!selectedState || !selectedLga)
    ) {
      alert("Please select a state and LGA.");
      return;
    }
    if (
      role === "ward_election_supervisor" &&
      (!selectedState || !selectedLga || !selectedWard)
    ) {
      alert("Please select a state, LGA, and Ward.");
      return;
    }

    approveMutation.mutate({
      role,
      pollingUnitId:
        role === "polling_agent" ? Number(selectedUnitId) : undefined,
      stateId: selectedState ? Number(selectedState) : undefined,
      lgaId: selectedLga ? Number(selectedLga) : undefined,
      wardId: selectedWard ? Number(selectedWard) : undefined,
    });
  };

  const handleReject = () => {
    const reason = window.prompt("Enter rejection reason:");
    if (reason === null) return; // user cancelled prompt
    if (reason.trim() === "") {
      alert("A rejection reason is required.");
      return;
    }
    rejectMutation.mutate(reason);
  };

  const isSubmitting =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    changeRoleMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[620px] p-0 rounded-2xl border-none shadow-2xl   overflow-hidden">
          <DialogHeader
            title={
              isAccepted
                ? "Manage Agent Assignment"
                : `${getRoleLabel(role)} Application`
            }
            description={
              isAccepted
                ? "Modify election role or reassign geographic station for this active agent."
                : `Review and process application for ${getRoleLabel(role).toLowerCase()}.`
            }
          />

          <DialogPadding className="space-y-5 pt-3 pb-5 max-h-[65vh] overflow-y-auto">
            {/* Active Assignment Status Banner */}
            {isAccepted && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      Active Assigned Agent
                    </p>
                    <p className="text-xs text-c-60 mt-0.5">
                      Currently active as{" "}
                      <span className="font-semibold text-c-80">
                        {getRoleLabel(application.role || "polling_agent")}
                      </span>
                      {application.pollingUnitName &&
                      application.role === "polling_agent"
                        ? ` at ${application.pollingUnitName}`
                        : application.wardName &&
                            (application.role === "ward_election_supervisor" ||
                              application.role === "ward_supervisor")
                          ? ` in ${application.wardName} Ward`
                          : application.lgaName &&
                              (application.role === "lga_election_supervisor" ||
                                application.role === "lga_supervisor")
                            ? ` in ${application.lgaName} LGA`
                            : application.stateName
                              ? ` in ${application.stateName} State`
                              : ""}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Accepted
                </span>
              </div>
            )}

            {/* Profile Block */}
            <div className="flex gap-5 items-start">
              <img
                src={application.avatar}
                alt={application.name}
                className="size-28 rounded-full object-cover shrink-0 border border-gray-100 shadow-sm"
              />
              <div className="space-y-1.5 w-full">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-c-80 leading-tight">
                      {application.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                          application.role && application.role !== "polling_agent"
                            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
                        )}
                      >
                        <Shield className="size-3" />
                        Applied Role: {getRoleLabel(application.role || "polling_agent")}
                      </span>
                    </div>
                    <p className="text-sm text-c-50 mt-1.5">
                      Application to:{" "}
                      <span className="font-medium text-c-80">
                        {application.election}
                      </span>
                    </p>
                    <div className="grid grid-cols-2 gap-x-10 gap-y-2 mt-3">
                      <p className="text-sm text-c-50">
                        State:{" "}
                        <span className="font-medium text-c-80">
                          {application.stateName || "—"}
                        </span>
                      </p>
                      <p className="text-sm text-c-50">
                        LGA:{" "}
                        <span className="font-medium text-c-80">
                          {application.lgaName || "—"}
                        </span>
                      </p>
                      <p className="text-sm text-c-50">
                        Ward:{" "}
                        <span className="font-medium text-c-80">
                          {application.wardName || "—"}
                        </span>
                      </p>
                      <p className="text-sm text-c-50">
                        Address:{" "}
                        <span className="font-medium text-c-80">
                          {application.address || "—"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Phones Block */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 px-5 py-4">
              <div className="space-y-1">
                <p className="text-[12px] text-c-50">Calling Phone No.</p>
                <p className="font-medium text-c-80">
                  {application.callingPhone || application.phone || "+234"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[12px] text-c-50">Whatsapp Phone No.</p>
                <p className="font-medium text-c-80">
                  {application.whatsappPhone || application.phone || "+234"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[12px] text-c-50">Data Phone No.</p>
                <p className="font-medium text-c-80">
                  {application.dataPhone || application.phone || "+234"}
                </p>
              </div>
            </div>

            {/* Education Block */}
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-[#f5f0ff] px-5 py-4">
              <div className="space-y-1">
                <p className="text-[12px] text-c-50">School</p>
                <p className="font-medium text-c-80">
                  {application.schoolName || "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[12px] text-c-50">Graduation Year</p>
                <p className="font-medium text-c-80">
                  {application.graduationYear || "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[12px] text-c-50">Degree</p>
                <p className="font-medium text-c-80">
                  {application.degree || "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[12px] text-c-50">Status</p>
                <p className="font-medium text-c-80">
                  {application.educationalStatus || "N/A"}
                </p>
              </div>

              {application.degreeCertificateUrl && (
                <div className="col-span-2 pt-2 border-t border-purple-200/60 flex items-center justify-between">
                  <span className="text-xs text-c-60 font-medium">
                    Graduation Certificate
                  </span>
                  <a
                    href={application.degreeCertificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-800 hover:underline"
                  >
                    <FileText className="size-3.5" />
                    View Degree Certificate
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Supervisor Scope Banner if role is supervisor */}
            {role !== "polling_agent" && (
              <div className="rounded-xl p-4 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-c-90">
                    {getRoleLabel(role)} Assignment Scope
                  </h4>
                </div>
                <p className="text-xs text-c-60 leading-relaxed">
                  {role === "ward_election_supervisor" &&
                    `This supervisor will coordinate and oversee party polling agents across all polling units in ${application.wardName || "the assigned ward"}, ${application.lgaName || "LGA"}, ${application.stateName || "State"}.`}
                  {role === "lga_election_supervisor" &&
                    `This supervisor will coordinate and oversee ward supervisors and election operations across ${application.lgaName || "the assigned LGA"}, ${application.stateName || "State"}.`}
                  {role === "state_election_supervisor" &&
                    `This supervisor will oversee party election supervisors and operations across ${application.stateName || "the assigned state"}.`}
                </p>
                <div className="flex items-center gap-3 pt-1 text-xs text-c-70 flex-wrap">
                  <span className="bg-c-10 px-2 py-0.5 rounded font-medium">
                    State: {application.stateName || "Selected State"}
                  </span>
                  {(role === "ward_election_supervisor" ||
                    role === "lga_election_supervisor") && (
                    <span className="bg-c-10 px-2 py-0.5 rounded font-medium">
                      LGA: {application.lgaName || "Selected LGA"}
                    </span>
                  )}
                  {role === "ward_election_supervisor" && (
                    <span className="bg-c-10 px-2 py-0.5 rounded font-medium">
                      Ward: {application.wardName || "Selected Ward"}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Role & Assignment Block */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-semibold text-c-50 uppercase tracking-wider">
                  {isAccepted ? "Modify Assignment or Role" : "Election Role"}
                </label>
                {isAccepted && (
                  <span className="text-xs text-c-50">
                    Change role or reassign geographic station
                  </span>
                )}
              </div>

              {/* Notice when role is being changed */}
              {isAccepted && role !== (application.role || "polling_agent") && (
                <div className="text-xs text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 p-3 rounded-xl flex items-center gap-2.5">
                  <ArrowRightLeft className="size-4 shrink-0 text-amber-600" />
                  <span>
                    Changing assignment from{" "}
                    <strong>
                      {getRoleLabel(application.role || "polling_agent")}
                    </strong>{" "}
                    to <strong>{getRoleLabel(role)}</strong>. Select the target
                    station below.
                  </span>
                </div>
              )}

              <SelectElectionRole
                selectedId={role}
                update={(newRole) => {
                  setRole(newRole);
                  if (newRole !== "polling_agent") {
                    setSelectedUnitId("");
                  }
                }}
                className="w-full"
              />

              {/* Geographic selection block */}
              {(role !== "polling_agent" || isAccepted) && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[12px] font-semibold text-c-50 uppercase tracking-wider">
                      State
                    </label>
                    <SelectState
                      selectedId={
                        selectedState ? String(selectedState) : undefined
                      }
                      countryOriginalId={161}
                      fetchStates={fetchStatesAdapter}
                      update={(state) => {
                        setSelectedState(state.id);
                        setSelectedLga("");
                        setSelectedWard("");
                        if (role === "polling_agent") setSelectedUnitId("");
                      }}
                    />
                  </div>

                  {(role === "lga_election_supervisor" ||
                    role === "ward_election_supervisor" ||
                    role === "polling_agent") && (
                    <div className="space-y-1">
                      <label className="text-[12px] font-semibold text-c-50 uppercase tracking-wider">
                        LGA
                      </label>
                      <SelectLga
                        selectedId={
                          selectedLga ? String(selectedLga) : undefined
                        }
                        stateId={
                          selectedState ? Number(selectedState) : undefined
                        }
                        fetchLGAs={fetchLgasAdapter}
                        update={(lga) => {
                          setSelectedLga(lga.id);
                          setSelectedWard("");
                          if (role === "polling_agent") setSelectedUnitId("");
                        }}
                      />
                    </div>
                  )}

                  {(role === "ward_election_supervisor" ||
                    role === "polling_agent") && (
                    <div className="space-y-1">
                      <label className="text-[12px] font-semibold text-c-50 uppercase tracking-wider">
                        Ward
                      </label>
                      <SelectWard
                        selectedId={
                          selectedWard ? String(selectedWard) : undefined
                        }
                        lgaId={selectedLga ? Number(selectedLga) : undefined}
                        stateId={
                          selectedState ? Number(selectedState) : undefined
                        }
                        fetchWards={fetchWardsAdapter}
                        update={(ward) => {
                          setSelectedWard(ward.id);
                          if (role === "polling_agent") setSelectedUnitId("");
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {role === "polling_agent" && (
              <div className="flex items-center justify-between pt-2">
                <h4 className="text-[14px] font-semibold text-c-80">
                  Polling unit of choice
                </h4>
                <button
                  type="button"
                  onClick={handleChooseAnother}
                  className="text-[14px] font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer"
                >
                  Choose another polling unit
                </button>
              </div>
            )}

            {/* Polling Units list */}
            {role === "polling_agent" && (
              <div className="space-y-3">
                {isUnitsLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center text-c-50 gap-2">
                    <Loader2 className="size-6 animate-spin text-blue-600" />
                    <p className="text-sm">Loading recommendations...</p>
                  </div>
                ) : !canFetchRecommendations ? (
                  <p className="text-center text-c-50 py-4 text-sm">
                    Party or election context missing — cannot load
                    recommendations.
                  </p>
                ) : pollingUnits.length === 0 ? (
                  <p className="text-center text-c-50 py-4 text-sm">
                    No polling units found in this applicant's LGA.
                  </p>
                ) : (
                  currentOptions.map((unit) => {
                    const isSelected = selectedUnitId === unit.id;
                    const isApplicantUnit =
                      application.pollingUnitId &&
                      unit.id === String(application.pollingUnitId);
                    const isUrgent = unit.agentsCount === 0;
                    return (
                      <div
                        key={unit.id}
                        onClick={() => handleSelectUnit(unit.id)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl transition cursor-pointer select-none",
                          isSelected
                            ? "bg-secondary/20"
                            : "bg-c-5 hover:bg-hover-2",
                        )}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-5 flex-wrap">
                            <p className="text-[15px] text-c-80">{unit.name}</p>
                            {isApplicantUnit && (
                              <span className="text-xs font-semibold text-primary">
                                👈 Applicants Choice
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-c-50 uppercase tracking-wider">
                            {unit.subLocation}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-[13px] text-c-50 mr-3">
                            {unit.agentsCount} agent
                            {unit.agentsCount !== 1 ? "s" : ""}
                          </p>
                          <div
                            className={cn(
                              "size-6 rounded-full flex items-center justify-center border transition",
                              isSelected
                                ? "bg-[#10dd84] border-transparent text-[#083b25]"
                                : "border-gray-200 bg-white",
                            )}
                          >
                            {isSelected && (
                              <Check className="size-3.5 stroke-[3]" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </DialogPadding>

          <DialogFooter>
            {isAccepted ? (
              <>
                <Button
                  type="button"
                  onClick={onClose}
                  disabled={changeRoleMutation.isPending}
                  variant="ghost"
                  size="4xl"
                >
                  Close
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  variant="secondary"
                  size="4xl"
                  disabled={
                    changeRoleMutation.isPending ||
                    (role === "polling_agent" && !selectedUnitId) ||
                    (role === "state_election_supervisor" && !selectedState) ||
                    (role === "lga_election_supervisor" &&
                      (!selectedState || !selectedLga)) ||
                    (role === "ward_election_supervisor" &&
                      (!selectedState || !selectedLga || !selectedWard))
                  }
                >
                  {changeRoleMutation.isPending
                    ? "Updating..."
                    : "Update Assignment"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={handleReject}
                  disabled={isSubmitting}
                  variant="ghost"
                  size="4xl"
                >
                  Reject
                </Button>
                <Button
                  onClick={handleAccept}
                  variant="secondary"
                  size="4xl"
                  disabled={
                    isSubmitting ||
                    (role === "polling_agent" &&
                      (isUnitsLoading || currentOptions.length === 0)) ||
                    (role === "state_election_supervisor" && !selectedState) ||
                    (role === "lga_election_supervisor" &&
                      (!selectedState || !selectedLga)) ||
                    (role === "ward_election_supervisor" &&
                      (!selectedState || !selectedLga || !selectedWard))
                  }
                >
                  {isSubmitting
                    ? "Processing..."
                    : `Accept as ${getRoleLabel(role)}`}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ChoosePollingUnitDialog
        open={openChooseDialog}
        onClose={() => setOpenChooseDialog(false)}
        stateId={selectedState ? Number(selectedState) : application.stateId}
        lgaId={selectedLga ? Number(selectedLga) : application.lgaId}
        wardId={selectedWard ? Number(selectedWard) : application.wardId}
        onSelect={(newUnit) => {
          const exists = currentOptions.some((u) => u.id === newUnit.id);
          if (!exists) {
            setCurrentOptions([
              {
                id: newUnit.id,
                name: newUnit.name,
                subLocation: newUnit.subLocation,
                agentsCount: 0,
                ward: newUnit.ward,
              },
              ...currentOptions.slice(0, 2),
            ]);
          }
          setSelectedUnitId(newUnit.id);
          setOpenChooseDialog(false);
        }}
      />
    </>
  );
}

type ChoosePollingUnitDialogProps = {
  open: boolean;
  onClose: () => void;
  stateId?: number;
  lgaId?: number;
  wardId?: number;
  onSelect: (unit: {
    id: string;
    name: string;
    subLocation: string;
    ward: string;
  }) => void;
};

export function ChoosePollingUnitDialog({
  open,
  onClose,
  stateId,
  lgaId,
  wardId,
  onSelect,
}: ChoosePollingUnitDialogProps) {
  const [selectedState, setSelectedState] = React.useState<number | "">(
    stateId || "",
  );
  const [selectedLga, setSelectedLga] = React.useState<number | "">(
    lgaId || "",
  );
  const [selectedWard, setSelectedWard] = React.useState<number | "">(
    wardId || "",
  );
  const [selectedUnitId, setSelectedUnitId] = React.useState<string>("");
  const [selectedUnitObj, setSelectedUnitObj] = React.useState<{
    id: string;
    name: string;
    subLocation: string;
    ward: string;
  } | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isUnitsLoading,
  } = useInfiniteQuery({
    queryKey: ["pu-list-choose", selectedState, selectedLga, selectedWard],
    queryFn: async ({ pageParam }) => {
      const res = await getPollingUnits({
        data: {
          stateID: selectedState ? Number(selectedState) : undefined,
          lgaID: selectedLga ? Number(selectedLga) : undefined,
          wardID: selectedWard ? Number(selectedWard) : undefined,
          limit: 20,
          cursor: pageParam || undefined,
        },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to load polling units");
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => {
      if (lastPage && lastPage.meta && lastPage.meta.has_more) {
        return lastPage.meta.next_cursor || "";
      }
      return undefined;
    },
    enabled: open && (!!selectedState || !!selectedLga || !!selectedWard),
  });

  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  React.useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const puData = data
    ? data.pages.flatMap((page: any) => page.data?.polling_units || [])
    : [];

  const handleSelectUnit = (pu: any) => {
    setSelectedUnitId(String(pu.id));
    setSelectedUnitObj({
      id: String(pu.id),
      name: pu.name,
      subLocation: pu.lga_name || pu.state_name || "",
      ward: pu.ward_name || "UNKNOWN WARD",
    });
  };

  const handleAssign = () => {
    if (selectedUnitObj) {
      onSelect(selectedUnitObj);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-155 p-0 rounded-2xl border-none shadow-2xl overflow-hidden">
        <DialogHeader title="Choose Polling Unit" />

        <DialogPadding className="relative space-y-4 pb-5 max-h-[75vh] overflow-y-auto">
          {/* Select Filters Row */}
          <div className="grid grid-cols-3 gap-3 sticky top-0 left-0 pt-3 pb-2 bg-background/90 backdrop-blur-2xl">
            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-c-50 uppercase tracking-wider animate-fade-in">
                State
              </label>
              <SelectState
                selectedId={selectedState ? String(selectedState) : undefined}
                countryOriginalId={161}
                fetchStates={fetchStatesAdapter}
                update={(state) => {
                  setSelectedState(state.id);
                  setSelectedLga("");
                  setSelectedWard("");
                  setSelectedUnitId("");
                  setSelectedUnitObj(null);
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-c-50 uppercase tracking-wider animate-fade-in">
                LGA
              </label>
              <SelectLga
                selectedId={selectedLga ? String(selectedLga) : undefined}
                stateId={selectedState ? Number(selectedState) : undefined}
                fetchLGAs={fetchLgasAdapter}
                update={(lga) => {
                  setSelectedLga(lga.id);
                  setSelectedWard("");
                  setSelectedUnitId("");
                  setSelectedUnitObj(null);
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-semibold text-c-50 uppercase tracking-wider animate-fade-in">
                Ward
              </label>
              <SelectWard
                selectedId={selectedWard ? String(selectedWard) : undefined}
                lgaId={selectedLga ? Number(selectedLga) : undefined}
                stateId={selectedState ? Number(selectedState) : undefined}
                fetchWards={fetchWardsAdapter}
                update={(ward) => {
                  setSelectedWard(ward.id);
                  setSelectedUnitId("");
                  setSelectedUnitObj(null);
                }}
              />
            </div>
          </div>

          {/* Polling Units list */}
          <div className="space-y-3 pt-2">
            {isUnitsLoading ? (
              <div className="py-8 flex flex-col items-center justify-center text-c-50 gap-2">
                <Loader2 className="size-6 animate-spin text-blue-600" />
                <p className="text-sm">Loading polling units...</p>
              </div>
            ) : !selectedState && !selectedLga && !selectedWard ? (
              <p className="text-center text-c-50 py-8 text-sm">
                Please select a state, LGA, or ward to search for polling units.
              </p>
            ) : !puData || puData.length === 0 ? (
              <p className="text-center text-c-50 py-8 text-sm">
                No polling units found for this location.
              </p>
            ) : (
              <div className="space-y-2.5 pr-1">
                {puData.map((unit: any) => {
                  const isSelected = selectedUnitId === String(unit.id);
                  return (
                    <div
                      key={unit.id}
                      onClick={() => handleSelectUnit(unit)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl transition cursor-pointer select-none",
                        isSelected
                          ? "bg-secondary/20"
                          : "bg-c-5 hover:bg-hover-2",
                      )}
                    >
                      <div className="space-y-0.5">
                        <p className="text-[15px] text-c-80">{unit.name}</p>
                        <p className="text-[12px] text-c-50 uppercase tracking-wider">
                          {unit.lga_name || unit.state_name} -{" "}
                          {unit.ward_name || "UNKNOWN WARD"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "size-6 rounded-full flex items-center justify-center transition",
                            isSelected
                              ? "bg-secondary border-transparent text-c-90"
                              : "border-gray-200 bg-white",
                          )}
                        >
                          {isSelected && (
                            <Check className="size-3.5 stroke-[3]" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Sentinel element for infinite scroll */}
                {hasNextPage && (
                  <div
                    ref={sentinelRef}
                    className="py-6 flex items-center justify-center text-c-50 text-[14px]"
                  >
                    {isFetchingNextPage ? (
                      <Loader2 className="size-5 animate-spin mr-2" />
                    ) : null}
                    {isFetchingNextPage
                      ? "Loading more..."
                      : "Scroll down to load more"}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogPadding>

        <DialogFooter>
          <Button type="button" onClick={onClose} variant="ghost" size="4xl">
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleAssign}
            variant="black"
            size="4xl"
            disabled={!selectedUnitId}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
