import { getLGAs } from "#/lib/server/countries";
import { getStates } from "#/lib/server/states";
import { getWards } from "#/lib/server/wards";
import { getBanks, validateBankAccount } from "#/lib/server/banks";
import { Button } from "@repo/ui/components/button";
import { SelectableCard } from "@repo/ui/components/cards/Rewards";
import { GeneralCommand } from "@repo/ui/components/command/general-command";
import { DescriptiveText, TitleText } from "@repo/ui/components/custom/Texts";
import { IconInput, Input, Label } from "@repo/ui/components/input";
import { SelectLga } from "@repo/ui/components/selects/lga-select";
import { SelectResponsiveWrapper } from "@repo/ui/components/selects/select-responsive-wrapper";
import { SelectState } from "@repo/ui/components/selects/state-select";
import { SelectWard } from "@repo/ui/components/selects/ward-select";
import ArrowDownIcon from "@repo/ui/icons/arrow-down-icon";
import FancyNotebookIcon from "@repo/ui/icons/fancy-notebook-icon";
import PenIcon from "@repo/ui/icons/pen-icon";
import { cn } from "@repo/ui/lib/utils";
import { Check, Loader2, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useIntersectionObserver } from "usehooks-ts";

import { SelectBank } from "@repo/ui/components/selects/bank-select";

export const BossIllustration = () => (
  <div className="w-full flex justify-center py-6 select-none">
    <img
      src={
        "https://res.cloudinary.com/dhtcwqsx4/image/upload/v1782886473/Free9ja/Boss_Agent_wqnxcf.png"
      }
      alt="Boss Illustration"
      className="w-full h-full"
    />
  </div>
);

const SelectDropdown = ({
  value,
  update,
  options,
  placeholder,
}: {
  value: string;
  update: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
}) => {
  const [open, setOpen] = useState(false);
  const selectedItem = options.find((o) => String(o.value) === String(value));

  return (
    <SelectResponsiveWrapper
      open={open}
      onOpenChange={setOpen}
      placeholder={placeholder}
      align="start"
      trigger={
        <Button
          variant="select"
          size="select"
          className="justify-between gap-2 w-full h-14 rounded-2xl bg-transparent border border-input px-3 py-1 font-normal"
          type="button"
        >
          <p className="whitespace-normal text-left line-clamp-1">
            {selectedItem ? selectedItem.label : placeholder}
          </p>
          <ArrowDownIcon className="ml-auto text-c-80" />
        </Button>
      }
    >
      <GeneralCommand
        data={options}
        getId={(item) => String(item.value)}
        getName={(item) => item.label}
        handleSelect={(item) => {
          update(item.value);
          setOpen(false);
        }}
        selectedId={value}
      />
    </SelectResponsiveWrapper>
  );
};

export const StepHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => {
  return (
    <div className="space-y-2.5">
      <TitleText text={title} />
      {subtitle && <DescriptiveText text={subtitle} />}
    </div>
  );
};

export const SpiralNotebook = ({
  text,
  color,
}: {
  text: string;
  color: "purple" | "orange" | "red" | "darkblue";
}) => {
  const textColor = {
    purple: "text-purple",
    orange: "text-[#F6851F]",
    red: "text-[#EC1C24]",
    darkblue: "text-[#1B75BB]",
  };
  return (
    <div className="mt-2 h-full flex items-center justify-center">
      <div className="relative">
        <FancyNotebookIcon className="w-full shrink-0" />
        <div className="absolute inset-0 pl-14 pr-6 py-8">
          <p
            className={cn(
              `text-[27px] font-semibold leading-10`,
              textColor[color],
            )}
          >
            {text}
          </p>
        </div>
      </div>
    </div>
  );
};

export const Step1 = () => (
  <div className="flex flex-col gap-2 px-4">
    <StepHeader
      title="Become a Party agent"
      subtitle="Ensure your polling unit's vote counts."
    />
    <BossIllustration />
  </div>
);

