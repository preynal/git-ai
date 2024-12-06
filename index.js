import "dotenv/config";
import { stageAllChanges, git } from "./src/stageChanges.js";
import { countTokens, modelName } from "./src/tokenCounter.js";
import { generateCommitMessage } from "./src/commitMessage.js";
import { excludedFiles, pricePerMillionTokens } from "./src/config.js";

async function main() {
  await stageAllChanges();

  try {
    // Get the diff again to count tokens
    const diff = await git.diff(["--staged"]);
    if (diff) {
      const tokenCount = await countTokens(diff);
      const cost = (tokenCount / 1000000) * pricePerMillionTokens;
      console.log(
        `\nThis request will use approximately ${tokenCount} tokens with ${modelName}`,
        `\nEstimated cost: $${cost.toFixed(6)} (at $${pricePerMillionTokens} per million tokens)`,
      );

      console.log("Excluded files:", excludedFiles.join(", "));

      // Generate commit message suggestion
      const commitMessage = await generateCommitMessage(diff);
      console.log("\nSuggested commit message:");
      console.log(commitMessage);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main();
