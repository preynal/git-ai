import { spawn } from "child_process"
import fs from "fs"
import path from "path"
import ora from "ora"

import {git} from "./git.js"

function unique(items) {
  return [...new Set(items)]
}

function parseNullDelimitedNameStatus(diffOutput) {
  if (!diffOutput) return []

  const parts = diffOutput.split("\0")
  const entries = []

  let i = 0
  while (i < parts.length) {
    const status = parts[i]
    if (!status) break
    i += 1

    const code = status[0]
    if (code === "R" || code === "C") {
      const from = parts[i] ?? ""
      const to = parts[i + 1] ?? ""
      i += 2

      if (from && to) {
        entries.push({code, status, from, to})
      }

      continue
    }

    const file = parts[i] ?? ""
    i += 1

    if (file) {
      entries.push({code, status, file})
    }
  }

  return entries
}

async function getStagedChanges() {
  const diffOutput = await git.diff(["--cached", "--name-status", "-z"])
  return parseNullDelimitedNameStatus(diffOutput)
}

// Runs pre-commit hooks on staged changes
export async function runPreCommitHooks(shouldPull = false, shouldSkipHooks = false) {
  // Get the list of currently staged files to re-stage them after the pull.
  const stagedChanges = await getStagedChanges()

  // If there are no staged files, we can skip the synchronization and hooks.
  if (stagedChanges.length === 0) {
    // console.log("No staged files to process. Skipping synchronization and pre-commit hooks.")
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
      if (stagedChanges.length > 0) {
        const statusBeforeRestage = await git.status()
        if (statusBeforeRestage.conflicted.length > 0) {
          console.log("RESOLVE CONFLICTS HERE:", statusBeforeRestage.conflicted)
          console.log("untrained to handle conflicts, exiting now")
          process.exit(1)
          return
        }

        const restageSpinner = ora("Re-staging files...").start()

        try {
          const filesToAdd = []
          const filesToRemove = []

          for (const change of stagedChanges) {
            if (change.code === "R") {
              filesToAdd.push(change.to)
              filesToRemove.push(change.from)
              continue
            }

            if (change.code === "C") {
              filesToAdd.push(change.to)
              continue
            }

            if (change.code === "D") {
              filesToRemove.push(change.file)
              continue
            }

            filesToAdd.push(change.file)
          }

          const existingFilesToAdd = []
          for (const file of unique(filesToAdd)) {
            const absolutePath = path.join(process.cwd(), file)
            if (fs.existsSync(absolutePath)) {
              existingFilesToAdd.push(file)
            } else {
              console.log(`⚠️  Skipping re-stage for missing file: ${file}`)
            }
          }

          if (existingFilesToAdd.length > 0) {
            await git.add(existingFilesToAdd)
          }

          if (filesToRemove.length > 0) {
            await git.raw(["rm", "--cached", "--ignore-unmatch", ...unique(filesToRemove)])
          }

          restageSpinner.succeed("Files re-staged.")
        } catch (restageError) {
          restageSpinner.fail("Failed to re-stage files.")
          throw restageError
        }
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

          console.log("\nPlease resolve the conflicts in your editor.")
          console.log("After resolving conflicts, `git add` the files and run `git rebase --continue`.")
          console.log("To abort the rebase and return to the state before pulling, run `git rebase --abort`.")
      } else {
          console.error("\nAn error occurred during `git pull --rebase`. Please check your git status and resolve any issues.")
          console.error("Git command output:\n" + e.message)
      }
      process.exit(1)
    }
  }

  if (shouldSkipHooks) {
    console.log("Skipping pre-commit hooks (--no-verify).\n")
    return true
  }

  console.log("Running pre-commit hooks...")

  try {
    // Check if .husky/pre-commit exists
    const huskyPreCommitPath = path.join(process.cwd(), ".husky", "pre-commit")
    const huskyExists = fs.existsSync(huskyPreCommitPath)

    if (huskyExists) {
      // Run .husky/pre-commit if it exists
      return new Promise((resolve, reject) => {
        const preCommit = spawn(`sh ${huskyPreCommitPath}`, {
          stdio: "inherit",
          shell: true,
        })

        preCommit.on("close", (code) => {
          if (code === 0) {
            console.log("\x1b[32m✓\x1b[0m Husky pre-commit hooks passed\n")
            resolve(true)
          } else {
            console.error("\x1b[31m✗\x1b[0m Husky pre-commit hooks failed\n")
            resolve(false)
          }
        })

        preCommit.on("error", (err) => {
          console.error("\x1b[31m✗\x1b[0m Error running husky pre-commit hooks:", err.message)
          reject(err)
        })
      })
    } else {
      console.log("⚠️  .husky/pre-commit not found, skipping hooks\n")
      return true
    }
  } catch (error) {
    console.error("\x1b[31m✗\x1b[0m Error running husky pre-commit hooks:", err.message)
    return false
  }
}

export async function stageAllChanges(shouldPull = false, shouldSkipHooks = false) {
  const stageSpinner = ora("Staging all changes...").start()
  try {
    // Stage all changes (new, modified, and deleted files)
    await git.add(["-A"])
    stageSpinner.succeed("All changes staged.")

    // Run pre-commit hooks on staged changes
    const hooksSucceeded = await runPreCommitHooks(shouldPull, shouldSkipHooks)

    if (!hooksSucceeded) {
      console.log("Pre-commit hooks failed. Fix the issues before continuing.")
      process.exit(1)
    }

    // Get status to show what was staged
    const diffStat = await git.diff([
      "--staged",
      "--stat",
      "--color=always",
      "--stat-width=100",
      "--stat-name-width=50",
      "--stat-count=20",
      "--stat-graph-width=10"
    ])

    if (diffStat.trim()) {
      console.log(diffStat.split("\n").map(l => l.trim()).join("\n"))
    } else {
      console.log("No staged changes found.")
    }
  } catch (error) {
    stageSpinner.fail(`Error during staging process: ${error.message}`)
    process.exit(1)
  }
}
