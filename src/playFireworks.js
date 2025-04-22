import fs from "fs";
import path from "path";

export async function playFireworks(
  folderName = "fireworks",
  loops = 1,
  baseDir,
) {
  const __dirname = baseDir || path.join(process.cwd(), "node_modules/firew0rks");

  const folderPath = path.join(__dirname, folderName);

  if (!fs.existsSync(folderPath)) {
    console.log(folderName + " could not be found");
    return;
  }

  const textFiles = [];
  let numFound = 0;
  let filesExist = true;

  while (filesExist) {
    const fileName = path.join(folderPath, numFound + ".txt");

    if (fs.existsSync(fileName)) {
      textFiles.push(fs.readFileSync(fileName, "utf8"));
      numFound++;
    } else {
      filesExist = false;
    }
  }

  if (textFiles.length === 0) {
    console.log(folderName + " did not have text art files");
    return;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  let i = 0;
  let first = true;
  // Calculate number of lines to move up based on first frame
  const backspaceAdjust = "\x1b[A".repeat(textFiles[0].split("\n").length + 1);

  while (i < loops || loops === -1) {
    for (const frame of textFiles) {
      if (!first) {
        process.stdout.write(backspaceAdjust);
      }

      process.stdout.write(frame + "\n");

      first = false;
      await sleep(50); // 0.05 seconds
    }
    i++;
  }

  // Clear the screen after animation completes
  process.stdout.write("\x1b[2J\x1b[0f");
}
