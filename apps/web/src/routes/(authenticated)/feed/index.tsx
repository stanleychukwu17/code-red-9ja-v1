import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Heart, Image as ImageIcon, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { AppSidebarShell } from "../../../components/app-sidebar";
import { FEED_POSTS } from "../../../data/dashboard";

export const Route = createFileRoute("/(authenticated)/feed/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <AppSidebarShell activeItem="feed">
      <div className="flex-1 px-4 pb-8 pt-6 md:px-12 md:pt-7">
        <div className="mx-auto flex w-full max-w-[620px] flex-col gap-6">
          <h1 className="text-[34px] font-bold tracking-[-0.04em] text-[#232124]">
            Post
          </h1>

          <section className="space-y-1">
            <div className="flex items-center gap-4 border-b border-black/5 pb-6">
              <img
                src="https://res.cloudinary.com/dhtcwqsx4/image/upload/v1752427256/Inschool/avatars/4_j0ddwv.jpg"
                alt="What's happening"
                className="size-11 rounded-full object-cover"
              />
              <span className="flex-1 text-[18px] text-[#5f5a5d]">
                What&apos;s happening?
              </span>
              <ImageIcon className="size-7 text-[#8e898b]" />
            </div>

            {FEED_POSTS.map((post) => (
              <article
                key={post.id}
                className="cursor-pointer border-b border-transparent py-5 transition hover:opacity-95"
                onClick={() =>
                  navigate({
                    to: "/feed/$postId",
                    search: { id: post.id },
                  })
                }
              >
                <div className="flex gap-4">
                  <img
                    src={post.avatar}
                    alt={post.author}
                    className="size-[46px] rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-[16px] font-semibold text-[#151314]">
                        {post.author}
                      </span>
                      <span className="text-[16px] text-[#8b8589]">
                        {post.meta}
                      </span>
                    </div>

                    <p className="max-w-[700px] text-[16px] leading-7 text-[#202021]">
                      {post.content}
                    </p>

                    {post.image ? (
                      <img
                        src={post.image}
                        alt={post.author}
                        className="h-[230px] w-full max-w-[420px] rounded-[12px] object-cover"
                      />
                    ) : null}

                    <div className="flex items-center gap-8">
                      <Reaction
                        icon={<Heart className="size-6 text-[#7b7679]" />}
                        value={post.likes}
                      />
                      <Reaction
                        icon={
                          <MessageCircle className="size-6 text-[#7b7679]" />
                        }
                        value={post.comments}
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
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
