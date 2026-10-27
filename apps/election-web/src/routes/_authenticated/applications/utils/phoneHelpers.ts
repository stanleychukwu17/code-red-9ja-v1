import { toast } from "sonner";
import { updateUserPhoneNumbers } from "#/lib/server/users";

export type PhoneEntry = {
  id: number | string;
  phone: string;
  phonecode: string;
  raw_input: string;
  on_whatsapp: "yes" | "no";
  is_default: boolean;
};

/**
 * Validates and persists user phone numbers to the backend API.
 * Ensures at least one phone number exists, at least one is enabled for WhatsApp,
 * normalizes formatting with country codes, and returns the updated PhoneEntry array.
 */
export async function saveUserPhones(
  user: any,
  phones: PhoneEntry[],
): Promise<PhoneEntry[] | null> {
  const validPhones = phones.filter((p) => p.raw_input?.trim() !== "");
  if (validPhones.length === 0) {
    toast.error("Please enter at least one phone number.");
    return null;
  }

  const hasWhatsapp = validPhones.some((p) => p.on_whatsapp === "yes");
  if (!hasWhatsapp) {
    toast.error("At least one phone number must have WhatsApp enabled (Yes).");
    return null;
  }

  const defaultCount = validPhones.filter((p) => p.is_default).length;
  if (defaultCount === 0 && validPhones[0]) {
    validPhones[0].is_default = true;
  } else if (defaultCount > 1) {
    toast.error("Only one phone number can be set as default.");
    return null;
  }

  const userFid = user?.fake_id;
  if (!userFid) {
    toast.error("User identity not found.");
    return null;
  }

  try {
    const formattedPhones = validPhones.map((p) => {
      const cleanDigits = p.raw_input.replace(/\D/g, "");
      const code = p.phonecode || "234";
      let fullPhone = cleanDigits;
      if (cleanDigits.startsWith("0")) {
        fullPhone = "+" + code + cleanDigits.slice(1);
      } else if (!cleanDigits.startsWith(code)) {
        fullPhone = "+" + code + cleanDigits;
      } else {
        fullPhone = "+" + cleanDigits;
      }

      return {
        id: Number(p.id) > 0 ? Number(p.id) : 0,
        phone: fullPhone,
        phonecode: code,
        raw_input: p.raw_input,
        on_whatsapp: p.on_whatsapp,
        is_default: p.is_default,
      };
    });

    const res = await updateUserPhoneNumbers({
      data: {
        user_fid: userFid,
        phones: formattedPhones,
      },
    });

    if (!res?.success) {
      toast.error(res?.message || "Failed to save phone numbers.");
      return null;
    }

    const serverPhones = res.data?.phones;
    let savedList: PhoneEntry[] = formattedPhones;
    if (Array.isArray(serverPhones) && serverPhones.length > 0) {
      savedList = serverPhones.map((p: any) => ({
        id: p.id || 0,
        phone: p.phone || p.raw_input || "",
        phonecode: p.phonecode || "234",
        raw_input: p.raw_input || p.phone || "",
        on_whatsapp: p.on_whatsapp === true || p.on_whatsapp === "yes" ? "yes" : "no",
        is_default: Boolean(p.is_default),
      }));
    }

    toast.success("Phone numbers saved successfully.");
    return savedList;
  } catch (err: any) {
    toast.error(err?.message || "Failed to save phone numbers.");
    return null;
  }
}
