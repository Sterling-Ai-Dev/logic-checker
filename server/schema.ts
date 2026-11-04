import { z } from "zod";

// Flat, not a discriminated union: object/array/string/boolean/enum/nullable
// are all documented-supported by Anthropic's structured outputs. oneOf/anyOf
// support for z.discriminatedUnion or z.union isn't confirmed, so this stays
// flat and checkArgument.ts reconstructs the clean recognized/unrecognized
// shape in code. See CLAUDE.md.
export const ValiditySchema = z.object({
  holds: z.enum(["valid", "invalid"]),
  why: z.string(),
});

export const FallacySchema = z.object({
  name: z.string(),
  where: z.string(),
  why: z.string(),
});

export const SoundnessFlagSchema = z.object({
  premise: z.string(),
  why: z.string(),
});

export const LLMVerdictSchema = z.object({
  recognized: z.boolean(),
  reason: z.string().nullable(), // populated when recognized=false
  validity: ValiditySchema.nullable(), // populated when recognized=true
  fallacies: z.array(FallacySchema),
  soundness: z.array(SoundnessFlagSchema),
});

export type LLMVerdict = z.infer<typeof LLMVerdictSchema>;
