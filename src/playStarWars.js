import { spawn } from "child_process";

const DEFAULT_HOST = "towel.blinkenlights.nl";
const DEFAULT_PORT = "23";

export async function playStarWars({
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  command = "nc",
} = {}) {
  const stdinWasRaw = Boolean(process.stdin.isTTY && process.stdin.isRaw);

  console.log(
    `\nStreaming Star Wars from ${host}:${port}. Press Ctrl+C to stop.\n`,
  );

  if (stdinWasRaw) {
    // Raw mode turns Ctrl+C into a byte instead of SIGINT.
    process.stdin.setRawMode(false);
  }

  try {
    await new Promise((resolve) => {
      const stream = spawn(command, [host, String(port)], {
        stdio: "inherit",
      });

      const killStream = (signal = "SIGTERM") => {
        if (!stream.killed) {
          stream.kill(signal);
        }
      };

      const stopStream = () => {
        killStream("SIGINT");
      };

      const terminateStream = () => {
        killStream("SIGTERM");
      };

      const cleanup = () => {
        process.off("exit", terminateStream);
        process.off("SIGINT", stopStream);
        process.off("SIGTERM", terminateStream);
      };

      const finish = (code) => {
        cleanup();
        if (code !== 0 && code !== null) {
          console.log(`Star Wars stream exited with code ${code}`);
        }
        resolve();
      };

      process.once("exit", terminateStream);
      process.once("SIGINT", stopStream);
      process.once("SIGTERM", terminateStream);

      stream.on("error", (error) => {
        cleanup();
        if (error.code === "ENOENT") {
          console.log(
            "Could not start Star Wars animation: `nc` was not found.",
          );
        } else {
          console.log(`Could not start Star Wars animation: ${error.message}`);
        }
        resolve();
      });

      stream.on("close", finish);
    });
  } finally {
    if (stdinWasRaw) {
      process.stdin.setRawMode(true);
    }
  }
}
