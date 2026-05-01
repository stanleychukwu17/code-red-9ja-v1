import { createFileRoute } from "@tanstack/react-router";
import { Heart, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { AppPageHeader } from "../../../../components/app-page-header";
import { AppSidebarShell } from "../../../../components/app-sidebar";
import { FEED_POSTS, POST_COMMENTS } from "../../../../data/dashboard";

export const Route = createFileRoute("/(authenticated)/feed/$postId/")({
  validateSearch: (search) => ({
    id: typeof search.id === "string" ? search.id : FEED_POSTS[0]!.id,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useSearch();
  const fallbackPost = FEED_POSTS[0]!;
  const post = FEED_POSTS.find((item) => item.id === id) ?? fallbackPost;

  return (
    <AppSidebarShell activeItem="feed">
      <div className="flex-1 px-4 pb-8 pt-6 md:px-12 md:pt-7">
        <div className="mx-auto flex w-full max-w-[620px] flex-col gap-8">
          <AppPageHeader title="Post" />

          <article className="space-y-5">
            <div className="flex gap-4">
              <img
                src={post.avatar}
                alt={post.author}
                className="size-[46px] rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[16px] font-semibold text-[#171416]">
                      {post.author}
                    </p>
                    <p className="mt-1 text-[14px] text-[#8b8589]">
                      {post.timestamp}
                    </p>
                  </div>
                  <span className="text-[16px] text-[#8b8589]">
                    {post.meta}
                  </span>
                </div>
              </div>
            </div>

            <p className="max-w-[760px] text-[17px] leading-8 text-[#242123]">
              {post.content}
            </p>

            {post.image ? (
              <img
                src={post.image}
                alt={post.author}
                className="h-[370px] w-full rounded-[16px] object-cover"
              />
            ) : null}

            <div className="flex items-center gap-8">
              <Reaction
                icon={<Heart className="size-6 text-[#7b7679]" />}
                value={post.likes}
              />
              <Reaction
                icon={<MessageCircle className="size-6 text-[#7b7679]" />}
                value={post.comments}
              />
            </div>
          </article>

          <section className="space-y-6">
            <h2 className="text-[20px] font-medium text-[#171416]">
              Comments{" "}
              <span className="text-[#8b8589]">{POST_COMMENTS.length}</span>
            </h2>

            <div className="space-y-7">
              {POST_COMMENTS.map((comment) => (
                <article key={comment.id} className="flex items-start gap-4">
                  <img
                    src={comment.avatar}
                    alt={comment.author}
                    className="size-[42px] rounded-full object-cover"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-[16px] font-medium text-[#171416]">
                        {comment.author}
                      </span>
                      <span className="text-[14px] text-[#8b8589]">
                        {comment.timestamp}
                      </span>
                    </div>
                    <p className="max-w-[680px] text-[16px] leading-7 text-[#242123]">
                      {comment.content}
                    </p>
                    <div className="flex items-center gap-4">
                      <Reaction
                        icon={<Heart className="size-6 text-[#7b7679]" />}
                        value={comment.likes}
                      />
                      <span className="text-[#c6c1c4]">|</span>
                      <button
                        type="button"
                        className="text-[14px] font-bold text-[#171416]"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppSidebarShell>
  );
}

function Reaction({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-[14px] font-medium text-[#151314]">{value}</span>
    </div>
  );
}
