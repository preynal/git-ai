import { excludedFiles } from "./config.js";
import { minimatch } from "minimatch";

export function filterExcludedFiles(diff) {
  const lines = diff.split("\n");
  let filteredLines = [];
  let skipFile = false;

  for (const line of lines) {
    // Check for diff file headers that look like: diff --git a/path/to/file b/path/to/file
    if (line.startsWith("diff --git")) {
      // Extract the file path from the diff header
      const parts = line.split(" ");
      const filePath = parts[parts.length - 1].substring(2); // Remove 'b/' prefix

      // Check if this file should be excluded
      skipFile = excludedFiles.some((excludedPattern) =>
        minimatch(filePath, excludedPattern)
      );

      // If we're not skipping this file, include the header
      if (!skipFile) {
        filteredLines.push(line);
      }
      continue;
    }

    // Only include lines if we're not skipping the current file
    if (!skipFile) {
      filteredLines.push(line);
    }
  }

  return filteredLines.join("\n");
}
