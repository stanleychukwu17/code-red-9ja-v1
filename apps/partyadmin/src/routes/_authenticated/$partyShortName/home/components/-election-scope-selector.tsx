import { useEffect } from "react";
import {
  getAllCountries,
  getStates,
  getSenatorialDistricts,
  getFederalConstituencies,
  getStateConstituencies,
} from "#/lib/server/countries";
import { useElection } from "#/hooks/useElection";
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

/**
 * ElectionScopeSelector Component
 *
 * Provides a dynamic cascading geographic filter for the partyadmin situation room and dashboards.
 * Adapts its input controls automatically to match Nigeria's electoral hierarchy and the scope
 * of the currently active election contest (e.g. Nationwide, State Governorship, Senatorial District,
 * Federal/State Constituency, LGA Chairmanship, or Ward Councillorship).
 *
 * Key Responsibilities:
 * 1. Jurisdiction Pinning: Auto-populates and locks (disables) geographic levels that are predefined
 *    by the active election's scope (e.g. a Lagos State Gubernatorial race locks "Lagos" as the state).
 * 2. Cascading Drill-down: Allows administrators to filter downwards into constituent subunits
 *    (e.g., drilling into specific LGAs and Wards within the election's jurisdiction).
 * 3. Scope State Synchronization: Dispatches ID selections to Redux via `useElection()` to drive
 *    real-time tallies, incident updates, and agent leaderboards throughout the dashboard.
 */
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
  } = useElection();

  // Synchronize Redux selection states whenever the active election changes,
  // pre-populating fixed geographic boundary IDs (state, district, constituency, LGA, ward).
  useEffect(() => {
    if (selectedElection) {
      if (selectedElection.state_id !== undefined) {
        setSelectedStateId(selectedElection.state_id || undefined);
      }
      if (selectedElection.senatorial_district_id !== undefined) {
        setSelectedDistrictId(selectedElection.senatorial_district_id || undefined);
      }
      if (selectedElection.federal_constituency_id !== undefined) {
        setSelectedFederalConstituencyId(selectedElection.federal_constituency_id || undefined);
      }
      if (selectedElection.state_constituency_id !== undefined) {
        setSelectedStateConstituencyId(selectedElection.state_constituency_id || undefined);
      }
      if (selectedElection.lga_id !== undefined) {
        setSelectedLGAId(selectedElection.lga_id || undefined);
      }
      if (selectedElection.ward_id !== undefined) {
        setSelectedWardId(selectedElection.ward_id || undefined);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElection?.id]);

  // Scope hierarchy values
  const scope = selectedElection?.scope; // e.g., "nationwide", "state", "senatorial-district", etc.

  const fetchCountriesFn = useServerFn(getAllCountries);
  const fetchStatesFn = useServerFn(getStates);
  const fetchDistrictsFn = useServerFn(getSenatorialDistricts);
  const fetchFederalConstituenciesFn = useServerFn(getFederalConstituencies);
  const fetchStateConstituenciesFn = useServerFn(getStateConstituencies);
  const fetchLGAsFn = useServerFn(getLGAs);
  const fetchWardsFn = useServerFn(getWards);

  /**
   * Evaluates the active election's scope and renders the appropriate combination
   * of enabled and pre-locked dropdown selectors.
   */
  const renderSelects = () => {
    if (!scope)
      return (
        <div className="text-sm text-c-50">
          Select an election with a valid scope
        </div>
      );

    switch (scope) {
      // 1. Nationwide Contests (e.g. Presidential Election)
      // Open across all 36 States + FCT. Party admin can select any State -> LGA -> Ward.
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

      // 2. State-Wide Contests (e.g. Gubernatorial Election)
      // The State is locked to the election's jurisdiction; Party Admin can drill into constituent LGAs & Wards.
      case "state":
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

      // 3. Senatorial District Contests (e.g. Senatorial Zone: North/Central/South)
      // Locks State and Senatorial District; allows drill-down into constituent LGAs and Wards.
      case "senatorial-district":
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

      // 4. Federal Constituency Contests (House of Representatives)
      // Locks State, Senatorial District, and Federal Constituency; allows drill-down into constituent LGAs & Wards.
      case "federal-constituency":
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

      // 5. State Constituency Contests (State House of Assembly)
      // Locks State and State Constituency; allows drill-down into constituent LGAs & Wards.
      case "state-constituency":
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

      // 6. Local Government Contests (LGA Chairman Election)
      // Locks State and LGA; allows drill-down into constituent Wards.
      case "lga":
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

      // 7. Ward Level Contests (Ward Councillor Election)
      // Locks State, LGA, and Ward to the specific election jurisdiction.
      case "ward":
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
      {/* Country Selection: Defaults and locks to Nigeria (National Jurisdiction) */}
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

      {/* Dynamic cascading hierarchical selectors based on scope */}
      {renderSelects()}
    </div>
  );
};
