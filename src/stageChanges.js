import {git} from "./git.js";
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import ora from 'ora';

// Runs pre-commit hooks on staged changes
export async function runPreCommitHooks(shouldPull = false) {
  // Get the list of currently staged files to re-stage them after the pull.
  const statusBeforePull = await git.status()
  const stagedFiles = statusBeforePull.staged

  // If there are no staged files, we can skip the synchronization and hooks.
  if (stagedFiles.length === 0) {
    console.log("No staged files to process. Skipping synchronization and pre-commit hooks.")
    return true
  }

  if (shouldPull) {
    const syncSpinner = ora("Synchronizing with remote repository...").start()
    try {
      // Use --autostash to automatically stash local changes (including staged) before pull and rebase
      const pullRes = await git.raw(["pull", "--rebase", "--autostash", "--quiet", "--no-stat"])
      syncSpinner.succeed("Synchronization successful.")

      if (pullRes.trim() !== "") {
        console.log(pullRes.trim())
      }

      // Re-stage the files that were staged before the pull.
      if (stagedFiles.length > 0) {
        const statusBeforeRestage = await git.status()
        if (statusBeforeRestage.conflicted.length > 0) {
          console.log("RESOLVE CONFLICTS HERE:", statusBeforeRestage.conflicted)
          console.log("untrained to handle conflicts, exiting now")
          process.exit(1)
          return
        }

        const restageSpinner = ora("Re-staging files...").start()
        await git.add(stagedFiles)
        restageSpinner.succeed("Files re-staged.")
      }
    } catch (e) {
      syncSpinner.fail("Synchronization failed. This is likely due to conflicts during rebase.")

      const status = await git.status()
      if (status.conflicted.length > 0) {
          console.log("\nConflicts detected in the following files:")
          status.conflicted.forEach(file => console.log(`  - ${file}`))

          console.log("\nShowing diff for conflicting files with conflict markers:")
          const diff = await git.diff(status.conflicted)
          console.log(diff)

          console.log("\nPlease resolve the conflicts in your editor.");
          console.log("After resolving conflicts, `git add` the files and run `git rebase --continue`.");
          console.log("To abort the rebase and return to the state before pulling, run `git rebase --abort`.");
      } else {
          console.error("\nAn error occurred during `git pull --rebase`. Please check your git status and resolve any issues.");
          console.error("Git command output:\n" + e.message);
      }
      process.exit(1);
    }
  }

  const hooksSpinner = ora("Running pre-commit hooks...").start();
  try {
    // Check if .husky/pre-commit exists
    const huskyPreCommitPath = path.join(process.cwd(), '.husky', 'pre-commit');
    const huskyExists = fs.existsSync(huskyPreCommitPath);

    if (huskyExists) {
      // Run .husky/pre-commit if it exists
      return new Promise((resolve, reject) => {
        const preCommit = spawn('sh', [huskyPreCommitPath], {
          stdio: "pipe",
          shell: true,
        });

        let output = '';
        preCommit.stdout.on('data', (data) => {
            output += data.toString();
        });
        preCommit.stderr.on('data', (data) => {
            output += data.toString();
        });

        preCommit.on('close', (code) => {
          if (code === 0) {
            hooksSpinner.succeed("Husky pre-commit hooks passed");
            resolve(true);
          } else {
            hooksSpinner.fail("Husky pre-commit hooks failed");
            if (output.trim()) {
                console.log(output.trim());
            }
            resolve(false);
          }
        });

        preCommit.on('error', (err) => {
          hooksSpinner.fail(`Error running husky pre-commit hooks: ${err.message}`);
          reject(err);
        });
      });
    } else {
      hooksSpinner.warn(".husky/pre-commit not found, skipping hooks");
      return true;
    }
  } catch (error) {
    hooksSpinner.fail(`Error running pre-commit hooks: ${error.message}`);
    return false;
  }
}

export async function stageAllChanges(shouldPull = false) {
  const stageSpinner = ora("Staging all changes...").start();
  try {
    // Stage all changes (new, modified, and deleted files)
    await git.add(["-A"]);
    stageSpinner.succeed("All changes staged.");

    // Run pre-commit hooks on staged changes
    const hooksSucceeded = await runPreCommitHooks(shouldPull);

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
    stageSpinner.fail(`Error during staging process: ${error.message}`);
    process.exit(1);
  }
}
