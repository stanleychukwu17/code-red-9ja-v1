import { useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { HeaderAccent } from "@repo/ui/components/header-accent";
import { AppAvatar } from "@repo/ui/components/avatar";

export type CampaignGroupTalkMessage = {
  id: string | number;
  userName: string;
  userAvatar?: string | null;
  message: string;
  createdAt?: string;
};

export type CampaignGroupTalkTopic = {
  id: string;
  label: string;
};

export type CampaignGroupTalksCardProps = {
  partyId?: string | number;
  groupId?: string | number;
  topics?: CampaignGroupTalkTopic[];
  activeTopicId?: string;
  onTopicChange?: (topicId: string) => void;
  messages?: CampaignGroupTalkMessage[];
  onSendMessage?: (message: string) => void;
  className?: string;
};

const DEFAULT_TOPICS: CampaignGroupTalkTopic[] = [
  { id: "party-history", label: "Party history" },
  { id: "what-to-bring", label: "what to bring" },
  { id: "december-party", label: "december party" },
];

const DEFAULT_MESSAGES: CampaignGroupTalkMessage[] = [
  {
    id: "msg-1",
    userName: "Tony spark",
    userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop",
    message: "Available in various elements for the needs of Project Management, Messaging",
  },
  {
    id: "msg-2",
    userName: "Tony spark",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
    message: "Available in various elements for the needs of Project Management, Messaging",
  },
  {
    id: "msg-3",
    userName: "Tony spark",
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop",
    message: "Available in various elements for the needs of Project Management, Messaging",
  },
  {
    id: "msg-4",
    userName: "Tony spark",
    userAvatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=120&h=120&fit=crop",
    message: "Available in various elements for the needs of Project Management, Messaging",
  },
];

export function CampaignGroupTalksCard({
  topics = DEFAULT_TOPICS,
  activeTopicId,
  onTopicChange,
  messages = DEFAULT_MESSAGES,
  onSendMessage,
  className,
}: CampaignGroupTalksCardProps) {
  const [selectedTopic, setSelectedTopic] = useState<string>(activeTopicId || topics[0]?.id || "");
  const [inputText, setInputText] = useState("");

  const handleTopicClick = (topicId: string) => {
    setSelectedTopic(topicId);
    onTopicChange?.(topicId);
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage?.(inputText.trim());
    setInputText("");
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Title with accent underline */}
      <div>
        <HeaderAccent
          as="h3"
          title="Talk"
          titleClassName="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
          accentClassName="top-3 sm:top-5 h-3.5 w-36"
        />
      </div>

      {/* Main Card Container */}
      <div className="rounded-3xl bg-[#f8f9fc] dark:bg-card/50 border border-slate-100 dark:border-border/60 p-5 sm:p-6 space-y-5 shadow-xs">
        {/* Topic / Channel Tags */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {topics.map((topic) => {
            const isActive = topic.id === selectedTopic;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => handleTopicClick(topic.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                  isActive
                    ? "bg-[#c6f987] text-neutral-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-muted-foreground dark:hover:text-foreground",
                )}
              >
                # {topic.label}
              </button>
            );
          })}
        </div>

        {/* Messages List */}
        <div className="space-y-4.5 pt-1">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-3 sm:gap-3.5">
              <AppAvatar
                src={msg.userAvatar || undefined}
                alt={msg.userName}
                className="size-10 sm:size-11 rounded-full shrink-0 ring-2 ring-background mt-0.5"
              />

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-xs sm:text-sm text-foreground tracking-tight">
                  {msg.userName}
                </h4>

                {/* Chat bubble */}
                <div className="mt-1 rounded-2xl rounded-tl-sm bg-[#eef2f8] dark:bg-muted/70 p-3 sm:p-3.5 text-xs sm:text-[13px] text-foreground/80 leading-relaxed font-normal">
                  {msg.message}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          className="rounded-2xl sm:rounded-full bg-[#eef2f8] dark:bg-muted/80 px-4 py-2 flex items-center gap-2 pt-2.5"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Write your comment..."
            className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70"
          />

          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1 shrink-0 cursor-pointer"
            aria-label="Attach file"
          >
            <Paperclip className="size-4 stroke-[2]" />
          </button>

          <button
            type="submit"
            className="size-8 rounded-full border border-lime-300 dark:border-lime-400/60 bg-white/70 dark:bg-neutral-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-lime-200/40 transition shrink-0 cursor-pointer shadow-2xs"
            aria-label="Send message"
          >
            <Send className="size-3.5 stroke-[2] translate-x-px text-slate-600 dark:text-slate-300" />
          </button>
        </form>
      </div>
    </div>
  );
}

