import { spawn } from "child_process";

const DEFAULT_HOST = "towel.blinkenlights.nl";
const DEFAULT_PORT = "23";

export async function playStarWars({
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  command = "nc",
} = {}) {
  console.log(
    `\nStreaming Star Wars from ${host}:${port}. Press Ctrl+C to stop.\n`,
  );

  await new Promise((resolve) => {
    const stream = spawn(command, [host, String(port)], {
      stdio: "inherit",
    });

    const cleanup = () => {
      process.off("exit", killStream);
      process.off("SIGTERM", killStream);
    };

    const finish = (code) => {
      cleanup();
      if (code !== 0 && code !== null) {
        console.log(`Star Wars stream exited with code ${code}`);
      }
      resolve();
    };

    const killStream = () => {
      if (!stream.killed) {
        stream.kill();
      }
    };

    process.once("exit", killStream);
    process.once("SIGTERM", killStream);

    stream.on("error", (error) => {
      cleanup();
      if (error.code === "ENOENT") {
        console.log("Could not start Star Wars animation: `nc` was not found.");
      } else {
        console.log(`Could not start Star Wars animation: ${error.message}`);
      }
      resolve();
    });

    stream.on("close", finish);
  });
}
