import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SelectProps } from "../../lib/types";
import { cn } from "../../lib/utils";
import { Button } from "../button";
import { GeneralCommand } from "../command/general-command";
import { DrawerList } from "../command/drawer-list";
import { SelectResponsiveWrapper } from "./select-responsive-wrapper";
import ArrowDownIcon from "../../icons/arrow-down-icon";

export interface Bank {
  name: string;
  code: string;
}

interface BanksResponse {
  success: boolean;
  message: string;
  data: {
    banks: Bank[];
  };
}

export const SelectBank = ({
  initialData,
  update,
  errorMsg,
  className,
  buttonText,
  hideIcon,
  fetchBanks,
}: SelectProps<string> & {
  className?: string;
  fetchBanks: () => Promise<any>;
}) => {
  const [open, setOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | undefined>(
    initialData,
  );

  const { data: response, isLoading } = useQuery<BanksResponse>({
    queryKey: ["banks"],
    queryFn: fetchBanks,
  });

  const banks = response?.data?.banks || [];

  useEffect(() => {
    setSelectedItem(initialData);
  }, [initialData]);
  useEffect(() => {
    if (!open) setMobileSearch("");
  }, [open]);

  const handleSelect = (item: { code: string; name: string }) => {
    setSelectedItem(item.code);
    update(item.code);
    setOpen(false);
  };

  const selectedBankObj = banks.find((b) => b.code === selectedItem);

  const getId = (item: { code: string; name: string }) => item.code;
  const getName = (item: { code: string; name: string }) => item.name;

  const getLabel = (item: { code: string; name: string }) => (
    <div className="flex items-center gap-3 py-1.5">
      {item.code === "058" ? (
        <div className="size-8 rounded-lg bg-[#FF5E00] flex items-center justify-center text-white text-[9px] font-extrabold select-none shrink-0 leading-none">
          GTCO
        </div>
      ) : (
        <div className="size-8 rounded-lg bg-neutral-800 flex items-center justify-center text-white text-[10px] font-extrabold select-none shrink-0 leading-none">
          {item.name.substring(0, 3).toUpperCase()}
        </div>
      )}
      <span className="text-neutral-800 text-[15px] font-semibold">
        {item.name}
      </span>
    </div>
  );

  const mobileFiltered = banks.filter((b) =>
    b.name.toLowerCase().includes(mobileSearch.toLowerCase()),
  );

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder="Select bank"
      align="start"
      className={className}
      trigger={
        <Button
          variant="select"
          size="select"
          className={cn(
            "justify-between w-full gap-2",
            className,
            errorMsg && "border-0.8 border-red",
          )}
          type="button"
        >
          {selectedBankObj ? (
            <div className="flex items-center gap-3">
              {selectedBankObj.code === "058" ? (
                <div className="size-6 rounded-md bg-[#FF5E00] flex items-center justify-center text-white text-[8px] font-extrabold select-none shrink-0 leading-none">
                  GTCO
                </div>
              ) : (
                <div className="size-6 rounded-md bg-neutral-800 flex items-center justify-center text-white text-[9px] font-extrabold select-none shrink-0 leading-none">
                  {selectedBankObj.name.substring(0, 3).toUpperCase()}
                </div>
              )}
              <span className="text-neutral-800 text-[16px] font-semibold">
                {selectedBankObj.name}
              </span>
            </div>
          ) : (
            <p className={cn(isLoading && "animate-pulse")}>
              {isLoading ? "Loading banks..." : buttonText || "Select Bank"}
            </p>
          )}
          {!hideIcon && <ArrowDownIcon className="ml-auto text-c-80" />}
        </Button>
      }
      desktopContent={
        <GeneralCommand
          data={banks}
          getId={getId}
          getName={getName}
          getLabel={getLabel}
          handleSelect={handleSelect}
          selectedId={selectedItem}
        />
      }
      mobileContent={
        <DrawerList
          data={mobileFiltered}
          getId={getId}
          getName={getName}
          getLabel={getLabel}
          handleSelect={handleSelect}
          selectedId={selectedItem}
          searchValue={mobileSearch}
          onSearch={setMobileSearch}
        />
      }
    />
  );
};
