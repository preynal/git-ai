// Files to exclude from OpenAI diff
export const excludedFiles = ["yarn.lock", "package-lock.json", ".env", ".env.*"];

export const pricePerMillionTokens = 0.150;

export const modelName = "gpt-4o-mini";

export const systemMessage = "You are a helpful assistant that generates clear and concise git commit messages. Follow conventional commits format. The message must not exceed one line. Do not add optional scope to the commit message."

export default { excludedFiles, pricePerMillionTokens, systemMessage };
