import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { Button } from "@repo/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { getParties } from "#/lib/server/parties";
import { Loader2 } from "lucide-react";
import { SelectCountry } from "@repo/ui/components/selects/country-select";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { getAllCountries } from "#/lib/server/countries";
import { getStates } from "#/lib/server/states";

export interface AdminUsersSearchFilterDialogProps {
  open: boolean;
  onClose: () => void;
}

const ROLES = [
  { label: "Super Admin", value: "super_admin" },
  { label: "Admin", value: "admin" },
  { label: "Party Admin", value: "party_admin" },
  { label: "Super Party Admin", value: "super_party_admin" },
];

const STATUSES = [
  { label: "Just Registered", value: "just_registered" },
  { label: "Placeholder", value: "placeholder" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Suspended", value: "suspended" },
  { label: "Banned", value: "banned" },
  { label: "Deleted", value: "deleted" },
];

// Verification types matching DB migration
const VERIFICATION_TYPES = [
  { label: "Verified Individual", value: "vip_verified" },
  { label: "Verified Celebrity", value: "celebrity_verified" },
  { label: "Verified Political Party", value: "political_party_verified" },
  { label: "Verified Politician", value: "politician_verified" },
  { label: "Verified Organization", value: "organization_verified" },
  { label: "Verified Business", value: "business_verified" },
  { label: "Verified Party National Official", value: "national_official_verified" },
  { label: "Verified Party Zonal Official", value: "zonal_official_verified" },
  { label: "Verified Party State Official", value: "state_official_verified" },
  { label: "Verified Party LGA Official", value: "lga_official_verified" },
  { label: "Verified Party Ward Official", value: "ward_official_verified" },
];

export function AdminUsersSearchFilterDialog({ open, onClose }: AdminUsersSearchFilterDialogProps) {
  const [selectedParties, setSelectedParties] = React.useState<number[]>([]);
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([]);
  const [selectedVerificationTypes, setSelectedVerificationTypes] = React.useState<string[]>([]);
  const [selectedCountryId, setSelectedCountryId] = React.useState<string | undefined>(undefined);
  const [selectedStateIds, setSelectedStateIds] = React.useState<string[]>([]);

  const { data: parties, isLoading: isLoadingParties } = useQuery({
    queryKey: ["parties"],
    queryFn: async () => {
      const res = await getParties();
      if (res && res.success && res.data) {
        return Array.isArray(res.data) ? res.data : (res.data.parties || []);
      }
      return [];
    },
    enabled: open,
  });

  const partiesArray = Array.isArray(parties) ? parties : [];

  const toggleParty = (id: number) => {
    setSelectedParties(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleRole = (val: string) => {
    setSelectedRoles(prev =>
      prev.includes(val) ? prev.filter(r => r !== val) : [...prev, val]
    );
  };

  const toggleStatus = (val: string) => {
    setSelectedStatuses(prev =>
      prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]
    );
  };

  const toggleVerificationType = (val: string) => {
    setSelectedVerificationTypes(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const updateCountry = (item: any) => {
    setSelectedCountryId(String(item.id));
    setSelectedStateIds([]);
  };

  const toggleState = (val: string) => {
    setSelectedStateIds(prev =>
      prev.includes(val) ? prev.filter(s => s !== val) : [...prev, val]
    );
  };

  const handleApply = () => {
    // TODO: Pass these filters back to the parent component when the API supports them
    console.log("Applying filters:", { selectedParties, selectedRoles, selectedStatuses, selectedVerificationTypes, selectedCountryId, selectedStateIds });
    onClose();
  };

  const handleClear = () => {
    setSelectedParties([]);
    setSelectedRoles([]);
    setSelectedStatuses([]);
    setSelectedVerificationTypes([]);
    setSelectedCountryId(undefined);
    setSelectedStateIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-110 p-0 rounded-2xl border-none shadow-2xl bg-white overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader title="Filter Users" />

        <DialogPadding className="flex-1 overflow-y-auto space-y-7 pb-6 pt-5 min-h-0">

          {/* Parties Filter */}
          <div className="space-y-4">
            <h4 className="font-semibold text-c-90 text-[15px]">Parties</h4>
            {isLoadingParties ? (
              <div className="flex items-center gap-2 text-sm text-c-50">
                <Loader2 className="size-4 animate-spin" />
                Loading parties...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-50 overflow-y-auto pr-2 custom-scrollbar">
                {partiesArray.map((party: any) => (
                  <label key={party.id} className="flex items-center gap-3 cursor-pointer group">
                    <div className="shrink-0 flex items-center">
                      <input
                        type="checkbox"
                        className="size-4.5 rounded border-[#dfdfdf] text-[#00cf79] focus:ring-[#00cf79] cursor-pointer"
                        checked={selectedParties.includes(party.id)}
                        onChange={() => toggleParty(party.id)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {party.logo && (
                        <img
                          src={party.logo}
                          alt={party.short_name}
                          className="size-5 rounded-full object-cover shrink-0"
                        />
                      )}
                      <span className="text-[14px] text-c-80 group-hover:text-black transition">
                        {party.name} ({party.short_name})
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-[#f0f0f0] w-full" />

          {/* Roles Filter */}
          <div className="space-y-4">
            <h4 className="font-semibold text-c-90 text-[15px]">Roles</h4>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((role) => (
                <label key={role.value} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="size-4.5 rounded border-[#dfdfdf] text-[#00cf79] focus:ring-[#00cf79] cursor-pointer shrink-0"
                    checked={selectedRoles.includes(role.value)}
                    onChange={() => toggleRole(role.value)}
                  />
                  <span className="text-[14px] text-c-80 group-hover:text-black transition">{role.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="h-px bg-[#f0f0f0] w-full" />

          {/* Verification Type Filter */}
          <div className="space-y-4">
            <h4 className="font-semibold text-c-90 text-[15px]">Verification Type</h4>
            <div className="flex flex-col gap-3">
              {VERIFICATION_TYPES.map((vt) => (
                <label key={vt.value} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="size-4.5 rounded border-[#dfdfdf] text-[#00cf79] focus:ring-[#00cf79] cursor-pointer shrink-0"
                    checked={selectedVerificationTypes.includes(vt.value)}
                    onChange={() => toggleVerificationType(vt.value)}
                  />
                  <span className="text-[14px] text-c-80 group-hover:text-black transition">{vt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="h-px bg-[#f0f0f0] w-full" />

          {/* Country Filter */}
          <div className="space-y-4">
            <h4 className="font-semibold text-c-90 text-[15px]">Residence Country</h4>
            <SelectCountry
              selectedId={selectedCountryId}
              update={updateCountry}
              fetchCountries={getAllCountries}
              errorMsg={undefined}
            />
          </div>

          <div className="h-px bg-[#f0f0f0] w-full" />

          {/* State Filter */}
          <div className="space-y-4">
            <h4 className="font-semibold text-c-90 text-[15px]">Residence State</h4>
            <SelectState
              selectedId={selectedStateIds.length > 0 ? selectedStateIds[0] : undefined}
              update={(item) => toggleState(String(item.id))}
              countryOriginalId={selectedCountryId ? Number(selectedCountryId) : undefined}
              fetchStates={getStates}
              disabled={!selectedCountryId}
              errorMsg={undefined}
            />
          </div>


          <div className="h-px bg-[#f0f0f0] w-full" />

          {/* Account Status Filter */}
          <div className="space-y-4">
            <h4 className="font-semibold text-c-90 text-[15px]">Account Status</h4>
            <div className="flex flex-col gap-3">
              {STATUSES.map((status) => (
                <label key={status.value} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="size-4.5 rounded border-[#dfdfdf] text-[#00cf79] focus:ring-[#00cf79] cursor-pointer shrink-0"
                    checked={selectedStatuses.includes(status.value)}
                    onChange={() => toggleStatus(status.value)}
                  />
                  <span className="text-[14px] text-c-80 group-hover:text-black transition">{status.label}</span>
                </label>
              ))}
            </div>
          </div>

        </DialogPadding>

        <DialogFooter className="flex-row items-center justify-between gap-3 px-6 py-4 bg-white border-t border-[#f0f0f0] mt-auto">
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
            onClick={handleApply}
            className="flex-1"
          >
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
