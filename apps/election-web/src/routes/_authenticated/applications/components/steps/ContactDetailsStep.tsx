import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { getUserPhoneNumbers } from "#/lib/server/users";
import { useApplyContext } from "../../context/ApplyContext";
import { StepHeader } from "./shared/StepHeader";

export type ApiPhoneNumber = {
  id: number;
  phone: string;
  raw_input?: string;
  phonecode?: string;
  on_whatsapp?: "yes" | "no" | boolean;
  is_default?: boolean;
};

export type PhoneEntry = {
  id: number | string;
  phone: string;
  phonecode: string;
  raw_input: string;
  on_whatsapp: "yes" | "no";
  is_default: boolean;
};

/**
 * ContactDetailsStep
 * Collects voice and WhatsApp contact numbers to ensure supervisors and support
 * teams can reach the agent during field deployment.
 * Styled after the UserFormDialog phone number management interface.
 */
export const ContactDetailsStep = () => {
  const { user, phone, setPhone, whatsappPhone, setWhatsappPhone } = useApplyContext();

  // Tracks whether server phone numbers have populated local state
  const [hasInitialized, setHasInitialized] = useState(false);

  // Local phone rows; seeds with user's current session phone as initial fallback
  const [phones, setPhones] = useState<PhoneEntry[]>([
    {
      id: 0,
      phone: phone || user?.phone || "",
      phonecode: "234",
      raw_input: phone || user?.phone || "",
      on_whatsapp: whatsappPhone && (whatsappPhone === phone || whatsappPhone === user?.phone) ? "yes" : "no",
      is_default: true,
    },
  ]);

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

  // Populate phone list and sync form context when user phone numbers load
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

      // Sync primary call phone
      const defaultEntry = mapped.find((p) => p.is_default) || mapped[0];
      if (defaultEntry) {
        setPhone(defaultEntry.phone || defaultEntry.raw_input);
      }

      // Sync WhatsApp phone
      const whatsappEntry = mapped.find((p) => p.on_whatsapp === "yes");
      if (whatsappEntry) {
        setWhatsappPhone(whatsappEntry.phone || whatsappEntry.raw_input);
      }
    }
  }, [userPhoneNumbers, hasInitialized, setPhone, setWhatsappPhone]);

  // Sync state changes with the parent wizard context
  const syncWithContext = (updatedPhones: PhoneEntry[]) => {
    // 1. Primary phone comes from the row marked as default
    const defaultEntry = updatedPhones.find((p) => p.is_default);
    if (defaultEntry) {
      setPhone(defaultEntry.raw_input || defaultEntry.phone);
    }

    // 2. WhatsApp phone comes from the row marked with on_whatsapp === "yes"
    const whatsappEntry = updatedPhones.find((p) => p.on_whatsapp === "yes");
    if (whatsappEntry) {
      setWhatsappPhone(whatsappEntry.raw_input || whatsappEntry.phone);
    } else {
      setWhatsappPhone("");
    }
  };

  // Update input text and sync with form context
  const handleRawInputChange = (index: number, value: string) => {
    const updated = [...phones];
    const item = updated[index];
    if (!item) return;
    item.raw_input = value;
    item.phone = value;
    setPhones(updated);
    syncWithContext(updated);
  };

  // Toggle WhatsApp availability for this number
  const handleWhatsappChange = (index: number, value: "yes" | "no") => {
    const updated = [...phones];
    const item = updated[index];
    if (!item) return;
    item.on_whatsapp = value;
    setPhones(updated);
    syncWithContext(updated);
  };

  // Set selected number as primary default for calls
  const handleDefaultChange = (index: number) => {
    const updated = [...phones];
    updated.forEach((p, idx) => {
      p.is_default = idx === index;
    });
    setPhones(updated);
    syncWithContext(updated);
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
  const handleRemovePhone = (index: number) => {
    if (phones.length <= 1) return;
    const updated = phones.filter((_, idx) => idx !== index);
    // Ensure at least one number remains marked as default
    if (!updated.some((p) => p.is_default) && updated.length > 0 && updated[0]) {
      updated[0].is_default = true;
    }
    setPhones(updated);
    syncWithContext(updated);
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
              <label className="text-[13px] font-medium text-c-60 flex-1">Phone Number</label>
              <label className="text-[13px] font-medium text-c-60 w-28 text-center">WhatsApp?</label>
              <label className="text-[13px] font-medium text-c-60 w-16 text-center">Default</label>
              {phones.length > 1 && <div className="w-9" />}
            </div>

            {/* Phone rows */}
            {phones.map((phoneObj, index) => {
              const isLocked = !!user?.phone && index === 0 && !!phoneObj.id && Number(phoneObj.id) > 0;

              return (
                <div
                  key={index}
                  className="flex items-center gap-3 w-full"
                >
                  {/* Prefix + Input container */}
                  <div className="flex items-center h-12 flex-1 rounded-xl border border-border bg-background hover:border-c-40 focus-within:border-c-100 transition overflow-hidden">
                    <span
                      className="px-3 text-sm text-c-60 bg-hover-5 border-r border-border h-full flex items-center shrink-0 select-none font-medium"
                      style={{ cursor: isLocked ? "not-allowed" : "default" }}
                    >
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
    </div>
  );
};


