import {git} from "./git.js";
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Runs pre-commit hooks on staged changes
export async function runPreCommitHooks() {
  console.log("Running pre-commit hooks...");
  try {
    // Check if .husky/pre-commit exists
    const huskyPreCommitPath = path.join(process.cwd(), '.husky', 'pre-commit');
    const huskyExists = fs.existsSync(huskyPreCommitPath);

    if (huskyExists) {
      // Run .husky/pre-commit if it exists
      return new Promise((resolve, reject) => {
        // Use "sh" to run the script instead of executing it directly
        // This avoids the need for the script to be executable
        const preCommit = spawn('sh', [huskyPreCommitPath], {
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: true,
        });

        let output = '';
        preCommit.stdout.on('data', (data) => {
          output += data.toString();
          process.stdout.write(data);
        });

        preCommit.stderr.on('data', (data) => {
          output += data.toString();
          process.stderr.write(data);
        });

        preCommit.on('close', (code) => {
          if (code === 0) {
            console.log("✅ Husky pre-commit hooks passed");
            resolve(true);
          } else {
            console.error("❌ Husky pre-commit hooks failed");
            resolve(false);
          }
        });

        preCommit.on('error', (err) => {
          console.error("❌ Error running husky pre-commit hooks:", err.message);
          reject(err);
        });
      });
    } else {
      console.log("⚠️ .husky/pre-commit not found, skipping hooks\n");
      return true;
    }
  } catch (error) {
    console.error("❌ Error running pre-commit hooks:", error.message);
    return false;
  }
}

export async function stageAllChanges() {
  try {
    // Stage all changes (new, modified, and deleted files)
    await git.add(["-A"]);

    // Run pre-commit hooks on staged changes
    const hooksSucceeded = await runPreCommitHooks();

    if (!hooksSucceeded) {
      console.log("Pre-commit hooks failed. Fix the issues before continuing.");
      process.exit(1);
    }

    // Get status to show what was staged
    const finalStatus = await git.status();
    if (finalStatus.staged.length > 0) {
      // Get diff stats for staged files with enhanced color
      const diffStat = await git.diff([
        "--staged",
        "--stat",
        "--color=always",
        "--stat-width=100",
        "--stat-name-width=50",
        "--stat-count=20",
        "--stat-graph-width=10"
      ]);
      console.log(diffStat.split("\n").map(l => l.trim()).join("\n"));
    } else {
      console.log("No staged changes found.");
    }
  } catch (error) {
    console.error("❌ Error staging changes:", error.message);
    process.exit(1);
  }
}
