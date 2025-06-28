import { describe, test, expect, beforeEach, afterEach } from "vitest"
import { execSync } from "child_process"
import fs from "fs-extra"
import path from "path"

const TEST_DIR = path.resolve("test-repo")
const REMOTE_DIR = path.resolve("test-repo-remote")
const GIT_AI_CLI = path.resolve("git-ai.js")

// Helper to run commands in the test repo
const runInTestRepo = (command) => {
  return execSync(command, { cwd: TEST_DIR, encoding: "utf-8" })
}

describe("git-ai e2e tests", () => {
  beforeEach(() => {
    // Setup a clean git repository for each test
    fs.ensureDirSync(TEST_DIR)
    // Setup a bare repo to act as a remote
    fs.ensureDirSync(REMOTE_DIR)
    execSync("git init --bare", { cwd: REMOTE_DIR, encoding: "utf-8" })

    runInTestRepo("git init -b main")
    runInTestRepo('git config user.email "test@example.com"')
    runInTestRepo('git config user.name "Test User"')
    runInTestRepo(`git remote add origin ${REMOTE_DIR}`)
    fs.writeFileSync(path.join(TEST_DIR, "README.md"), "# Test Repo")
    runInTestRepo("git add .")
    runInTestRepo('git commit -m "initial commit"')
    runInTestRepo("git push -u origin main")
  })

  afterEach(() => {
    // Cleanup the test repositories
    fs.removeSync(TEST_DIR)
    fs.removeSync(REMOTE_DIR)
  })

  test("should create a commit with a mocked AI message and push", () => {
    // 1. Create a change
    fs.writeFileSync(path.join(TEST_DIR, "new-file.txt"), "hello world")

    // 2. Run git-ai with --push flag. It should stage changes, commit, and push.
    // The `test` script in package.json sets NODE_ENV=test for us.
    const output = execSync(`node ${GIT_AI_CLI} --push`, {
      cwd: TEST_DIR,
      encoding: "utf-8",
    })

    // 3. Verify a new commit was created with the correct mocked message
    const log = runInTestRepo("git log -1 --pretty=%B")
    expect(log.trim()).toBe("test: this is a test commit")

    // 4. Verify it attempted to push
    expect(output).toContain("Running git push...")

    // 5. Verify the push was successful by checking the remote's log
    const remoteLog = execSync("git log -1 --pretty=%B", {
      cwd: REMOTE_DIR,
      encoding: "utf-8",
    })
    expect(remoteLog.trim()).toBe("test: this is a test commit")
  })
})
