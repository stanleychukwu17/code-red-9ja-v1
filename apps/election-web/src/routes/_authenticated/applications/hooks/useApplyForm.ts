import { useUser } from "#/hooks/useUser";
import { useParties } from "#/hooks/useParties";
import {
  getApplications,
  submitPollingAgentApplication,
} from "#/lib/server/applications";
import {
  confirmFileUpload,
  getPresignedUploadURL,
} from "#/lib/server/parties";
import { getPollingUnitsWithCapacity } from "#/lib/server/polling_units";
import { getUserMe } from "#/lib/server/users";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { ApplySearch } from "../apply";

interface UseApplyFormOptions {
  search: ApplySearch;
  navigate: (opts: { to: string }) => void;
}

export function useApplyForm({ search, navigate }: UseApplyFormOptions) {
  const user = useUser();

  const [hasProcessedSearchParty, setHasProcessedSearchParty] = useState(false);

  // Form states
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(
    user?.party_id || null,
  );
  const [selectedElectionIds, setSelectedElectionIds] = useState<number[]>([]);

  // --- Identity & Photo Verification ---
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar || "");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Residential & Territorial Location ---
  const [selectedStateId, setSelectedStateId] = useState<number | null>(
    user?.current_state || null,
  );
  const [selectedLgaId, setSelectedLgaId] = useState<number | null>(
    user?.current_lga || null,
  );
  const [selectedWardId, setSelectedWardId] = useState<number | null>(
    user?.current_ward || null,
  );
  const [streetAddress, setStreetAddress] = useState<string>(
    user?.address || "",
  );
  const [selectedPollingUnitId, setSelectedPollingUnitId] = useState<
    number | null
  >(user?.polling_unit_id || null);

  // --- Contact Phone Numbers ---
  const [phone, setPhone] = useState<string>(user?.phone || "");
  const [whatsappPhone, setWhatsappPhone] = useState<string>(
    user?.whatsapp_phone || "",
  );
  const [dataPhone, setDataPhone] = useState<string>(user?.data_phone || "");

  // --- Educational Background ---
  const [educationalStatus, setEducationalStatus] = useState<string>("");
  const [highestDegree, setHighestDegree] = useState<string>("");
  const [graduationYear, setGraduationYear] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");

  // --- Bank Account & Verification ---
  const [bankAccountNumber, setBankAccountNumber] = useState<string>("");
  const [selectedBankCode, setSelectedBankCode] = useState<string | null>(null);
  const [bankDropdownOpen, setBankDropdownOpen] = useState<boolean>(false);
  const [isValidatingAccount, setIsValidatingAccount] = useState(false);
  const [isAccountValid, setIsAccountValid] = useState(false);

  // --- Wizard Navigation & Submission Status ---
  const [step, setStep] = useState<number>(search?.step || 1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Pre-fill profile, education, and banking data from existing user record
  const { data: userMeDetails } = useQuery({
    queryKey: ["userMeDetails"],
    queryFn: async () => {
      const res = await getUserMe();
      return res?.success && res.data?.user ? res.data.user : null;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (userMeDetails) {
      if (userMeDetails.profile?.educational_status)
        setEducationalStatus(userMeDetails.profile.educational_status);
      if (userMeDetails.profile?.highest_degree)
        setHighestDegree(userMeDetails.profile.highest_degree);
      if (userMeDetails.profile?.graduation_year)
        setGraduationYear(userMeDetails.profile.graduation_year);
      if (userMeDetails.profile?.school_name)
        setSchoolName(userMeDetails.profile.school_name);

      if (userMeDetails.bank_account_number) {
        setBankAccountNumber(userMeDetails.bank_account_number);
        setIsAccountValid(true);
      }
      if (userMeDetails.bank_code) {
        setSelectedBankCode(userMeDetails.bank_code);
      }
    }
  }, [userMeDetails]);

  // Standardized query for political parties
  const { data: parties = [], isLoading: partiesLoading } = useParties();


  // Query user's existing applications to avoid duplicate submissions
  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await getApplications();
      if (res?.success && res.data?.applications) {
        return res.data.applications;
      }
      return [];
    },
  });

  // Election group IDs where the agent already has an active application
  const appliedElectionGroupIds = applications
    .filter((app: any) =>
      ["pending", "approved", "success", "accepted"].includes(app.status),
    )
    .map((app: any) => app.election_group_id || app.election_group?.id)
    .filter(Boolean);

  // If the agent has an active application for an upcoming or present election,
  // lock their party affiliation so they represent the same party
  const lockedPartyId = (() => {
    const activeApp = applications.find((app: any) => {
      const isActive = ["pending", "approved", "success", "accepted"].includes(
        app.status,
      );
      if (!isActive) return false;

      let electionDateStr;
      if (app.election_date && typeof app.election_date === "object") {
        if (app.election_date.Valid) {
          electionDateStr = app.election_date.Time;
        } else {
          electionDateStr = "2099-12-31T00:00:00Z";
        }
      } else {
        electionDateStr = app.election_date;
      }

      if (!electionDateStr) {
        electionDateStr = "2099-12-31T00:00:00Z";
      }

      const electionDate = new Date(electionDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return electionDate >= today;
    });
    return activeApp ? activeApp.party_id || activeApp.party?.id : null;
  })();

  // Synchronize locked party selection to form state
  useEffect(() => {
    if (lockedPartyId && !selectedPartyId) {
      setSelectedPartyId(lockedPartyId);
    }
  }, [lockedPartyId, selectedPartyId, setSelectedPartyId]);

  const selectedParty = useMemo(() => {
    return parties.find((p: any) => p.id === selectedPartyId) || null;
  }, [parties, selectedPartyId]);

  // Handle party passed via URL search parameters (e.g. from marketing campaigns)
  useEffect(() => {
    if (hasProcessedSearchParty || partiesLoading || parties.length === 0) {
      return;
    }

    if (!search.party && !search.partyId) {
      setHasProcessedSearchParty(true);
      return;
    }

    const matchedParty = parties.find((p: any) => {
      if (search.partyId && Number(p.id) === Number(search.partyId))
        return true;
      if (
        search.party &&
        p.short_name &&
        p.short_name.trim().toLowerCase() === search.party.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    });

    if (!matchedParty) {
      toast.error(
        `The requested party "${search.party || search.partyId}" was not found. Please choose an eligible party.`,
        { position: "top-center" },
      );
      setStep(2);
      setHasProcessedSearchParty(true);
      return;
    }

    // Safeguard: Check if user is locked to a different party
    if (lockedPartyId && lockedPartyId !== matchedParty.id) {
      toast.error(
        `You have an active application with another party and cannot apply for ${matchedParty.short_name}.`,
        { position: "top-center" },
      );
      setStep(2);
      setHasProcessedSearchParty(true);
      return;
    }

    // Safeguard: Check if party is onboarded / verified
    if (!matchedParty.is_verified) {
      toast.error(
        `${matchedParty.name} (${matchedParty.short_name}) is not yet onboarded. Please choose an eligible party.`,
        { position: "top-center" },
      );
      setStep(2);
      setHasProcessedSearchParty(true);
      return;
    }

    // Safeguard: Check if party is accepting applications
    if (!matchedParty.is_accepting_applications) {
      toast.error(
        `${matchedParty.name} (${matchedParty.short_name}) is currently not accepting applications. Please choose an eligible party.`,
        { position: "top-center" },
      );
      setStep(2);
      setHasProcessedSearchParty(true);
      return;
    }

    // Party is valid, verified, and accepting applications!
    setSelectedPartyId(matchedParty.id);
    setStep(3);
    setHasProcessedSearchParty(true);
  }, [
    parties,
    partiesLoading,
    search.party,
    search.partyId,
    lockedPartyId,
    hasProcessedSearchParty,
  ]);

  const {
    data: pollingUnitsData,
    fetchNextPage: fetchNextUnits,
    hasNextPage: hasNextUnits,
    isFetchingNextPage: isFetchingNextUnits,
  } = useInfiniteQuery({
    queryKey: [
      "pollingUnits",
      selectedStateId,
      selectedLgaId,
      selectedWardId,
      selectedPartyId,
      selectedElectionIds?.[0],
    ],
    queryFn: async ({ pageParam }) => {
      const res = await getPollingUnitsWithCapacity({
        data: {
          stateId: selectedStateId || undefined,
          localGovernmentId: selectedLgaId || undefined,
          wardId: selectedWardId || undefined,
          limit: 20,
          cursor: pageParam || undefined,
          partyId: selectedPartyId!,
          electionGroupId: selectedElectionIds?.[0]!,
        },
      });
      if (res && res.success && res.data) {
        return res;
      }
      throw new Error(res?.message || "Failed to load polling units");
    },
    initialPageParam: "",
    getNextPageParam: (lastPage: any) => {
      if (lastPage && lastPage.meta && lastPage.meta.has_more) {
        return lastPage.meta.next_cursor || "";
      }
      return undefined;
    },
    enabled:
      (!!selectedStateId || !!selectedLgaId || !!selectedWardId) &&
      !!selectedPartyId &&
      !!selectedElectionIds?.[0],
  });

  // Flattened array of polling units across all fetched pages
  const pollingUnits = useMemo(() => {
    return pollingUnitsData
      ? pollingUnitsData.pages.flatMap(
        (page: any) => page.data?.polling_units || [],
      )
      : [];
  }, [pollingUnitsData]);

  // Reset LGA selection whenever state changes
  useEffect(() => {
    setSelectedLgaId(null);
  }, [selectedStateId]);

  // Fallback: select the first polling unit if current selection is absent from new results
  useEffect(() => {
    if (pollingUnits && pollingUnits.length > 0) {
      setSelectedPollingUnitId((current) => {
        const exists = pollingUnits.some((u: any) => u.id === current);
        return exists ? current : pollingUnits[0].id;
      });
    } else {
      setSelectedPollingUnitId(null);
    }
  }, [pollingUnits]);

  // Normalizes ward name extraction from nested or polymorphic unit response
  const getWardName = (unit: any) => {
    if (unit.ward_name) return unit.ward_name;
    if (unit.ward?.name) return unit.ward.name;
    if (unit.ward?.String) return unit.ward.String;
    return "Unknown Ward";
  };

  // Triggers hidden file input for portrait upload
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Direct portrait image upload via presigned S3/R2 storage pipeline
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setIsUploading(true);
    setSubmitError(null);

    try {
      const res = await getPresignedUploadURL({
        data: {
          original_name: rawFile.name,
          mime_type: rawFile.type,
          file_size: rawFile.size,
          folder: "avatars",
          is_public: true,
        },
      });

      if (res && res.success && res.data) {
        const { upload_url, public_url, file_id } = res.data;
        const putRes = await fetch(upload_url, {
          method: "PUT",
          headers: {
            "Content-Type": rawFile.type,
          },
          body: rawFile,
        });

        if (!putRes.ok) {
          await confirmFileUpload({ data: { id: file_id, success: false } });
          throw new Error("Failed to upload image file to storage");
        }

        await confirmFileUpload({ data: { id: file_id, success: true } });
        setAvatarUrl(public_url);
      } else {
        throw new Error("Presigned URL retrieval failed");
      }
    } catch (err) {
      console.warn("R2 upload failed, falling back to base64 preview:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(rawFile);
    } finally {
      setIsUploading(false);
    }
  };

  // Mutation submitting the full polling agent application
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (
        !selectedPartyId ||
        selectedElectionIds.length === 0 ||
        !selectedStateId ||
        !selectedLgaId ||
        !streetAddress ||
        !selectedPollingUnitId ||
        !selectedBankCode ||
        !bankAccountNumber ||
        bankAccountNumber.length !== 10 ||
        !(user?.avatar || avatarUrl)
      ) {
        throw new Error("Please fill out all required fields.");
      }

      const response = await submitPollingAgentApplication({
        data: {
          party_id: selectedPartyId,
          election_group_ids: selectedElectionIds,
          polling_unit_id: Number(selectedPollingUnitId),
          avatar: user?.avatar || avatarUrl,
          current_country: 1,
          current_state: selectedStateId!,
          current_lga: selectedLgaId!,
          current_ward: selectedWardId || undefined,
          current_city: 0,
          bank_account_number: bankAccountNumber,
          bank_code: selectedBankCode,
          whatsapp_phone: whatsappPhone,
          educational_status: educationalStatus,
          highest_degree: highestDegree,
          graduation_year: graduationYear,
          school_name: schoolName,
          phone: phone,
          address: streetAddress,
        },
      });

      if (!response.success) {
        throw new Error(
          response.message ||
          "Failed to submit application. Please check your inputs.",
        );
      }
      return response;
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (err: any) => {
      setSubmitError(
        err.message || "Connection error. Unable to reach the server.",
      );
    },
  });

  const isSubmitting = submitMutation.isPending;
  const handleSubmit = () => submitMutation.mutate();

  // Navigate backward through the wizard, skipping Step 5 if no formal education was chosen
  const handleBackClick = () => {
    if (step === 1) {
      navigate({ to: "/" });
    } else if (step === 6 && educationalStatus === "none") {
      setStep(4);
    } else {
      setStep(step - 1);
    }
  };

  return {
    user,
    // Step & Navigation
    step,
    setStep,
    handleBackClick,
    submitError,
    success,
    // Party
    parties,
    partiesLoading,
    selectedPartyId,
    setSelectedPartyId,
    selectedParty,
    lockedPartyId,
    // Elections
    selectedElectionIds,
    setSelectedElectionIds,
    appliedElectionGroupIds,
    // Photo / Avatar
    avatarUrl,
    setAvatarUrl,
    isUploading,
    fileInputRef,
    handleUploadClick,
    handleFileChange,
    // Contact
    phone,
    setPhone,
    whatsappPhone,
    setWhatsappPhone,
    dataPhone,
    setDataPhone,
    // Education
    educationalStatus,
    setEducationalStatus,
    highestDegree,
    setHighestDegree,
    graduationYear,
    setGraduationYear,
    schoolName,
    setSchoolName,
    // Location
    selectedStateId,
    setSelectedStateId,
    selectedLgaId,
    setSelectedLgaId,
    selectedWardId,
    setSelectedWardId,
    streetAddress,
    setStreetAddress,
    // Polling Units
    pollingUnits,
    selectedPollingUnitId,
    setSelectedPollingUnitId,
    getWardName,
    fetchNextUnits,
    hasNextUnits,
    isFetchingNextUnits,
    // Banking
    bankAccountNumber,
    setBankAccountNumber,
    selectedBankCode,
    setSelectedBankCode,
    bankDropdownOpen,
    setBankDropdownOpen,
    isValidatingAccount,
    setIsValidatingAccount,
    isAccountValid,
    setIsAccountValid,
    // Submission
    isSubmitting,
    handleSubmit,
  };
}

export type ApplyFormReturn = ReturnType<typeof useApplyForm>;
