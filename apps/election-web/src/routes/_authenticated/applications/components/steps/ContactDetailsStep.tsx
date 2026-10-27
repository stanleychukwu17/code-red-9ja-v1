import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StickyFooter } from "#/components/Footers";
import { Button } from "@repo/ui/components/button";
import { deleteUserPhoneNumber, getUserPhoneNumbers } from "#/lib/server/users";
import { useApplyContext } from "../../context/ApplyContext";
import { saveUserPhones, type PhoneEntry } from "../../utils/phoneHelpers";
import { StepHeader } from "./shared/StepHeader";

export type ApiPhoneNumber = {
  id: number;
  phone: string;
  raw_input?: string;
  phonecode?: string;
  on_whatsapp?: "yes" | "no" | boolean;
  is_default?: boolean;
};

/**
 * ContactDetailsStep
 * Collects voice and WhatsApp contact numbers to ensure supervisors and support
 * teams can reach the agent during field deployment.
 * Completely self-contained: manages phone inputs, validation, and database persistence.
 */
export const ContactDetailsStep = () => {
  const { user, setStep } = useApplyContext();

  const [phones, setPhones] = useState<PhoneEntry[]>([
    {
      id: 0,
      phone: user?.phone || "",
      phonecode: "234",
      raw_input: user?.phone || "",
      on_whatsapp: "no",
      is_default: true,
    },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // Tracks whether server phone numbers have populated local state
  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch registered phone numbers for the active user
  const { data: userPhoneNumbers, isLoading } = useQuery({
    queryKey: ["user-phonenumbers", user?.fake_id || user?.id],
    queryFn: async () => {
      const id = user?.fake_id || user?.id;
      if (!id) return [];
      const res = await getUserPhoneNumbers({ data: { user_id: id } });
      if (!res?.success) return [];
      return (res.data?.phone_numbers || res.data?.phones || []) as ApiPhoneNumber[];
    },
    enabled: !!(user?.fake_id || user?.id),
    staleTime: Infinity,
  });

  // Populate phone list when user phone numbers load from server
  useEffect(() => {
    if (!hasInitialized && userPhoneNumbers && userPhoneNumbers.length > 0) {
      const mapped: PhoneEntry[] = userPhoneNumbers.map((p, idx) => {
        const isDefault = p.is_default === true || idx === 0;
        const isOnWhatsapp = p.on_whatsapp === "yes" || p.on_whatsapp === true;

        return {
          id: p.id || 0,
          phone: p.phone || p.raw_input || "",
          phonecode: p.phonecode || "234",
          raw_input: p.raw_input || p.phone || "",
          on_whatsapp: isOnWhatsapp ? "yes" : "no",
          is_default: isDefault,
        };
      });

      setPhones(mapped);
      setHasInitialized(true);
    }
  }, [userPhoneNumbers, hasInitialized]);

  // Update input text
  const handleRawInputChange = (index: number, value: string) => {
    const updated = [...phones];
    const item = updated[index];
    if (!item) return;
    item.raw_input = value;
    item.phone = value;
    setPhones(updated);
  };

  // Toggle WhatsApp availability for this number
  const handleWhatsappChange = (index: number, value: "yes" | "no") => {
    const updated = [...phones];
    const item = updated[index];
    if (!item) return;
    item.on_whatsapp = value;
    setPhones(updated);
  };

  // Set selected number as primary default for calls
  const handleDefaultChange = (index: number) => {
    const updated = [...phones];
    updated.forEach((p, idx) => {
      p.is_default = idx === index;
    });
    setPhones(updated);
  };

  // Append a new empty phone row
  const handleAddPhone = () => {
    const newEntry: PhoneEntry = {
      id: 0,
      phone: "",
      phonecode: "234",
      raw_input: "",
      on_whatsapp: "no",
      is_default: phones.length === 0,
    };
    const updated = [...phones, newEntry];
    setPhones(updated);
  };

  // Remove phone row and fallback default if needed
  const handleRemovePhone = async (index: number) => {
    if (phones.length <= 1) return;
    const phoneObj = phones[index];
    if (!phoneObj) return;

    if (phoneObj.is_default) {
      toast.error("Cannot delete the active default phone number.");
      return;
    }

    if (phoneObj.id && Number(phoneObj.id) > 0) {
      const userFid = user?.fake_id || user?.id;
      if (userFid) {
        try {
          const res = await deleteUserPhoneNumber({
            data: { id: phoneObj.id, user_fid: userFid },
          });
          if (!res?.success) {
            toast.error(res?.message || "Failed to delete phone number.");
            return;
          }
          toast.success("Phone number deleted successfully.");
        } catch (err: any) {
          toast.error(err?.message || "Failed to delete phone number.");
          return;
        }
      }
    }

    const updated = phones.filter((_, idx) => idx !== index);
    // Ensure at least one number remains marked as default
    if (!updated.some((p) => p.is_default) && updated.length > 0 && updated[0]) {
      updated[0].is_default = true;
    }
    setPhones(updated);
  };

  const isContinueDisabled =
    isSaving ||
    phones.length === 0 ||
    !phones.some((p) => p.on_whatsapp === "yes") ||
    phones.every((p) => !p.raw_input?.trim());

  const handleContinue = async () => {
    setIsSaving(true);
    try {
      const ok = await saveUserPhones(user, phones);
      if (ok) {
        setStep(4);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full px-4">
      <StepHeader
        title="Contact Details"
        subtitle="Manage your contact phone numbers for voice calls and WhatsApp coordination."
      />

      <div className="space-y-4 mt-3">
        {isLoading && !hasInitialized ? (
          <div className="flex h-24 items-center justify-center gap-2 text-c-60 text-sm">
            <Loader2 className="size-5 animate-spin text-success" />
            <span>Loading registered phone numbers...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Header labels */}
            <div className="flex items-center gap-3 w-full px-1">
              <span className="flex-1 text-xs font-semibold text-c-70">Phone Number</span>
              <span className="w-28 text-center text-xs font-semibold text-c-70">On WhatsApp</span>
              <span className="w-16 text-center text-xs font-semibold text-c-70">Default</span>
              {phones.length > 1 && <span className="w-9" />}
            </div>

            {/* Phone Rows */}
            {phones.map((phoneObj, index) => {
              const isLocked = !!(
                phoneObj.id &&
                Number(phoneObj.id) > 0 &&
                phoneObj.is_default
              );

              return (
                <div
                  key={phoneObj.id || `temp-phone-${index}`}
                  className="flex items-center gap-3 w-full"
                >
                  {/* Phone Input with +234 Country Code */}
                  <div className="flex-1 flex items-center h-12 rounded-xl border border-border bg-background overflow-hidden hover:border-c-40 focus-within:border-c-100 transition min-w-0">
                    <span className="px-3 text-sm font-semibold text-c-70 border-r border-border bg-hover-5 select-none shrink-0 h-full flex items-center">
                      +{phoneObj.phonecode || "234"}
                    </span>
                    <input
                      type="tel"
                      placeholder="xxx xxx xxxx"
                      value={phoneObj.raw_input}
                      disabled={isLocked}
                      onChange={(e) => handleRawInputChange(index, e.target.value)}
                      className="flex-1 h-full px-3 text-sm text-c-100 placeholder:text-c-40 outline-none bg-transparent min-w-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* WhatsApp Select */}
                  <div className="flex items-center h-12 w-28 rounded-xl border border-border bg-background shrink-0 overflow-hidden hover:border-c-40 focus-within:border-c-100 transition">
                    <select
                      value={phoneObj.on_whatsapp}
                      onChange={(e) => handleWhatsappChange(index, e.target.value as "yes" | "no")}
                      className="w-full h-full px-3 text-sm text-c-100 outline-none bg-transparent cursor-pointer font-medium"
                    >
                      <option value="no" className="bg-background text-c-100">No</option>
                      <option value="yes" className="bg-background text-c-100">Yes</option>
                    </select>
                  </div>

                  {/* Default Call Radio */}
                  <div
                    className="flex items-center justify-center h-12 w-16 shrink-0"
                    title="Designate as primary phone for voice calls"
                  >
                    <input
                      type="radio"
                      name="defaultPhone"
                      checked={phoneObj.is_default || false}
                      onChange={() => handleDefaultChange(index)}
                      className="w-5 h-5 cursor-pointer accent-success"
                    />
                  </div>

                  {/* Delete Button (when more than 1 row exists) */}
                  {phones.length > 1 && (
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleRemovePhone(index)}
                      className="h-10 w-9 text-red hover:bg-red/10 rounded-lg transition flex items-center justify-center shrink-0 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Remove phone number"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add phone number button */}
            <button
              type="button"
              onClick={handleAddPhone}
              className="inline-flex items-center gap-1.5 text-success hover:text-success-hover font-medium text-sm hover:underline w-fit mt-2 cursor-pointer transition-colors"
            >
              <Plus className="size-4" />
              <span>Add Phone Number</span>
            </button>
          </div>
        )}

        <div className="p-3.5 bg-hover-5 rounded-xl border border-border text-xs text-c-70 leading-relaxed mt-4">
          <span className="font-semibold text-c-100">Note:</span> The phone number marked as <strong className="text-c-90">Default</strong> will receive voice calls and verification alerts. Phone numbers with <strong className="text-c-90">WhatsApp</strong> set to Yes will be added to election group monitoring channels.
        </div>
      </div>

      {/* Sticky footer for Step 3 */}
      <StickyFooter className="pb-20 mt-6">
        <Button
          type="button"
          variant="black"
          size="4xl"
          className="w-full rounded-full"
          disabled={isContinueDisabled}
          onClick={handleContinue}
        >
          {isSaving && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
          Continue
        </Button>
      </StickyFooter>
    </div>
  );
};
