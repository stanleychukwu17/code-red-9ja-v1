import * as React from "react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPadding,
} from "@repo/ui/components/dialog";
import { ChevronDown } from "lucide-react";

export function NewWardDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [wardName, setWardName] = React.useState("");

  const [selectedCountry, setSelectedCountry] = React.useState("Nigeria");
  const [isCountryOpen, setIsCountryOpen] = React.useState(false);

  const [selectedState, setSelectedState] = React.useState("Select state");
  const [isStateOpen, setIsStateOpen] = React.useState(false);

  const [selectedLga, setSelectedLga] = React.useState("Select LGA");
  const [isLgaOpen, setIsLgaOpen] = React.useState(false);

  const [selectedConstituency, setSelectedConstituency] = React.useState("Select state constituency");
  const [isConstituencyOpen, setIsConstituencyOpen] = React.useState(false);

  const countries = ["Nigeria"];
  const states = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa"];
  const lgas = ["Abaji", "AMAC", "Bwari", "Gwagwalada", "Kuje", "Kwali"];
  const constituencies = [
    "Bende North",
    "Bende South",
    "Isuikwuato",
    "Umuahia East",
    "Umuahia North",
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 rounded-2xl border-none shadow-2xl bg-white overflow-visible">
        <DialogHeader title="New Ward" />

        <DialogPadding className="space-y-6 pb-6">
          {/* Ward name input */}
          <div className="w-full">
            <input
              type="text"
              placeholder="Ward name"
              value={wardName}
              onChange={(e) => setWardName(e.target.value)}
              className="w-full text-[28px] font-semibold text-c-80 placeholder:text-c-30 outline-none bg-transparent"
            />
          </div>

          {/* Grid Layout for Country and State */}
          <div className="grid grid-cols-2 gap-4">
            {/* Country Select */}
            <div className="relative">
              <label className="text-[14px] font-semibold text-c-50">Country</label>
              <button
                onClick={() => setIsCountryOpen(!isCountryOpen)}
                className="flex justify-between items-center w-full h-12 rounded-[12px] border border-[#dfdfdf] px-4 bg-white mt-1 cursor-pointer text-left text-[16px] text-c-80"
              >
                <span>{selectedCountry}</span>
                <ChevronDown className="size-5 text-c-40 shrink-0" />
              </button>

              {isCountryOpen && (
                <div className="absolute left-0 w-full mt-2 rounded-[12px] bg-white border border-[#dfdfdf] shadow-lg py-1 z-50">
                  {countries.map((country) => (
                    <button
                      key={country}
                      onClick={() => {
                        setSelectedCountry(country);
                        setIsCountryOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-[15px] hover:bg-[#fafafa] text-[#1a1a1a]"
                    >
                      {country}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* State Select */}
            <div className="relative">
              <label className="text-[14px] font-semibold text-c-50">State</label>
              <button
                onClick={() => setIsStateOpen(!isStateOpen)}
                className="flex justify-between items-center w-full h-12 rounded-[12px] border border-[#dfdfdf] px-4 bg-white mt-1 cursor-pointer text-left text-[16px] text-c-80"
              >
                <span className={selectedState === "Select state" ? "text-c-40" : ""}>
                  {selectedState}
                </span>
                <ChevronDown className="size-5 text-c-40 shrink-0" />
              </button>

              {isStateOpen && (
                <div className="absolute left-0 w-full mt-2 max-h-60 overflow-y-auto rounded-[12px] bg-white border border-[#dfdfdf] shadow-lg py-1 z-50">
                  {states.map((state) => (
                    <button
                      key={state}
                      onClick={() => {
                        setSelectedState(state);
                        setIsStateOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-[15px] hover:bg-[#fafafa] text-[#1a1a1a]"
                    >
                      {state}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Grid Layout for LGA and State Constituency */}
          <div className="grid grid-cols-2 gap-4">
            {/* LGA Select */}
            <div className="relative">
              <label className="text-[14px] font-semibold text-c-50">LGA</label>
              <button
                onClick={() => setIsLgaOpen(!isLgaOpen)}
                className="flex justify-between items-center w-full h-12 rounded-[12px] border border-[#dfdfdf] px-4 bg-white mt-1 cursor-pointer text-left text-[16px] text-c-80"
              >
                <span className={selectedLga === "Select LGA" ? "text-c-40" : ""}>
                  {selectedLga}
                </span>
                <ChevronDown className="size-5 text-c-40 shrink-0" />
              </button>

              {isLgaOpen && (
                <div className="absolute left-0 w-full mt-2 max-h-60 overflow-y-auto rounded-[12px] bg-white border border-[#dfdfdf] shadow-lg py-1 z-50">
                  {lgas.map((lga) => (
                    <button
                      key={lga}
                      onClick={() => {
                        setSelectedLga(lga);
                        setIsLgaOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-[15px] hover:bg-[#fafafa] text-[#1a1a1a]"
                    >
                      {lga}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* State Constituency Select */}
            <div className="relative">
              <label className="text-[14px] font-semibold text-c-50">State constituency</label>
              <button
                onClick={() => setIsConstituencyOpen(!isConstituencyOpen)}
                className="flex justify-between items-center w-full h-12 rounded-[12px] border border-[#dfdfdf] px-4 bg-white mt-1 cursor-pointer text-left text-[16px] text-c-80"
              >
                <span className={selectedConstituency === "Select state constituency" ? "text-c-40" : ""}>
                  {selectedConstituency}
                </span>
                <ChevronDown className="size-5 text-c-40 shrink-0" />
              </button>

              {isConstituencyOpen && (
                <div className="absolute left-0 w-full mt-2 max-h-60 overflow-y-auto rounded-[12px] bg-white border border-[#dfdfdf] shadow-lg py-1 z-50">
                  {constituencies.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setSelectedConstituency(c);
                        setIsConstituencyOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-[15px] hover:bg-[#fafafa] text-[#1a1a1a]"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Create Button */}
          <div className="flex items-center justify-end pt-4">
            <Button
              className="h-11 px-6 bg-[#00cf79] hover:bg-[#00b568] text-[16px] font-bold text-white rounded-xl cursor-pointer"
              onClick={onClose}
            >
              Create
            </Button>
          </div>
        </DialogPadding>
      </DialogContent>
    </Dialog>
  );
}
