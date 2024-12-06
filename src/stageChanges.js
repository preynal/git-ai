import {git} from "./git.js";

export async function stageAllChanges() {
  try {
    // Stage all changes (new, modified, and deleted files)
    await git.add(["-A"]);

    // Get status to show what was staged
    const finalStatus = await git.status();
    if (finalStatus.staged.length > 0) {
      console.log("Staged changes:");
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
