import { createFileRoute, redirect } from "@tanstack/react-router";
import { APP_URL } from "#/lib/config";

export const Route = createFileRoute("/_authenticated/party/")({
  beforeLoad: ({ context }) => {
    const user = context?.userDetails;
    const party = user?.party;

    if (party?.short_name && party?.id) {
      // Find national chapter or first available chapter
      const nationalChapter = user?.chapters?.find(
        (ch: any) => ch.chapter_type?.toLowerCase() === "national"
      );
      const chapterId = nationalChapter?.id ?? user?.chapters?.[0]?.id;

      throw redirect({
        to: APP_URL.party(party.short_name.toLowerCase(), String(party.id), chapterId),
      });
    }

    throw redirect({
      to: APP_URL.parties,
    });
  },
  component: () => null,
});
