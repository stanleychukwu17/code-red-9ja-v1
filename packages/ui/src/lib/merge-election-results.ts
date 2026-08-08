export type CandidateResult = {
  party_short_name?: string;
  short_name?: string;
  vote_count?: number;
  votes?: number;
  [key: string]: any;
};

export type ElectionFinalResultObj = {
  candidate_results?: CandidateResult[] | string;
  candidate_results_live?: CandidateResult[] | string;
  [key: string]: any;
};

export type ElectionCandidate = {
  party_short_name?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  [key: string]: any;
};

export type Party = {
  short_name?: string;
  party_short_name?: string;
  logo?: string;
  [key: string]: any;
};

export type MergedResult = {
  party_short_name: string;
  vote_count: number;
  name: string;
  avatar?: string;
  party_logo?: string;
  [key: string]: any;
};

export function mergeElectionResults({
  candidates = [],
  electionFinalResults,
  parties = [],
  isLive = false,
}: {
  candidates?: ElectionCandidate[];
  electionFinalResults?: ElectionFinalResultObj | null;
  parties?: Party[];
  isLive?: boolean;
}): MergedResult[] {
  let liveRes = electionFinalResults?.candidate_results_live;
  let finalRes = electionFinalResults?.candidate_results;

  // Parse strings if they are stringified JSON
  if (typeof liveRes === "string") {
    try {
      liveRes = JSON.parse(liveRes);
    } catch (e) {
      console.error("Error parsing live candidate results", e);
    }
  }
  if (typeof finalRes === "string") {
    try {
      finalRes = JSON.parse(finalRes);
    } catch (e) {
      console.error("Error parsing candidate results", e);
    }
  }

  let candidateResults: CandidateResult[] = [];
  if (isLive) {
    candidateResults =
      (liveRes as CandidateResult[]) ?? (finalRes as CandidateResult[]) ?? [];
  } else {
    candidateResults = (finalRes as CandidateResult[]) ?? [];
  }

  if (!Array.isArray(candidateResults)) {
    candidateResults = [];
  }

  if (candidateResults.length === 0) {
    const knownParties = new Set<string>();
    parties.forEach((p) =>
      knownParties.add(p.short_name || p.party_short_name || ""),
    );
    candidates.forEach((c) => knownParties.add(c.party_short_name || ""));
    knownParties.delete("");

    candidateResults = Array.from(knownParties).map((pName) => ({
      party_short_name: pName,
      vote_count: 0,
      votes: 0,
    }));
  }

  const merged = candidateResults.map((cr) => {
    const pName = cr.party_short_name || cr.short_name || "";
    const pNameLower = pName.toLowerCase();
    const candidate = candidates.find(
      (c) => c.party_short_name?.toLowerCase() === pNameLower,
    );
    const party = parties.find(
      (p) =>
        p.short_name?.toLowerCase() === pNameLower ||
        p.party_short_name?.toLowerCase() === pNameLower,
    );

    return {
      ...cr, // keep everything from original
      party_short_name: pName,
      vote_count: cr.vote_count ?? cr.votes ?? 0,
      name: candidate
        ? `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim()
        : "",
      avatar: candidate?.avatar,
      party_logo: party?.logo,
    };
  });

  return merged.sort((a, b) => b.vote_count - a.vote_count);
}
