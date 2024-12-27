// Files to exclude from diff
export const excludedFiles = ["yarn.lock", "package-lock.json", ".env", ".env.*"];

export const pricePerMillionTokens = 2.5;

export const models = {
  openai: {
    name: "gpt-4o",
    pricePerMillionTokens: 2.5
  },
  anthropic: {
    name: "claude-3-sonnet-20240229",
    pricePerMillionTokens: 0.163
  }
};

export const selectedModel = "openai"; // Change this to switch models

// Maximum number of tokens allowed in the diff before refusing to process
export const maxDiffTokens = 32_768;

export const systemMessage = "You are a helpful assistant that generates clear and concise git commit messages. Follow conventional commits format. The message must not exceed one line. Do not add optional scope to the commit message. eg: use feat: myfeature and never feat(scope): myfeature."

export default {
  excludedFiles,
  pricePerMillionTokens,
  maxDiffTokens,
  systemMessage,
  models,
  defaultModel: selectedModel
};
