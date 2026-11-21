export type UpdateMessageInputsProps = {
  title: string;
  onTitleChange: (val: string) => void;
  message: string;
  onMessageChange: (val: string) => void;
  titleMaxLength?: number;
};

export function UpdateMessageInputs({
  title,
  onTitleChange,
  message,
  onMessageChange,
  titleMaxLength = 120,
}: UpdateMessageInputsProps) {
  return (
    <div className="space-y-3">
      {/* Update Headline Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Headline / short summary..."
        maxLength={titleMaxLength}
        className="w-full rounded-2xl bg-[#F3F4F8] dark:bg-muted/30 border border-slate-400 dark:border-border/60 px-4 py-3.5 text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition"
      />

      {/* Detailed Situation Report Textarea (Optional) */}
      <textarea
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        placeholder="Add more details (optional)..."
        rows={5}
        className="w-full rounded-2xl bg-[#F3F4F8] dark:bg-muted/30 border border-slate-400 dark:border-border/60 p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 transition resize-none"
      />
    </div>
  );
}
