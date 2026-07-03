import { cn } from "../../lib/utils";

export function TitleText({
  text,
  size = "lg",
  className,
}: {
  text: string;
  size?: "xl" | "lg" | "md" | "sm" | "xs";
  className?: string;
}) {
  const textSize = {
    xl: "text-[32px] leading-10 tracking-tight",
    lg: "text-[26px] leading-8 tracking-tight",
    md: "text-[24px] leading-7 tracking-tight",
    sm: "text-[20px] leading-6 tracking-tight",
    xs: "text-[18px] leading-6 tracking-tight",
  };

  return (
    <h1
      className={cn(`text-primary font-bold pr-4`, textSize[size], className)}
    >
      {text}
    </h1>
  );
}

export function DescriptiveText({
  text,
  size = "sm",
  className,
}: {
  text: string;
  size?: "md" | "sm";
  className?: string;
}) {
  const textSize = {
    md: "text-lg leading-7",
    sm: "text-base leading-7",
  };

  return <p className={cn("text-c-50", textSize[size], className)}>{text}</p>;
}
