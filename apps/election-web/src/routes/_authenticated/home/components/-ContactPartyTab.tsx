import { Phone, TriangleAlert } from "lucide-react";

export function ContactPartyTab() {
  return (
    <div className="flex flex-col gap-3 mt-6 pb-24">
      <h2 className="text-[#333333] font-bold text-[22px]">Call Party Supervisor</h2>
      <div className="bg-[#FDF2D4] rounded-[12px] p-4 flex items-start gap-3 mt-1">
        <TriangleAlert className="w-5 h-5 text-[#916719] shrink-0 mt-0.5" />
        <p className="text-[#333333] text-[16px] leading-snug font-medium">
          Call anyone of the below to report an issue.
        </p>
      </div>

      <div className="flex flex-col mt-4 gap-4">
        {[
          { name: "Ikenna Chidindu", role: "LGA Supervisor", color: "text-[#00DF82]", img: "https://i.pravatar.cc/150?u=ikenna" },
          { name: "Aisha Mariam", role: "LGA Supervisor", color: "text-[#00DF82]", img: "https://i.pravatar.cc/150?u=aisha" },
          { name: "Abraham Isa", role: "LGA Supervisor", color: "text-[#00DF82]", img: "https://i.pravatar.cc/150?u=abraham" },
          { name: "Chigozie Nnwachukwu", role: "State Supervisor", color: "text-[#A855F7]", img: "https://i.pravatar.cc/150?u=chigozie" },
          { name: "Jonathan Kuminga", role: "State Supervisor", color: "text-[#A855F7]", img: "https://i.pravatar.cc/150?u=jonathan" },
        ].map((contact, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-4">
              <img src={contact.img} alt={contact.name} className="w-14 h-14 rounded-full object-cover" />
              <div className="flex flex-col gap-0.5">
                <span className="text-neutral-700 font-medium text-[17px]">{contact.name}</span>
                <span className={`${contact.color} text-[14.5px] font-medium`}>{contact.role}</span>
              </div>
            </div>
            <button className="w-11 h-11 rounded-full bg-neutral-200/70 flex items-center justify-center hover:bg-neutral-300 transition">
              <Phone className="w-[18px] h-[18px] text-neutral-800" strokeWidth={2.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
