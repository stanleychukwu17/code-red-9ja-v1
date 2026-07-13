import { TriangleAlert } from "lucide-react";
import { ContactCard } from "./ContactCard";
import AlertIcon from "@repo/ui/icons/alert-icon";
import { RewardCard } from "@repo/ui/components/cards/Rewards";

export function ContactPartyTab() {
  return (
    <div className="flex flex-col">
      <RewardCard
        label="Call anyone of the below to report an issue."
        className="font-medium text-[#AA8C30]"
        icon={<AlertIcon />}
      />

      <div className="flex flex-col mt-4">
        {[
          {
            name: "Ikenna Chidindu",
            role: "LGA Supervisor",
            color: "text-[#00DF82]",
            img: "https://i.pravatar.cc/150?u=ikenna",
          },
          {
            name: "Aisha Mariam",
            role: "LGA Supervisor",
            color: "text-[#00DF82]",
            img: "https://i.pravatar.cc/150?u=aisha",
          },
        ].map((contact, i) => (
          <ContactCard
            key={i}
            name={contact.name}
            role={contact.role}
            img={contact.img}
          />
        ))}
      </div>
    </div>
  );
}
