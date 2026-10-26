import FancyNotebookIcon from "@repo/ui/icons/fancy-notebook-icon";
import { cn } from "@repo/ui/lib/utils";

/** Illustrated spiral notebook card rendering election duty pledge statements */
export const SpiralNotebook = ({
  text,
  color,
}: {
  text: string;
  color: "purple" | "orange" | "red" | "darkblue";
}) => {
  const textColor = {
    purple: "text-purple",
    orange: "text-[#F6851F]",
    red: "text-[#EC1C24]",
    darkblue: "text-[#1B75BB]",
  };
  return (
    <div className="mt-2 h-full flex items-center justify-center">
      <div className="relative">
        <FancyNotebookIcon className="w-full shrink-0" />
        <div className="absolute inset-0 pl-14 pr-6 py-8">
          <p
            className={cn(
              `text-[27px] font-semibold leading-10`,
              textColor[color],
            )}
          >
            {text}
          </p>
        </div>
      </div>
    </div>
  );
};
