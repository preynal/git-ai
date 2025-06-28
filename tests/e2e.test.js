import { describe, test, expect, beforeEach, afterEach } from "vitest"
import { execSync } from "child_process"
import fs from "fs-extra"
import path from "path"

const TEST_DIR = path.resolve("test-repo")
const GIT_AI_CLI = path.resolve("git-ai.js")

// Helper to run commands in the test repo
const runInTestRepo = (command) => {
  return execSync(command, { cwd: TEST_DIR, encoding: "utf-8" })
}

describe("git-ai e2e tests", () => {
  beforeEach(() => {
    // Setup a clean git repository for each test
    fs.ensureDirSync(TEST_DIR)
    runInTestRepo("git init -b main")
    runInTestRepo('git config user.email "test@example.com"')
    runInTestRepo('git config user.name "Test User"')
    fs.writeFileSync(path.join(TEST_DIR, "README.md"), "# Test Repo")
    runInTestRepo("git add .")
    runInTestRepo('git commit -m "initial commit"')
  })

  afterEach(() => {
    // Cleanup the test repository
    fs.removeSync(TEST_DIR)
  })

  test("should create a commit with a mocked AI message using --push flag", () => {
    // 1. Create a change
    fs.writeFileSync(path.join(TEST_DIR, "new-file.txt"), "hello world")

    // 2. Run git-ai with --push flag. It should stage changes and commit.
    // The `test` script in package.json sets NODE_ENV=test for us.
    const output = execSync(`node ${GIT_AI_CLI} --push`, {
      cwd: TEST_DIR,
      encoding: "utf-8",
    })

    // 3. Verify a new commit was created with the correct mocked message
    const log = runInTestRepo("git log -1 --pretty=%B")
    expect(log.trim()).toBe("test: this is a test commit")

    // 4. Verify it skipped the push because no remote is configured
    expect(output).toContain("No remote configured. Skipping git push.")
  })
})
