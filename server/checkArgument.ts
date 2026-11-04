import type { Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "./anthropicClient.js";
import { ANTHROPIC_MODEL } from "./config.js";
import { LLMVerdictSchema, type LLMVerdict } from "./schema.js";
import { SYSTEM_PROMPT } from "./systemPrompt.js";

const MAX_INPUT_LENGTH = 10_000;

// Pure, deterministic point score derived from a verdict already in hand -
// no second model call, no run-to-run variance. Point values are a v0
// judgment call (100 start; -40 invalid; -15/fallacy; -10/doubtful premise;
// floored at 0), not something the model is asked for.
function scoreVerdict(
  validity: NonNullable<LLMVerdict["validity"]>,
  fallacies: LLMVerdict["fallacies"],
  soundness: LLMVerdict["soundness"],
): number {
  let score = 100;
  if (validity.holds === "invalid") score -= 40;
  score -= fallacies.length * 15;
  score -= soundness.length * 10;
  return Math.max(0, score);
}

function scoreLabel(score: number): "Solid" | "Shaky" | "Broken" {
  if (score >= 80) return "Solid";
  if (score >= 50) return "Shaky";
  return "Broken";
}

export async function checkArgument(req: Request, res: Response) {
  const argumentText =
    typeof req.body?.argumentText === "string" ? req.body.argumentText.trim() : "";

  if (!argumentText) {
    return res.status(400).json({ error: "Please paste an argument to check." });
  }
  if (argumentText.length > MAX_INPUT_LENGTH) {
    return res
      .status(400)
      .json({ error: `Argument is too long (max ${MAX_INPUT_LENGTH} characters).` });
  }

  try {
    const response = await anthropic.messages.parse({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: argumentText }],
      output_config: { format: zodOutputFormat(LLMVerdictSchema) },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      console.error("parsed_output was null", { stop_reason: response.stop_reason });
      return res
        .status(502)
        .json({ error: "The response could not be parsed. Please try again." });
    }

    if (!parsed.recognized) {
      return res.status(422).json({
        error: parsed.reason ?? "This doesn't look like a deductive argument.",
      });
    }
    if (!parsed.validity) {
      console.error("recognized=true but validity was null - model didn't follow instructions");
      return res.status(502).json({ error: "The response was incomplete. Please try again." });
    }

    // Soundness presupposes validity - an invalid argument can never be sound,
    // regardless of whether its premises are doubted, so assessment must be
    // gated on validity.holds before looking at the soundness list at all.
    const assessment: "possible" | "doubtful" | "not-applicable" =
      parsed.validity.holds === "invalid"
        ? "not-applicable"
        : parsed.soundness.length > 0
          ? "doubtful"
          : "possible";

    const score = scoreVerdict(parsed.validity, parsed.fallacies, parsed.soundness);

    return res.status(200).json({
      recognized: true,
      validity: parsed.validity,
      fallacies: parsed.fallacies,
      soundness: parsed.soundness,
      assessment,
      score,
      scoreLabel: scoreLabel(score),
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      console.error("Anthropic rate limit", err);
      return res.status(429).json({ error: "Rate limited. Please wait a moment and try again." });
    }
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.NotFoundError) {
      console.error("Anthropic auth/model misconfiguration", err);
      return res
        .status(500)
        .json({ error: "Server is misconfigured. Please contact the administrator." });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      console.error("Could not reach Anthropic API", err);
      return res.status(502).json({ error: "Could not reach the AI provider. Please try again." });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return res
        .status(502)
        .json({ error: "The AI provider returned an error. Please try again." });
    }
    console.error("Unexpected error in /api/check", err);
    return res.status(500).json({ error: "An unexpected error occurred. Please try again." });
  }
}
