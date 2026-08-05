import CallIcon from "@repo/ui/icons/call-icon";

interface ContactRowProps {
  name: string;
  role: string;
  img: string;
  time?: string;
  roleClassName?: string;
}

export function ContactCard({ name, role, img, time = "14:53", roleClassName }: ContactRowProps) {
  return (
    <div className="min-h-14 flex items-center gap-2 py-2">
      <img src={img} alt={name} className="size-10 rounded-full object-cover shrink-0" />
      <div className="flex flex-col w-full">
        <p className="text-c-80 line-clamp-1">{name}</p>
        <span className={`text-sm line-clamp-1 ${roleClassName || "text-c-50"}`}>{role}</span>
      </div>
      <span className="text-c-50 text-[13px] mr-0.5 shrink-0">{time}</span>
      <div className="size-10 shrink-0 rounded-full bg-c-7 flex items-center justify-center cursor-pointer active:bg-c-10 transition-colors">
        <CallIcon className="size-5 text-c-90" />
      </div>
    </div>
  );
}