export const Step2 = ({
  searchQuery,
  setSearchQuery,
  partiesLoading,
  filteredParties,
  selectedPartyId,
  setSelectedPartyId,
  lockedPartyId,
}: any) => {
  const PartyCard = ({
    party,
    isSelected,
    isDisabled,
    onClick,
  }: {
    party: any;
    isSelected: boolean;
    isDisabled: boolean;
    onClick: () => void;
  }) => (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-4.5 rounded-2xl transition ${
        isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${isSelected ? "bg-secondary/20" : "hover:bg-neutral-50 bg-white"}`}
    >
      <div className="flex items-center gap-3">
        {party.logo ? (
          <img
            src={party.logo}
            alt={party.short_name}
            className="w-9 h-9 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className={`w-9 h-9 rounded-full ${
              party.logoColor || "bg-neutral-850"
            } flex items-center justify-center text-white text-xs shrink-0`}
          >
            {party.short_name}
          </div>
        )}
        <span className="text-[16px] text-neutral-900 leading-tight">
          {party.name} ({party.short_name})
        </span>
      </div>
      {isSelected && <Check className="size-6" />}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <StepHeader title="Choose a Political Party" />
      <IconInput
        placeholder="Search..."
        className="h-14 rounded-full"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="space-y-1.5">
        {partiesLoading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
          </div>
        ) : filteredParties.length > 0 ? (
          filteredParties.map((party: any) => {
            const isSelected = selectedPartyId === party.id;
            const isDisabled = lockedPartyId && lockedPartyId !== party.id;

            return (
              <PartyCard
                key={party.id}
                party={party}
                isSelected={isSelected}
                isDisabled={isDisabled}
                onClick={() => {
                  if (isDisabled) {
                    toast.error(
                      "You can only change party if your existing application is either rejected or cancelled.",
                      {
                        position: "top-center",
                      },
                    );
                    return;
                  }
                  setSelectedPartyId(party.id);
                }}
              />
            );
          })
        ) : (
          <p className="text-center text-neutral-400 py-8 text-sm">
            No parties found matching "{searchQuery}"
          </p>
        )}
      </div>
    </div>
  );
};

export const Step3 = ({
  elections,
  selectedElectionIds,
  setSelectedElectionIds,
  appliedElectionGroupIds,
}: any) => {
  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <StepHeader
        title="Choose an Election"
        subtitle="Select all elections you would like to be a polling unit agent."
      />
      <div className="space-y-3 pr-1">
        {elections.map((election: any) => {
          const isSelected = selectedElectionIds.includes(election.id);
          const isAlreadyApplied = appliedElectionGroupIds?.includes(
            election.id,
          );
          return (
            <SelectableCard
              key={election.id}
              title={election.name}
              subtitle={isAlreadyApplied ? "Already Applied" : election.date}
              isSelected={isSelected}
              disabled={isAlreadyApplied}
              onClick={() => {
                if (isAlreadyApplied) {
                  toast.error(
                    "You already have an active application for this election.",
                    { position: "top-center" },
                  );
                  return;
                }
                setSelectedElectionIds((prev: any[]) =>
                  isSelected
                    ? prev.filter((id) => id !== election.id)
                    : [...prev, election.id],
                );
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export const Step4 = ({
  avatarUrl,
  isUploading,
  handleUploadClick,
  fileInputRef,
  handleFileChange,
}: any) => (
  <div className="flex flex-col gap-4 w-full px-4">
    <StepHeader
      title="Add Your Passport Photograph"
      subtitle="Add a passport photograph of yourself. Please ensure that it is clear."
    />
    <div className="flex flex-col items-center gap-6 py-6 w-full">
      <div
        onClick={handleUploadClick}
        className="relative size-64 rounded-full flex items-center justify-center shrink-0 cursor-pointer group"
      >
        {avatarUrl ? (
          <div className="w-full h-full rounded-full overflow-hidden bg-c-10">
            <img
              src={avatarUrl}
              alt="Passport preview"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <img
            src="https://res.cloudinary.com/dhtcwqsx4/image/upload/v1782894576/Free9ja/Avatar_Placeholder_xn9qiw.png"
            alt="avatar"
            className="w-full h-full object-cover"
          />
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
        <div className="absolute bottom-5 right-5 size-10 bg-background/90 backdrop-blur-2xl shadow-sm rounded-full flex items-center justify-center">
          <PenIcon className="size-5 text-c-80" strokeWidth={1.15} />
        </div>
      </div>
      <Button
        type="button"
        onClick={handleUploadClick}
        disabled={isUploading}
        variant="outline"
        size="4xl"
        className="w-full rounded-full mt-4"
      >
        Upload Your Passport
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  </div>
);

export const Step5 = ({
  selectedStateId,
  setSelectedStateId,
  selectedLgaId,
  setSelectedLgaId,
  selectedWardId,
  setSelectedWardId,
  streetAddress,
  setStreetAddress,
}: any) => (
  <div className="flex flex-col gap-4 w-full px-4">
    <StepHeader
      title="Add Your Current Address"
      subtitle="Provide the accurate details of where you currently stay."
    />
    <div className="space-y-7 pr-1">
      <div className="flex flex-col gap-2">
        <Label title="Which state are you currently in?" />
        <SelectState
          selectedId={selectedStateId || undefined}
          update={(stateObj) => {
            setSelectedStateId(stateObj?.id || null);
            setSelectedLgaId(null);
            setSelectedWardId(null);
          }}
          fetchStates={getStates}
          className="w-full"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label title="Which LGA do you stay in?" />
        <SelectLga
          selectedId={selectedLgaId || undefined}
          update={(lgaObj) => {
            setSelectedLgaId(lgaObj?.id || null);
            setSelectedWardId(null);
          }}
          stateId={selectedStateId || undefined}
          disabled={!selectedStateId}
          fetchLGAs={getLGAs}
          className="w-full"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label title="Which ward do you stay in?" />
        <SelectWard
          selectedId={selectedWardId || undefined}
          update={(wardObj) => setSelectedWardId(wardObj?.id || null)}
          stateId={selectedStateId || undefined}
          lgaId={selectedLgaId || undefined}
          disabled={!selectedLgaId}
          fetchWards={getWards}
          className="w-full"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label title="Tell us your address?" />
        <Input
          placeholder="Enter address"
          onChange={(e) => setStreetAddress(e.target.value)}
        />
      </div>

      <DescriptiveText
        text="Entering an inaccurate address could lead to you not getting accepted by
        your party of choice."
      />
    </div>
  </div>
);

export const Step6 = ({
  pollingUnits,
  selectedPollingUnitId,
  setSelectedPollingUnitId,
  getWardName,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  selectedStateId,
  selectedLgaId,
  selectedWardId,
  setSelectedWardId,
}: any) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { ref: sentinelRef, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
  });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const targetWardName =
    pollingUnits.length > 0 ? getWardName(pollingUnits[0]) : "your";

  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <StepHeader
        title={`Select a Polling Unit`}
        subtitle="You will be assigned to the polling unit you select or the one closest to your address."
      />
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label title="Ward" />
          <SelectWard
            selectedId={selectedWardId || undefined}
            update={(wardObj) => setSelectedWardId(wardObj?.id || null)}
            stateId={selectedStateId || undefined}
            lgaId={selectedLgaId || undefined}
            disabled={!selectedLgaId}
            fetchWards={getWards}
          />
        </div>
        {/* <IconInput
          placeholder="Search polling units..."
          className="h-14 rounded-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        /> */}

        <div className="space-y-3 mt-7">
          <Label title={`Polling Units (${targetWardName})`} className="" />

          {pollingUnits
            // .filter(
            //   (unit: any) =>
            //     unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            //     getWardName(unit)
            //       .toLowerCase()
            //       .includes(searchQuery.toLowerCase()),
            // )
            .map((unit: any) => {
              const isSelected = selectedPollingUnitId === unit.id;
              const wardName = getWardName(unit);
              return (
                <SelectableCard
                  key={unit.id}
                  title={unit.name}
                  subtitle={wardName}
                  isSelected={isSelected}
                  onClick={() => setSelectedPollingUnitId(unit.id)}
                />
              );
            })}
        </div>

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
    </div>
  );
};

export const Step7 = () => (
  <div className="flex flex-col gap-4 w-full px-4 h-full">
    <StepHeader title="Do You Agree To Carry Out the Below Duties On Election Day?" />
    <SpiralNotebook
      text="I agree to arrive at my assigned polling unit on election day before 7:00 AM."
      color="purple"
    />
  </div>
);

export const Step8 = () => (
  <div className="flex flex-col gap-4 w-full px-4 h-full">
    <StepHeader title="Do You Agree To Carry Out the Below Duties On Election Day?" />
    <SpiralNotebook
      text="I agree to use this app on election day to give hourly updates about ongoing election at my assigned polling unit."
      color="orange"
    />
  </div>
);

export const Step9 = () => (
  <div className="flex flex-col gap-4 w-full px-4 h-full">
    <StepHeader title="Do You Agree To Carry Out the Below Duties On Election Day?" />
    <SpiralNotebook
      text="I agree to report any irregularities that take place at my polling unit (e.g., Vote Buying, Ballot Box Snatching, & more)"
      // color="text-[#EF4444]"
      color="red"
    />
  </div>
);

export const Step10 = () => (
  <div className="flex flex-col gap-4 w-full px-4 h-full">
    <StepHeader title="Do You Agree To Carry Out the Below Duties On Election Day?" />
    <SpiralNotebook
      text="I agree to snap and upload my polling unit result sheet form (EC8 Form) at the end of voting else I may not get paid."
      color="darkblue"
    />
  </div>
);

export const Step11 = ({
  bankAccountNumber,
  setBankAccountNumber,
  selectedBankCode,
  setSelectedBankCode,
  user,
  setIsValidatingAccount,
  setIsAccountValid,
}: any) => {
  const { data: validationResponse, isLoading: isValidating } = useQuery({
    queryKey: ["validateAccount", bankAccountNumber, selectedBankCode],
    queryFn: () =>
      validateBankAccount({
        data: {
          accountNumber: bankAccountNumber,
          bankCode: selectedBankCode,
        },
      }),
    enabled: bankAccountNumber.length === 10 && !!selectedBankCode,
    staleTime: 1000 * 60 * 5, // cache for 5 minutes
  });

  const accountName = validationResponse?.success
    ? validationResponse?.data?.accountName
    : validationResponse?.accountName;

  const isError =
    validationResponse &&
    !validationResponse.success &&
    validationResponse.success !== undefined;
  const isValid = !!accountName && !isError;

  useEffect(() => {
    if (setIsValidatingAccount) setIsValidatingAccount(isValidating);
  }, [isValidating, setIsValidatingAccount]);

  useEffect(() => {
    if (setIsAccountValid) setIsAccountValid(isValid);
  }, [isValid, setIsAccountValid]);

  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <StepHeader
        title="Add Bank Account Details"
        subtitle="Provide details for any future payout."
      />
      <div className="space-y-8 mt-2">
        <div className="flex flex-col gap-2">
          <Label title="Account Number" />
          <Input
            type="text"
            maxLength={10}
            placeholder="Enter acct. number"
            value={bankAccountNumber}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              setBankAccountNumber(val);
            }}
            className="h-14 rounded-2xl"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label title="Bank" />
          <SelectBank
            initialData={selectedBankCode}
            update={setSelectedBankCode}
            fetchBanks={getBanks}
          />
        </div>

        {bankAccountNumber.length === 10 && selectedBankCode && (
          <div
            className={cn(
              "flex items-center gap-3 p-4.5 rounded-2xl mt-2",
              isError
                ? "bg-red-50 text-red-600"
                : isValidating
                  ? "bg-neutral-50 text-neutral-500"
                  : "bg-secondary/10 text-primary",
            )}
          >
            <div
              className={cn(
                "size-5 rounded-full flex items-center justify-center shrink-0",
                isError
                  ? "bg-red-100 text-red-600"
                  : isValidating
                    ? "bg-transparent text-neutral-500"
                    : "bg-secondary text-white",
              )}
            >
              {isValidating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isError ? (
                <XCircle className="size-4" />
              ) : (
                <Check className="size-3 stroke-[3]" />
              )}
            </div>
            <span
              className={cn(
                "font-medium text-lg",
                isError ? "text-red-600" : "text-primary",
              )}
            >
              {isValidating
                ? "Verifying account..."
                : isError
                  ? "Invalid Account Number"
                  : accountName || "Unknown User"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
export const ContactDetailsStep = ({
  phone,
  setPhone,
  userPhone,
  whatsappPhone,
  setWhatsappPhone,
  dataPhone,
  setDataPhone,
}: any) => (
  <div className="flex flex-col gap-4 w-full px-4">
    <StepHeader
      title="Contact Details"
      subtitle="Provide your phone details."
    />
    <div className="space-y-7 mt-2">
      <div className="flex flex-col gap-2">
        <Label title="Your Phone Number (for calls)" />
        <Input
          type="tel"
          disabled={!!userPhone}
          value={phone || ""}
          onChange={(e) => setPhone && setPhone(e.target.value)}
          placeholder="Enter phone number for calls"
          className={`h-14 rounded-2xl ${!!userPhone ? "bg-gray-50" : ""}`}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label title="Your Phone Number (for data subscription)" />
        <Input
          type="tel"
          value={dataPhone}
          onChange={(e) => setDataPhone(e.target.value)}
          placeholder="Enter phone number used for data sub"
          className="h-14 rounded-2xl"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label title="Your Whatsapp Phone Number" />
        <Input
          type="tel"
          value={whatsappPhone}
          onChange={(e) => setWhatsappPhone(e.target.value)}
          placeholder="Enter whatsapp phone number"
          className="h-14 rounded-2xl"
        />
      </div>
    </div>
  </div>
);

export const EducationalStatusStep = ({
  educationalStatus,
  setEducationalStatus,
}: any) => {
  const options = [
    { label: "I am a graduate", value: "graduate" },
    { label: "I'm a student", value: "student" },
    { label: "None of the above", value: "none" },
  ];
  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <StepHeader
        title="Which option best describes you?"
        subtitle="Increase your acceptance and assignment opportunity."
      />
      <div className="space-y-3 mt-2">
        {options.map((opt) => (
          <SelectableCard
            key={opt.value}
            title={opt.label}
            subtitle=""
            isSelected={educationalStatus === opt.value}
            onClick={() => setEducationalStatus(opt.value)}
          />
        ))}
      </div>
    </div>
  );
};

export const EducationalDetailsStep = ({
  educationalStatus,
  highestDegree,
  setHighestDegree,
  graduationYear,
  setGraduationYear,
  schoolName,
  setSchoolName,
}: any) => {
  const isStudent = educationalStatus === "student";
  const title = isStudent
    ? "Current Educational Details"
    : "Educational Qualification";
  const subtitle = isStudent
    ? "Tell us about your current studies."
    : "Verify your highest qualification.";

  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <StepHeader title={title} subtitle={subtitle} />
      <div className="space-y-7 mt-2">
        <div className="flex flex-col gap-2">
          <Label
            title={
              isStudent ? "Degree to be obtained?" : "Highest Academic degree?"
            }
          />
          <SelectDropdown
            value={highestDegree}
            update={setHighestDegree}
            placeholder="Select Degree"
            options={[
              {
                label: "Primary School Certificate",
                value: "Primary School Certificate",
              },
              {
                label: "Secondary School Certificate",
                value: "Secondary School Certificate",
              },
              { label: "Bachelors", value: "Bachelors" },
              { label: "Masters", value: "Masters" },
              { label: "PhD", value: "PhD" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label
            title={
              isStudent
                ? "Which year will you be graduating?"
                : "Which year did you graduate?"
            }
          />
          <SelectDropdown
            value={graduationYear}
            update={setGraduationYear}
            placeholder="Select Year"
            options={
              isStudent
                ? Array.from({ length: 11 }, (_, i) => {
                    const year = String(new Date().getFullYear() + i);
                    return { label: year, value: year };
                  })
                : Array.from({ length: 71 }, (_, i) => {
                    const year = String(new Date().getFullYear() - i);
                    return { label: year, value: year };
                  })
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label
            title={
              isStudent
                ? "What is the name of your school?"
                : "What is the name of the school?"
            }
          />
          <Input
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="Enter school name"
            className="h-14 rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
};
