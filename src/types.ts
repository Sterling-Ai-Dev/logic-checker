// Mirrors server/schema.ts's shape AFTER the server's post-processing step
// (checkArgument.ts), not the raw LLM-facing schema. There is no shared
// package in v0, so if you change one you must change the other by hand.
// Accepted v0 tradeoff - see CLAUDE.md.

export type Validity = { holds: "valid" | "invalid"; why: string };
export type Fallacy = { name: string; where: string; why: string };
export type SoundnessFlag = { premise: string; why: string };

export type RecognizedVerdict = {
  recognized: true;
  validity: Validity;
  fallacies: Fallacy[];
  soundness: SoundnessFlag[];
  // Computed by the server, never by the LLM. "not-applicable" when the
  // argument is invalid - soundness presupposes validity, so an invalid
  // argument is never "possibly sound" regardless of its premises.
  assessment: "possible" | "doubtful" | "not-applicable";
  // Also computed by the server, never by the LLM - deterministic arithmetic
  // over validity/fallacies/soundness. See CLAUDE.md.
  score: number;
  scoreLabel: "Solid" | "Shaky" | "Broken";
};
