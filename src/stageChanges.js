import simpleGit from "simple-git";

export const git = simpleGit();

export async function stageAllChanges() {
  try {
    // Get the status of the repository
    const status = await git.status();

    // Stage only modified files
    if (status.modified.length > 0) {
      // Add only modified files
      for (const file of status.modified) {
        await git.add(file);
      }
      console.log("✅ All modified files have been staged successfully!");

      // Show what was staged with stats
      const finalStatus = await git.status();
      console.log("\nStaged changes:");

      // Get diff stats for staged files with color
      const diffStat = await git.diff(["--staged", "--stat", "--color"]);
      console.log(diffStat);
    } else {
      console.log("No changes to stage.");
    }
  } catch (error) {
    console.error("❌ Error staging changes:", error.message);
    process.exit(1);
  }
}
