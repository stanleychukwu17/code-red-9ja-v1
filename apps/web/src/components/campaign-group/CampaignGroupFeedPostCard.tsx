import { useState } from "react";
import {
  MessageSquare,
  Heart,
  Share2,
  Bookmark,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { AppAvatar } from "@repo/ui/components/avatar";

export type FeedPostMedia = {
  id?: string | number;
  url?: string;
  type?: "image" | "video";
};

export type FeedPostItem = {
  id: string | number;
  authorName: string;
  authorAvatar?: string | null;
  authorSubtitle?: string;
  timeAgo?: string;
  content: string;
  media?: (string | FeedPostMedia)[];
  commentsCount?: number;
  likesCount?: number;
  sharesCount?: number;
  savedCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
};

export type CampaignGroupFeedPostCardProps = {
  post?: FeedPostItem;
  currentUserAvatar?: string | null;
  onLike?: (postId: string | number) => void;
  onComment?: (postId: string | number, comment: string) => void;
  onShare?: (postId: string | number) => void;
  onSave?: (postId: string | number) => void;
  className?: string;
};

const DEFAULT_POST: FeedPostItem = {
  id: "post-1",
  authorName: "Chris martins otse",
  authorAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&h=120&fit=crop",
  authorSubtitle: "National chapter",
  timeAgo: "3days 9:15pm",
  content:
    "Available in various elements for the needs of Project Management, Messaging Platform, Social Media Analytics, Sales Analytics, Job Search, Knowledge Base, Education, and Signup/Login Form. Made with a unique style using rounded",
  media: [
    { id: "m1", url: "" },
    { id: "m2", url: "" },
    { id: "m3", url: "" },
  ],
  commentsCount: 25,
  likesCount: 243,
  sharesCount: 5,
  savedCount: 10,
};

export function CampaignGroupFeedPostCard({
  post = DEFAULT_POST,
  currentUserAvatar,
  onLike,
  onComment,
  onShare,
  onSave,
  className,
}: CampaignGroupFeedPostCardProps) {
  const [commentText, setCommentText] = useState("");
  const [isLiked, setIsLiked] = useState(post.isLiked ?? false);
  const [likesCount, setLikesCount] = useState(post.likesCount ?? 243);
  const [isSaved, setIsSaved] = useState(post.isSaved ?? false);
  const [savedCount, setSavedCount] = useState(post.savedCount ?? 10);

  const handleLike = () => {
    const nextState = !isLiked;
    setIsLiked(nextState);
    setLikesCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    onLike?.(post.id);
  };

  const handleSave = () => {
    const nextState = !isSaved;
    setIsSaved(nextState);
    setSavedCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    onSave?.(post.id);
  };

  const handleCommentSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!commentText.trim()) return;
    onComment?.(post.id, commentText.trim());
    setCommentText("");
  };

  const mediaList = post.media || [];
  const media0 = typeof mediaList[0] === "string" ? { url: mediaList[0] } : mediaList[0];
  const media1 = typeof mediaList[1] === "string" ? { url: mediaList[1] } : mediaList[1];
  const media2 = typeof mediaList[2] === "string" ? { url: mediaList[2] } : mediaList[2];

  return (
    <div
      className={cn(
        "rounded-3xl bg-[#f8f9fc] dark:bg-card/50 border border-slate-100 dark:border-border/60 p-6 sm:p-7 space-y-5 shadow-xs",
        className,
      )}
    >
      {/* 1. Header: Author info and More options */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <AppAvatar
            src={post.authorAvatar || undefined}
            alt={post.authorName}
            className="size-12 sm:size-13 rounded-full shrink-0 ring-2 ring-background"
          />

          <div className="space-y-0.5">
            <h4 className="font-bold text-base sm:text-lg text-foreground tracking-tight leading-tight">
              {post.authorName}
            </h4>
            {post.authorSubtitle && (
              <p className="text-xs text-muted-foreground font-medium">
                {post.authorSubtitle}
              </p>
            )}
            {post.timeAgo && (
              <p className="text-[11px] text-muted-foreground/80">
                {post.timeAgo}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition p-1 cursor-pointer"
          aria-label="More options"
        >
          <MoreHorizontal className="size-5" />
        </button>
      </div>

      {/* 2. Post Content */}
      <p className="text-xs sm:text-[14px] text-foreground/90 leading-relaxed font-normal">
        {post.content}
      </p>

      {/* 3. Media Grid (1 Large on Left, 2 Stacked on Right) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Left Column (Large) */}
        <div className="h-[260px] sm:h-[350px] rounded-3xl bg-[#eef2f8] dark:bg-muted/70 overflow-hidden border border-border/20 shadow-2xs">
          {media0?.url ? (
            <img
              src={media0.url}
              alt="Post attachment"
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full" />
          )}
        </div>

        {/* Right Column (2 Stacked) */}
        <div className="grid grid-rows-2 gap-3.5 sm:gap-4 h-[260px] sm:h-[350px]">
          <div className="rounded-3xl bg-[#eef2f8] dark:bg-muted/70 overflow-hidden border border-border/20 shadow-2xs">
            {media1?.url ? (
              <img
                src={media1.url}
                alt="Post attachment"
                className="size-full object-cover"
              />
            ) : (
              <div className="size-full" />
            )}
          </div>

          <div className="rounded-3xl bg-[#eef2f8] dark:bg-muted/70 overflow-hidden border border-border/20 shadow-2xs">
            {media2?.url ? (
              <img
                src={media2.url}
                alt="Post attachment"
                className="size-full object-cover"
              />
            ) : (
              <div className="size-full" />
            )}
          </div>
        </div>
      </div>

      {/* 4. Interaction Stats Bar */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-foreground/85 font-medium pt-1 px-1 flex-wrap gap-2">
        <button
          type="button"
          className="flex items-center gap-1.5 hover:text-primary transition cursor-pointer"
        >
          <MessageSquare className="size-4 stroke-[1.8]" />
          <span>{post.commentsCount ?? 0} Comments</span>
        </button>

        <button
          type="button"
          onClick={handleLike}
          className={cn(
            "flex items-center gap-1.5 transition cursor-pointer",
            isLiked ? "text-rose-500 font-semibold" : "hover:text-rose-500",
          )}
        >
          <Heart
            className={cn(
              "size-4 stroke-[1.8]",
              isLiked && "fill-rose-500 text-rose-500",
            )}
          />
          <span>{likesCount} Likes</span>
        </button>

        <button
          type="button"
          onClick={() => onShare?.(post.id)}
          className="flex items-center gap-1.5 hover:text-primary transition cursor-pointer"
        >
          <Share2 className="size-4 stroke-[1.8]" />
          <span>{post.sharesCount ?? 0} Shares</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          className={cn(
            "flex items-center gap-1.5 transition cursor-pointer",
            isSaved ? "text-primary font-semibold" : "hover:text-primary",
          )}
        >
          <Bookmark
            className={cn(
              "size-4 stroke-[1.8]",
              isSaved && "fill-primary text-primary",
            )}
          />
          <span>{savedCount} Saved</span>
        </button>
      </div>

      {/* 5. Divider & Inline Comment Input Bar */}
      <div className="pt-3 border-t border-border/40">
        <form
          onSubmit={handleCommentSubmit}
          className="flex items-center gap-2.5 sm:gap-3"
        >
          <AppAvatar
            src={
              currentUserAvatar ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
            }
            alt="Your profile"
            className="size-9 sm:size-10 rounded-full shrink-0 ring-2 ring-background"
          />

          <div className="flex-1 rounded-2xl sm:rounded-full bg-[#eef2f8] dark:bg-muted/80 px-4 py-2 flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write your comment..."
              className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70"
            />

            <button
              type="submit"
              className="size-8 rounded-full border border-lime-300 dark:border-lime-400/60 bg-white/70 dark:bg-neutral-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-lime-200/40 transition shrink-0 cursor-pointer shadow-2xs"
              aria-label="Post comment"
            >
              <Send className="size-3.5 stroke-[2] translate-x-px text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

