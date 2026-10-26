import { DescriptiveText, TitleText } from "@repo/ui/components/custom/Texts";

/** Reusable step heading with primary title and auxiliary subtitle */
export const StepHeader = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) => {
  return (
    <div className="space-y-2.5">
      <TitleText text={title} />
      {subtitle && <DescriptiveText text={subtitle} />}
    </div>
  );
};
