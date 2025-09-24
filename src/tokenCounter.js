import { encoding_for_model, get_encoding } from "tiktoken";

import { modelName } from "./config.js";

export async function countTokens(text) {
  let enc;
  try {
    enc = encoding_for_model(modelName);
  } catch (_) {
    enc = get_encoding("cl100k_base");
  }
  try {
    const tokens = enc.encode(text);
    return tokens.length;
  } finally {
    enc.free();
  }
  return null; // Return null for non-OpenAI models
}
