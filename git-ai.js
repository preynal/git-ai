import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

// Get the directory path of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));
// Load .env from the script's directory
dotenv.config({ path: join(__dirname, '.env') });

import { stageAllChanges } from "./src/stageChanges.js";
import { git } from "./src/git.js";
import { countTokens } from "./src/tokenCounter.js";
import { generateCommitMessage } from "./src/commitMessage.js";
import { excludedFiles, pricePerMillionTokens, modelName } from "./src/config.js";

async function main() {
  await stageAllChanges();

  try {
    // Get the diff again to count tokens
    const diff = await git.diff(["--staged", "--color"]);
    if (diff) {
      const tokenCount = await countTokens(diff);
      const cost = (tokenCount / 1_000_000) * pricePerMillionTokens;
      console.log(
        `\nThis request will use approximately ${tokenCount} tokens with ${modelName}`,
        `\nEstimated cost: $${cost.toFixed(6)} (at $${pricePerMillionTokens} per million tokens)`,
      );

      console.log("Excluded files:", excludedFiles.join(", "));

      // Generate commit message suggestion
      const commitMessage = await generateCommitMessage(diff);
      console.log("Suggested commit message:");
      console.log(`\x1b[32m\x1b[1m${commitMessage}\x1b[0m`);

      // Set up stdin for raw input
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      console.log('Press Enter to commit with this message, or any other key to cancel...');

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
            process.stdout.moveCursor(0, -1);
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);

            // Use spawn to run git commit with inherited stdio
            const gitCommit = spawn('git', ['commit', '-m', commitMessage], {
              stdio: 'inherit'
            });

            // Wait for the process to complete
            await new Promise((resolve, reject) => {
              gitCommit.on('close', (code) => {
                if (code === 0) {
                  const commitTime = new Date().toLocaleString();
                  console.log(`✅ Changes committed successfully! - Timestamp: ${commitTime}`);
                  resolve();
                } else {
                  reject(new Error(`Git commit failed with code ${code}`));
                }
              });
              
              gitCommit.on('error', (err) => {
                reject(err);
              });
            });
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
