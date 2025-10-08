// Files to exclude from diff
export const excludedFiles = [
  "**/yarn.lock",
  "**/Podfile.lock",
  "**/package-lock.json",
  "**/.env",
  "**/.env.*",
];

export const reasoningEffort = "minimal"

export const modelName = "gpt-5-mini"
export const pricePerMillionTokens = 0.25;

export const systemMessage =
  "You are a helpful assistant that generates clear and concise git commit messages. Follow conventional commits format. The message must not exceed one line and should be under 100 characters. Do not add optional scope to the commit message. eg: use feat: myfeature and never feat(scope): myfeature.";

export default {
  excludedFiles,
  reasoningEffort,
  modelName,
  pricePerMillionTokens,
  maxDiffTokens: 32_768,
  systemMessage,
};
