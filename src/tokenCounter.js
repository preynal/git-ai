import { encoding_for_model } from "tiktoken";

import { models, selectedModel } from "./config.js";

export async function countTokens(text) {
  // Only count tokens for OpenAI models
  if (selectedModel === 'openai') {
    console.log("\nwarning: tmp hardcoded gpt-4o tiktoken model, upgrade tiktoken when available")
    const enc = encoding_for_model("gpt-4o");
    const tokens = enc.encode(text);
    enc.free(); // Free up memory
    return tokens.length;
  }
  return null; // Return null for non-OpenAI models
}
