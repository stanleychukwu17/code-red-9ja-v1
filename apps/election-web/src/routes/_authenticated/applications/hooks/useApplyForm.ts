import { useParties } from "#/hooks/useParties";
import {
  getApplications,
  submitPollingAgentApplication,
} from "#/lib/server/applications";
import { getUserMe } from "#/lib/server/users";
import { QUERY_KEYS } from "#/lib/config";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ApplySearch } from "../apply";
import {
  getActiveApplication,
  validatePartySearch,
} from "../utils/partyValidation";
import { validateAndFormatApplicationPayload } from "../utils/applicationValidation";

interface UseApplyFormOptions {
  search: ApplySearch;
  navigate: (opts: { to: string }) => void;
}

export function useApplyForm({ search, navigate }: UseApplyFormOptions) {
  const queryClient = useQueryClient();

  const [hasProcessedSearchParty, setHasProcessedSearchParty] = useState(false);

  // Form states
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);

  // --- Identity & Photo Verification ---
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarFileId, setAvatarFileId] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // --- Residential & Territorial Location ---
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [selectedLgaId, setSelectedLgaId] = useState<number | null>(null);
  const [selectedWardId, setSelectedWardId] = useState<number | null>(null);
  const [streetAddress, setStreetAddress] = useState<string>("");
  const [selectedPollingUnitId, setSelectedPollingUnitId] = useState<number | null>(null);

  // --- Educational Background ---
  const [educationalStatus, setEducationalStatus] = useState<string>("");
  const [highestDegree, setHighestDegree] = useState<string>("");
  const [graduationYear, setGraduationYear] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");

  // --- Bank Account & Verification ---
  const [bankAccountNumber, setBankAccountNumber] = useState<string>("");
  const [selectedBankCode, setSelectedBankCode] = useState<string | null>(null);
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

  useEffect(() => {
    if (userMeDetails) {
      // Party Affiliation
      if (userMeDetails.party_id && !selectedPartyId) setSelectedPartyId(userMeDetails.party_id);
      // Photo / Avatar
      if (userMeDetails.avatar_file_id) setAvatarFileId(Number(userMeDetails.avatar_file_id));
      if (userMeDetails.avatar && !avatarUrl) setAvatarUrl(userMeDetails.avatar);
      // Location & Residential Address
      if (userMeDetails.current_state) setSelectedStateId(userMeDetails.current_state);
      if (userMeDetails.current_lga) setSelectedLgaId(userMeDetails.current_lga);
      if (userMeDetails.current_ward) setSelectedWardId(userMeDetails.current_ward);
      if (userMeDetails.profile?.address || userMeDetails.address) {
        setStreetAddress(userMeDetails.profile?.address || userMeDetails.address || "");
      }
      if (userMeDetails.polling_unit_id) {
        setSelectedPollingUnitId(userMeDetails.polling_unit_id);
      }

      // Educational Background
      if (userMeDetails.profile?.educational_status) setEducationalStatus(userMeDetails.profile.educational_status);
      if (userMeDetails.profile?.highest_degree) setHighestDegree(userMeDetails.profile.highest_degree);
      if (userMeDetails.profile?.graduation_year) setGraduationYear(userMeDetails.profile.graduation_year);
      if (userMeDetails.profile?.school_name) setSchoolName(userMeDetails.profile.school_name);

      // Bank Details
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
      const res = await getApplications({ data: { active_election_only: true } });
      if (res?.success && res.data?.applications) {
        return res.data.applications;
      }
      return [];
    },
    staleTime: Infinity,
  });


  const activeApplication = useMemo(
    () => getActiveApplication(applications),
    [applications],
  );

  const selectedParty = useMemo(() => {
    return parties.find((p: any) => p.id === selectedPartyId) || null;
  }, [parties, selectedPartyId]);

  // Handle party passed via URL search parameters (e.g. from marketing campaigns)
  useEffect(() => {
    if (hasProcessedSearchParty || partiesLoading || parties.length === 0) {
      return;
    }

    const result = validatePartySearch({ search, parties });

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
  }, [parties, partiesLoading, search, hasProcessedSearchParty]);

  // Mutation submitting the full polling agent application
  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = validateAndFormatApplicationPayload({
        selectedPartyId,
        selectedElectionId,
        selectedStateId,
        selectedLgaId,
        selectedWardId,
        streetAddress,
        selectedPollingUnitId,
        avatarUrl,
        avatarFileId,
        userAvatar: userMeDetails?.avatar,
        bankAccountNumber,
        selectedBankCode,
        educationalStatus,
        highestDegree,
        graduationYear,
        schoolName,
      });

      const response = await submitPollingAgentApplication({ data: payload });

      if (!response.success) {
        throw new Error(response.message || "Failed to submit application. Please check your inputs.");
      }

      return response;
    },
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.session });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userMeDetails });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.applications });
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
    user: userMeDetails,
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
    activeApplication,
    // Elections
    selectedElectionId,
    setSelectedElectionId,
    selectedElectionIds: selectedElectionId ? [selectedElectionId] : [],
    // Photo / Avatar
    avatarUrl,
    setAvatarUrl,
    avatarFileId,
    setAvatarFileId,
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
