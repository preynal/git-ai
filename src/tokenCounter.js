import { encoding_for_model } from "tiktoken";

export const modelName = "gpt-4o-mini";

export async function countTokens(text) {
  const enc = encoding_for_model(modelName);
  const tokens = enc.encode(text);
  enc.free(); // Free up memory
  return tokens.length;
}
