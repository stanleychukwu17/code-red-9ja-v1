import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { SelectCountry } from "@repo/ui/components/selects/country-select";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { getAllCountries, getStates } from "#/lib/server/countries";

export interface UsersFilters {
  roles: string[];
  statuses: string[];
  verificationTypes: string[];
  countryId?: string;
  stateIds: string[];
}

export interface AdminUsersSearchFilterDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: UsersFilters) => void;
  initialFilters?: UsersFilters;
}

const ROLES = [
  { label: "Super Party Admin", value: "super_party_admin" },
  { label: "Party Admin", value: "party_admin" },
];

const STATUSES = [
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Banned", value: "banned" },
];

const VERIFICATION_TYPES = [
  { label: "Verified Individual", value: "vip_verified" },
  { label: "Verified Celebrity", value: "celebrity_verified" },
  { label: "Verified Politician", value: "politician_verified" },
  { label: "Verified Party National Official", value: "national_official_verified", },
  { label: "Verified Party Zonal Official", value: "zonal_official_verified" },
  { label: "Verified Party State Official", value: "state_official_verified" },
  { label: "Verified Party LGA Official", value: "lga_official_verified" },
  { label: "Verified Party Ward Official", value: "ward_official_verified" },
];

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

export function AdminUsersSearchFilterDialog({
  open,
  onClose,
  onApply,
  initialFilters,
}: AdminUsersSearchFilterDialogProps) {
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>(
    initialFilters?.roles || [],
  );
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>(
    initialFilters?.statuses || [],
  );
  const [selectedVerificationTypes, setSelectedVerificationTypes] =
    React.useState<string[]>(initialFilters?.verificationTypes || []);
  const [selectedCountryId, setSelectedCountryId] = React.useState<
    string | undefined
  >(initialFilters?.countryId);
  const [selectedStateIds, setSelectedStateIds] = React.useState<string[]>(
    initialFilters?.stateIds || [],
  );

  React.useEffect(() => {
    if (initialFilters) {
      setSelectedRoles(initialFilters.roles || []);
      setSelectedStatuses(initialFilters.statuses || []);
      setSelectedVerificationTypes(initialFilters.verificationTypes || []);
      setSelectedCountryId(initialFilters.countryId);
      setSelectedStateIds(initialFilters.stateIds || []);
    }
  }, [initialFilters]);

  const toggleRole = (val: string) => {
    setSelectedRoles((prev) =>
      prev.includes(val) ? prev.filter((r) => r !== val) : [...prev, val],
    );
  };

  const toggleStatus = (val: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val],
    );
  };

  const toggleVerificationType = (val: string) => {
    setSelectedVerificationTypes((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  };

  const updateCountry = (item: any) => {
    setSelectedCountryId(item?.id ? String(item.id) : undefined);
    setSelectedStateIds([]);
  };

  const toggleState = (val: string) => {
    setSelectedStateIds((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val],
    );
  };

  const handleApply = () => {
    onApply({
      roles: selectedRoles,
      statuses: selectedStatuses,
      verificationTypes: selectedVerificationTypes,
      countryId: selectedCountryId,
      stateIds: selectedStateIds,
    });
    onClose();
  };

  const handleClear = () => {
    setSelectedRoles([]);
    setSelectedStatuses([]);
    setSelectedVerificationTypes([]);
    setSelectedCountryId(undefined);
    setSelectedStateIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-110 p-0 rounded-2xl border-none shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader title="Filter Party Members" />

        <DialogPadding className="flex-1 overflow-y-auto space-y-7 pb-6 pt-5 min-h-0">
          {/* Roles Filter */}
          <div className="space-y-4">
            <h4 className="font-semibold text-c-90 text-[15px]">Roles</h4>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((role) => (
                <label
                  key={role.value}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    className="size-4.5 rounded border-[#dfdfdf] text-[#00cf79] focus:ring-[#00cf79] cursor-pointer shrink-0"
                    checked={selectedRoles.includes(role.value)}
                    onChange={() => toggleRole(role.value)}
                  />
                  <span className="text-[14px] text-c-80 group-hover:text-black transition">
                    {role.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="h-px bg-[#f0f0f0] w-full" />

          {/* Verification Type Filter */}
          <div className="space-y-4">
            <h4 className="font-semibold text-c-90 text-[15px]">
              Verification Type
            </h4>
            <div className="flex flex-col gap-3 max-h-50 overflow-y-auto pr-2 custom-scrollbar">
              {VERIFICATION_TYPES.map((vt) => (
                <label
                  key={vt.value}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    className="size-4.5 rounded border-[#dfdfdf] text-[#00cf79] focus:ring-[#00cf79] cursor-pointer shrink-0"
                    checked={selectedVerificationTypes.includes(vt.value)}
                    onChange={() => toggleVerificationType(vt.value)}
                  />
                  <span className="text-[14px] text-c-80 group-hover:text-black transition">
                    {vt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="h-px bg-[#f0f0f0] w-full" />

          {/* Country Filter */}
          <div className="flex items-center justify-between gap-4">
            <h4 className="font-semibold text-c-90 text-[15px] shrink-0">
              Residence Country
            </h4>
            <div className="flex-1 max-w-50">
              <SelectCountry
                selectedId={selectedCountryId}
                update={updateCountry}
                fetchCountries={getAllCountries}
                errorMsg={undefined}
              />
            </div>
          </div>

          <div className="h-px bg-[#f0f0f0] w-full" />

          {/* State Filter */}
          <div className="flex items-center justify-between gap-4">
            <h4 className="font-semibold text-c-90 text-[15px] shrink-0">
              Residence State
            </h4>
            <div className="flex-1 max-w-50">
              <SelectState
                selectedId={
                  selectedStateIds.length > 0 ? selectedStateIds[0] : undefined
                }
                update={(item) => toggleState(String(item.id))}
                countryOriginalId={
                  selectedCountryId ? Number(selectedCountryId) : undefined
                }
                fetchStates={fetchStatesAdapter as any}
                disabled={!selectedCountryId}
                errorMsg={undefined}
              />
            </div>
          </div>

          <div className="h-px bg-[#f0f0f0] w-full" />

          {/* Membership Status Filter */}
          <div className="space-y-4">
            <h4 className="font-semibold text-c-90 text-[15px]">
              Membership Status
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {STATUSES.map((status) => (
                <label
                  key={status.value}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    className="size-4.5 rounded border-[#dfdfdf] text-[#00cf79] focus:ring-[#00cf79] cursor-pointer shrink-0"
                    checked={selectedStatuses.includes(status.value)}
                    onChange={() => toggleStatus(status.value)}
                  />
                  <span className="text-[14px] text-c-80 group-hover:text-black transition">
                    {status.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </DialogPadding>

        <DialogFooter className="flex-row items-center justify-between gap-3 px-6 py-4 bg-background border-t border-border mt-auto">
          <Button
            type="button"
            variant="ghost"
            size="2xl"
            onClick={handleClear}
            className="flex-1 text-c-60 hover:text-black hover:bg-[#f5f5f5]"
          >
            Clear All
          </Button>
          <Button
            type="button"
            variant="black"
            size="2xl"
            className="flex-1"
            onClick={handleApply}
          >
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
