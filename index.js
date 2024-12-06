import "dotenv/config";
import Readline from 'readline'
import { stageAllChanges, git } from "./src/stageChanges.js";
import { countTokens, modelName } from "./src/tokenCounter.js";
import { generateCommitMessage } from "./src/commitMessage.js";
import { excludedFiles, pricePerMillionTokens } from "./src/config.js";

async function main() {
  await stageAllChanges();

  try {
    // Get the diff again to count tokens
    const diff = await git.diff(["--staged", "--color"]);
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

      // Set up stdin for raw input
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      console.log('\nPress Enter to commit with this message, or any other key to cancel...');

      // Handle keypress
      process.stdin.once('data', async (key) => {
        // ctrl-c ( end of text )
        if (key === '\u0003') {
          process.exit();
        }
        
        // Enter key
        if (key === '\r' || key === '\n') {
          try {
            // Clear the previous line
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            
            const result = await git.commit(commitMessage);
            const commitHash = result.commit;
            const commitTime = new Date().toLocaleString();
            console.log(`✅ Changes committed successfully!\nCommit: ${commitHash}\nTimestamp: ${commitTime}`);
          } catch (commitError) {
            console.error("❌ Error committing changes:", commitError.message);
          }
        } else {
          console.log("❌ Commit cancelled");
        }
        
        // Clean up and exit
        process.stdin.setRawMode(false);
        process.stdin.pause();
      });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main();
