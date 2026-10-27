import { useUser } from "#/hooks/useUser";
import { useParties } from "#/hooks/useParties";
import {
  getApplications,
  submitPollingAgentApplication,
} from "#/lib/server/applications";
import { getUserMe } from "#/lib/server/users";
import { QUERY_KEYS } from "#/lib/config";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ApplySearch } from "../apply";
import {
  getAppliedElectionGroupIds,
  getLockedPartyId,
  validatePartySearch,
} from "../utils/partyValidation";

interface UseApplyFormOptions {
  search: ApplySearch;
  navigate: (opts: { to: string }) => void;
}

export function useApplyForm({ search, navigate }: UseApplyFormOptions) {
  const user = useUser();

  const [hasProcessedSearchParty, setHasProcessedSearchParty] = useState(false);

  // Form states
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(user?.party_id || null);
  const [selectedElectionIds, setSelectedElectionIds] = useState<number[]>([]);

  // --- Identity & Photo Verification ---
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar || "");
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // --- Residential & Territorial Location ---
  const [selectedStateId, setSelectedStateId] = useState<number | null>(user?.current_state || null);
  const [selectedLgaId, setSelectedLgaId] = useState<number | null>(user?.current_lga || null);
  const [selectedWardId, setSelectedWardId] = useState<number | null>(user?.current_ward || null);
  const [streetAddress, setStreetAddress] = useState<string>(user?.address || "");
  const [selectedPollingUnitId, setSelectedPollingUnitId] = useState<number | null>(user?.polling_unit_id || null);

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
    queryKey: QUERY_KEYS.userMeDetails,
    queryFn: async () => {
      const res = await getUserMe();
      return res?.success && res.data?.user ? res.data.user : null;
    },
    staleTime: Infinity,
  });
  console.log("userMeDetails", userMeDetails);

  useEffect(() => {
    if (userMeDetails) {
      if (userMeDetails.profile?.educational_status) setEducationalStatus(userMeDetails.profile.educational_status);
      if (userMeDetails.profile?.highest_degree) setHighestDegree(userMeDetails.profile.highest_degree);
      if (userMeDetails.profile?.graduation_year) setGraduationYear(userMeDetails.profile.graduation_year);
      if (userMeDetails.profile?.school_name) setSchoolName(userMeDetails.profile.school_name);

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
    queryKey: QUERY_KEYS.applications,
    queryFn: async () => {
      const res = await getApplications();
      if (res?.success && res.data?.applications) {
        return res.data.applications;
      }
      return [];
    },
    staleTime: Infinity,
  });

  const appliedElectionGroupIds = useMemo(
    () => getAppliedElectionGroupIds(applications),
    [applications],
  );

  const lockedPartyId = useMemo(
    () => getLockedPartyId(applications),
    [applications],
  );

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

    const result = validatePartySearch({ search, parties, lockedPartyId });

    if (!result) {
      setHasProcessedSearchParty(true);
      return;
    }

    if (!result.success) {
      toast.error(result.error, { position: "top-center" });
      setStep(2);
      setHasProcessedSearchParty(true);
      return;
    }

    setSelectedPartyId(result.party.id);
    setStep(3);
    setHasProcessedSearchParty(true);
  }, [parties, partiesLoading, search, lockedPartyId, hasProcessedSearchParty]);

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
          whatsapp_phone: "",
          educational_status: educationalStatus,
          highest_degree: highestDegree,
          graduation_year: graduationYear,
          school_name: schoolName,
          phone: user?.phone || "",
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

  // Navigate backward through the wizard
  const handleBackClick = () => {
    if (step === 1) {
      navigate({ to: "/" });
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
    setSubmitError,
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
    setIsUploading,
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
    // Polling Unit selection
    selectedPollingUnitId,
    setSelectedPollingUnitId,
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
