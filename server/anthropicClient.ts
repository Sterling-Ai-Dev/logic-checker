import Anthropic from "@anthropic-ai/sdk";

// Reads ANTHROPIC_API_KEY from process.env. Never expose this client, or the
// key it holds, to the browser.
export const anthropic = new Anthropic();
