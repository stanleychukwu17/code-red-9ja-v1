import {
  getAllCountries,
  getStates,
  getSenatorialDistricts,
  getFederalConstituencies,
  getStateConstituencies,
} from "#/lib/server/countries";
import { useAppContext } from "#/hooks/useAppContext";
import { SelectCountry } from "@repo/ui/components/selects/country-select";
import { SelectFederalConstituency } from "@repo/ui/components/selects/federal-constituency-select";
import { SelectStateConstituency } from "@repo/ui/components/selects/state-constituency-select";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { SelectSenatorialDistrict } from "@repo/ui/components/selects/senatorial-district-select";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import { useServerFn } from "@tanstack/react-start";
// Assuming you'd have these or similar server functions, importing them properly would be needed based on actual structure.
// I'll add placeholders here, you should replace them with actual imports.
import { getLGAs, getWards } from "#/lib/server/applications";

export const ElectionScopeSelector = () => {
  const {
    selectedElection,
    selectedCountryId,
    setSelectedCountryId,
    selectedStateId,
    setSelectedStateId,
    selectedDistrictId,
    setSelectedDistrictId,
    selectedFederalConstituencyId,
    setSelectedFederalConstituencyId,
    selectedStateConstituencyId,
    setSelectedStateConstituencyId,
    selectedLGAId,
    setSelectedLGAId,
    selectedWardId,
    setSelectedWardId,
  } = useAppContext();

  // Scope hierarchy values
  const scope = selectedElection?.scope; // e.g., "nationwide", "state", "senatorial-district", etc.

  const fetchCountriesFn = useServerFn(getAllCountries);
  const fetchStatesFn = useServerFn(getStates);
  const fetchDistrictsFn = useServerFn(getSenatorialDistricts);
  const fetchFederalConstituenciesFn = useServerFn(getFederalConstituencies);
  const fetchStateConstituenciesFn = useServerFn(getStateConstituencies);
  const fetchLGAsFn = useServerFn(getLGAs);
  const fetchWardsFn = useServerFn(getWards);

  // This component implements the specific hierarchy requested.

  const renderSelects = () => {
    if (!scope)
      return (
        <div className="text-sm text-c-50">
          Select an election with a valid scope
        </div>
      );

    // Use selectedElection data to auto-select and disable if needed
    // Assuming selectedElection has `state_id`, `senatorial_district_id`, `federal_constituency_id`, `lga_id`, `ward_id`
    // These should ideally initialize the states in a useEffect if they exist, but for now we drive it based on scope logic directly.

    switch (scope) {
      case "nationwide":
        return (
          <>
            <div className="w-[180px]">
              <SelectState
                selectedId={selectedStateId}
                update={(state) => {
                  setSelectedStateId(state?.id);
                  setSelectedDistrictId(undefined);
                  setSelectedFederalConstituencyId(undefined);
                  setSelectedLGAId(undefined);
                  setSelectedWardId(undefined);
                }}
                fetchStates={fetchStatesFn}
                countryOriginalId={selectedCountryId}
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
                showAll
              />
            </div>
            {/* {selectedStateId && (
              <div className="w-[180px]">
                <SelectSenatorialDistrict
                  selectedId={selectedDistrictId}
                  update={(district) => {
                    setSelectedDistrictId(district?.id);
                    setSelectedFederalConstituencyId(undefined);
                    setSelectedLGAId(undefined);
                    setSelectedWardId(undefined);
                  }}
                  fetchSenatorialDistricts={fetchDistrictsFn}
                  stateId={selectedStateId}
                  className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
                  showAll
                />
              </div>
            )}
            {selectedDistrictId && (
              <div className="w-[180px]">
                <SelectFederalConstituency
                  selectedId={selectedFederalConstituencyId}
                  update={(fc) => {
                    setSelectedFederalConstituencyId(fc?.id);
                    setSelectedStateConstituencyId(undefined);
                    setSelectedLGAId(undefined);
                    setSelectedWardId(undefined);
                  }}
                  fetchFederalConstituencies={fetchFederalConstituenciesFn}
                  stateId={selectedStateId}
                  senatorialDistrictId={selectedDistrictId}
                  className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
                  showAll
                />
              </div>
            )}
            {selectedFederalConstituencyId && (
              <div className="w-[180px]">
                <SelectStateConstituency
                  selectedId={selectedStateConstituencyId}
                  update={(sc) => {
                    setSelectedStateConstituencyId(sc?.id);
                    setSelectedLGAId(undefined);
                    setSelectedWardId(undefined);
                  }}
                  fetchStateConstituencies={fetchStateConstituenciesFn}
                  stateId={selectedStateId}
                  className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
                  showAll
                />
              </div>
            )} */}
            {selectedStateId && (
              <div className="w-[180px]">
                <SelectLga
                  selectedId={selectedLGAId}
                  update={(lga) => {
                    setSelectedLGAId(lga?.id);
                    setSelectedWardId(undefined);
                  }}
                  fetchLGAs={fetchLGAsFn}
                  stateId={selectedStateId}
                  className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
                  showAll
                />
              </div>
            )}
            {selectedLGAId && (
              <div className="w-[180px]">
                <SelectWard
                  selectedId={selectedWardId}
                  update={(ward) => setSelectedWardId(ward?.id)}
                  fetchWards={fetchWardsFn}
                  lgaId={selectedLGAId}
                  stateId={selectedStateId}
                  className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
                  showAll
                />
              </div>
            )}
          </>
        );

      case "state":
        // For state elections (e.g. Governorship), the state is fixed to the election's state.
        return (
          <>
            <div className="w-[180px]">
              <SelectState
                selectedId={selectedElection?.state_id || selectedStateId}
                update={() => {}}
                fetchStates={fetchStatesFn}
                countryOriginalId={selectedCountryId}
                disabled
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
              />
            </div>
            <div className="w-[180px]">
              <SelectLga
                selectedId={selectedLGAId}
                update={(lga) => {
                  setSelectedLGAId(lga?.id);
                  setSelectedWardId(undefined);
                }}
                fetchLGAs={fetchLGAsFn}
                stateId={selectedElection?.state_id || selectedStateId}
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
                showAll
              />
            </div>
            {selectedLGAId && (
              <div className="w-[180px]">
                <SelectWard
                  selectedId={selectedWardId}
                  update={(ward) => setSelectedWardId(ward?.id)}
                  fetchWards={fetchWardsFn}
                  lgaId={selectedLGAId}
                  stateId={selectedElection?.state_id || selectedStateId}
                  className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
                  showAll
                />
              </div>
            )}
          </>
        );

      case "senatorial-district":
        // Auto-select state and district
        return (
          <>
            <div className="w-[180px]">
              <SelectState
                selectedId={selectedElection?.state_id || selectedStateId}
                update={() => {}}
                fetchStates={fetchStatesFn}
                countryOriginalId={selectedCountryId}
                disabled
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
              />
            </div>
            <div className="w-[180px]">
              <SelectSenatorialDistrict
                selectedId={
                  selectedElection?.senatorial_district_id || selectedDistrictId
                }
                update={() => {}}
                fetchSenatorialDistricts={fetchDistrictsFn}
                stateId={selectedElection?.state_id || selectedStateId}
                disabled
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
              />
            </div>
            <div className="w-[180px]">
              <SelectLga
                selectedId={selectedLGAId}
                update={(lga) => {
                  setSelectedLGAId(lga?.id);
                  setSelectedWardId(undefined);
                }}
                fetchLGAs={fetchLGAsFn}
                stateId={selectedElection?.state_id || selectedStateId}
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
                showAll
              />
            </div>
            {selectedLGAId && (
              <div className="w-[180px]">
                <SelectWard
                  selectedId={selectedWardId}
                  update={(ward) => setSelectedWardId(ward?.id)}
                  fetchWards={fetchWardsFn}
                  lgaId={selectedLGAId}
                  stateId={selectedElection?.state_id || selectedStateId}
                  className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
                  showAll
                />
              </div>
            )}
          </>
        );

      case "federal-constituency":
        // Auto-select state, district, and federal constituency
        return (
          <>
            <div className="w-[180px]">
              <SelectState
                selectedId={selectedElection?.state_id || selectedStateId}
                update={() => {}}
                fetchStates={fetchStatesFn}
                countryOriginalId={selectedCountryId}
                disabled
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
              />
            </div>
            <div className="w-[180px]">
              <SelectSenatorialDistrict
                selectedId={
                  selectedElection?.senatorial_district_id || selectedDistrictId
                }
                update={() => {}}
                fetchSenatorialDistricts={fetchDistrictsFn}
                stateId={selectedElection?.state_id || selectedStateId}
                disabled
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
              />
            </div>
            <div className="w-[180px]">
              <SelectFederalConstituency
                selectedId={
                  selectedElection?.federal_constituency_id ||
                  selectedFederalConstituencyId
                }
                update={() => {}}
                fetchFederalConstituencies={fetchFederalConstituenciesFn}
                stateId={selectedElection?.state_id || selectedStateId}
                senatorialDistrictId={
                  selectedElection?.senatorial_district_id || selectedDistrictId
                }
                disabled
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
              />
            </div>
            <div className="w-[180px]">
              <SelectLga
                selectedId={selectedLGAId}
                update={(lga) => {
                  setSelectedLGAId(lga?.id);
                  setSelectedWardId(undefined);
                }}
                fetchLGAs={fetchLGAsFn}
                stateId={selectedElection?.state_id || selectedStateId}
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
                showAll
              />
            </div>
            {selectedLGAId && (
              <div className="w-[180px]">
                <SelectWard
                  selectedId={selectedWardId}
                  update={(ward) => setSelectedWardId(ward?.id)}
                  fetchWards={fetchWardsFn}
                  lgaId={selectedLGAId}
                  stateId={selectedElection?.state_id || selectedStateId}
                  className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
                  showAll
                />
              </div>
            )}
          </>
        );

      case "state-constituency":
        // Auto-select state, and state constituency
        return (
          <>
            <div className="w-[180px]">
              <SelectState
                selectedId={selectedElection?.state_id || selectedStateId}
                update={() => {}}
                fetchStates={fetchStatesFn}
                countryOriginalId={selectedCountryId}
                disabled
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
              />
            </div>
            <div className="w-[180px]">
              <SelectStateConstituency
                selectedId={
                  selectedElection?.state_constituency_id ||
                  selectedStateConstituencyId
                }
                update={() => {}}
                fetchStateConstituencies={fetchStateConstituenciesFn}
                stateId={selectedElection?.state_id || selectedStateId}
                disabled
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
              />
            </div>
            <div className="w-[180px]">
              <SelectLga
                selectedId={selectedLGAId}
                update={(lga) => {
                  setSelectedLGAId(lga?.id);
                  setSelectedWardId(undefined);
                }}
                fetchLGAs={fetchLGAsFn}
                stateId={selectedElection?.state_id || selectedStateId}
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
                showAll
              />
            </div>
            {selectedLGAId && (
              <div className="w-[180px]">
                <SelectWard
                  selectedId={selectedWardId}
                  update={(ward) => setSelectedWardId(ward?.id)}
                  fetchWards={fetchWardsFn}
                  lgaId={selectedLGAId}
                  stateId={selectedElection?.state_id || selectedStateId}
                  className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
                  showAll
                />
              </div>
            )}
          </>
        );

      case "lga":
        // Auto-select state, district, and lga
        return (
          <>
            <div className="w-[180px]">
              <SelectState
                selectedId={selectedElection?.state_id || selectedStateId}
                update={() => {}}
                fetchStates={fetchStatesFn}
                countryOriginalId={selectedCountryId}
                disabled
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
              />
            </div>
            <div className="w-[180px]">
              <SelectLga
                selectedId={selectedElection?.lga_id || selectedLGAId}
                update={() => {}}
                fetchLGAs={fetchLGAsFn}
                stateId={selectedElection?.state_id || selectedStateId}
                disabled
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
              />
            </div>
            <div className="w-[180px]">
              <SelectWard
                selectedId={selectedWardId}
                update={(ward) => setSelectedWardId(ward?.id)}
                fetchWards={fetchWardsFn}
                lgaId={selectedElection?.lga_id || selectedLGAId}
                stateId={selectedElection?.state_id || selectedStateId}
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
                showAll
              />
            </div>
          </>
        );

      case "ward":
        // Auto-select state, district, lga and ward
        return (
          <>
            <div className="w-[180px]">
              <SelectState
                selectedId={selectedElection?.state_id || selectedStateId}
                update={() => {}}
                fetchStates={fetchStatesFn}
                countryOriginalId={selectedCountryId}
                disabled
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
              />
            </div>
            <div className="w-[180px]">
              <SelectLga
                selectedId={selectedElection?.lga_id || selectedLGAId}
                update={() => {}}
                fetchLGAs={fetchLGAsFn}
                stateId={selectedElection?.state_id || selectedStateId}
                disabled
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
              />
            </div>
            <div className="w-[180px]">
              <SelectWard
                selectedId={selectedElection?.ward_id || selectedWardId}
                update={() => {}}
                fetchWards={fetchWardsFn}
                lgaId={selectedElection?.lga_id || selectedLGAId}
                stateId={selectedElection?.state_id || selectedStateId}
                disabled
                className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
              />
            </div>
          </>
        );

      default:
        return (
          <div className="text-sm text-c-50">
            Select an election with a valid scope
          </div>
        );
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Country Selection is common and often disabled/preset */}
      <div className="w-[180px]">
        <SelectCountry
          selectedId={selectedCountryId?.toString()}
          update={(country) => {
            setSelectedCountryId(country?.id ? Number(country.id) : undefined);
            setSelectedStateId(undefined);
          }}
          fetchCountries={fetchCountriesFn}
          className="bg-c-5 ring-0 md:ring-0 md:hover:ring"
          disabled
        />
      </div>

      {renderSelects()}
    </div>
  );
};
