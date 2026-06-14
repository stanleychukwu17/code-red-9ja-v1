/**
 * Returns a Tailwind text colour class for an election rank number.
 * Rank 1 = Gold, 2 = Silver, 3 = Bronze, then Emerald, Cyan, Blue, Indigo, Violet, Pink, Red (default).
 */
export function getRankColor(rank: string | number): string {
  const r = typeof rank === "number" ? rank : parseInt(rank as string, 10);
  switch (r) {
    case 1:
      return "text-[#FFD700]"; // Gold
    case 2:
      return "text-[#C0C0C0]"; // Silver
    case 3:
      return "text-[#CD7F32]"; // Bronze
    case 4:
      return "text-[#10B981]"; // Emerald
    case 5:
      return "text-[#06B6D4]"; // Cyan
    case 6:
      return "text-[#3B82F6]"; // Blue
    case 7:
      return "text-[#6366F1]"; // Indigo
    case 8:
      return "text-[#8B5CF6]"; // Violet
    case 9:
      return "text-[#EC4899]"; // Pink
    default:
      return "text-[#EF4444]"; // Red
  }
}
