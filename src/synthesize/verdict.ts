import type { FrictionReport, Score } from "../types.js";

export interface VerdictResult {
  verdict: Score;
  verdictReason: string;
}

const ALL_SCORES: Score[] = ["THIN", "SHALLOW", "DEEP", "N/A"];

export function synthesizeVerdict(metrics: FrictionReport["metrics"]): VerdictResult {
  const entries = Object.entries(metrics) as Array<[string, { score: Score }]>;
  const counts: Record<Score, number> = { THIN: 0, SHALLOW: 0, DEEP: 0, "N/A": 0 };
  for (const score of ALL_SCORES) counts[score] = 0;
  for (const [, m] of entries) counts[m.score]++;

  const scoredCount = counts.THIN + counts.SHALLOW + counts.DEEP;
  let verdict: Score;
  if (scoredCount === 0) {
    verdict = "N/A";
  } else if (counts.DEEP > counts.SHALLOW && counts.DEEP > counts.THIN) {
    verdict = "DEEP";
  } else if (counts.THIN >= counts.SHALLOW && counts.THIN >= counts.DEEP) {
    // ties → THIN (conservative)
    verdict = "THIN";
  } else {
    verdict = "SHALLOW";
  }

  const breakdown = entries.map(([name, m]) => `${name}=${m.score}`).join(", ");
  const verdictReason =
    verdict === "N/A"
      ? `no metrics could be scored (${breakdown})`
      : `${counts.THIN} THIN / ${counts.SHALLOW} SHALLOW / ${counts.DEEP} DEEP (${counts["N/A"]} N/A) — ${breakdown}`;

  return { verdict, verdictReason };
}
