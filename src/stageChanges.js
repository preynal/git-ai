import simpleGit from "simple-git";

export const git = simpleGit();

export async function stageAllChanges() {
  try {
    // Get the status of the repository
    const status = await git.status();

    // Stage modified files if there are any
    if (status.modified.length > 0) {
      // Add only modified files
      for (const file of status.modified) {
        await git.add(file);
      }
    }

    // Show staged changes regardless of whether we just staged them or not
    const finalStatus = await git.status();
    if (finalStatus.staged.length > 0) {
      console.log("\nStaged changes:");
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
      console.log(diffStat);
    } else {
      console.log("No staged changes found.");
    }
  } catch (error) {
    console.error("❌ Error staging changes:", error.message);
    process.exit(1);
  }
}
