import { encoding_for_model } from "tiktoken";
import { models, selectedModel } from "./config.js";

export async function countTokens(text) {
  // Only count tokens for OpenAI models
  if (selectedModel === 'openai') {
    const enc = encoding_for_model(models.openai.name);
    const tokens = enc.encode(text);
    enc.free(); // Free up memory
    return tokens.length;
  }
  return null; // Return null for non-OpenAI models
}
