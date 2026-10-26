import { Input, Label } from "@repo/ui/components/input";
import { StepHeader } from "./shared/StepHeader";

/**
 * ContactDetailsStep
 * Collects voice and WhatsApp contact numbers to ensure supervisors and support
 * teams can reach the agent during field deployment.
 */
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
      {/* Primary Voice Call Number - locks if verified on user profile */}
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
      {/* WhatsApp Number for real-time election group coordination */}
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
