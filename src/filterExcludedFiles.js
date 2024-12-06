import {excludedFiles} from './config.js';
import {minimatch} from 'minimatch';

export function filterExcludedFiles(diff) {
  const lines = diff.split('\n');
  let filteredLines = [];
  let skipFile = false;

  for (const line of lines) {
    // Check for diff file headers
    if (line.startsWith('diff --git')) {
      // Check if this file should be excluded
      skipFile = excludedFiles.some(excludedPattern =>
        minimatch(line, `*${excludedPattern}*`)
      );
    }

    // Only include lines if we're not skipping the current file
    if (!skipFile) {
      filteredLines.push(line);
    }
  }

  return filteredLines.join('\n');
}
