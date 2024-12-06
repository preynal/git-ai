// Files to exclude from OpenAI diff
export const excludedFiles = ["yarn.lock", "package-lock.json", ".env", ".env.*"];

export const pricePerMillionTokens = 0.150;

export const systemMessage = "You are a helpful assistant that generates clear and concise git commit messages. Follow conventional commits format. The message must not exceed one line."

export default { excludedFiles, pricePerMillionTokens, systemMessage };
