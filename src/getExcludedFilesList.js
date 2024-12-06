import { excludedFiles } from './config.js';
import { git } from './git.js';
import {minimatch} from 'minimatch';

export async function getExcludedFilesList() {
  const files = await git.diff(["--name-only", "--cached"]);
  const fileList = files.trim().split("\n");

  const excludedFilesList = fileList.filter(file =>
    excludedFiles.some(pattern => minimatch(file, pattern))
  );

  return excludedFilesList;
}
