require("dotenv").config();
const { stageAllChanges, git, countTokens, modelName } = require("./src");
const { generateCommitMessage } = require("./src/commitMessage");
const { excludedFiles } = require("./src/config");

async function main() {
  await stageAllChanges();

  try {
    // Get the diff again to count tokens
    const diff = await git.diff(["--staged"]);
    if (diff) {
      const tokenCount = await countTokens(diff);
      console.log(
        `\nThis diff would use approximately ${tokenCount} tokens with ${modelName}`,
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
