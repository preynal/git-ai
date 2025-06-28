import { describe, test, expect, beforeEach, afterEach } from "vitest"
import { execSync } from "child_process"
import fs from "fs-extra"
import path from "path"

const TEST_DIR = path.resolve("tests/repos/test-repo")
const REMOTE_DIR = path.resolve("tests/repos/test-repo-remote")
const TEMP_DIR = path.resolve("tests/repos/test-repo-temp")
const GIT_AI_CLI = path.resolve("git-ai.js")

// Helper to run commands in the test repo
const runInTestRepo = (command) => {
  return execSync(command, { cwd: TEST_DIR, encoding: "utf-8" })
}

// Helper to run commands in the temp repo
const runInTempRepo = (command) => {
  return execSync(command, { cwd: TEMP_DIR, encoding: "utf-8" })
}

// Helper to run commands in the remote repo
const runInRemoteRepo = (command) => {
  return execSync(command, { cwd: REMOTE_DIR, encoding: "utf-8" })
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
    if (fs.existsSync(TEMP_DIR)) {
      fs.removeSync(TEMP_DIR)
    }
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

  test("should handle remote changes by pulling first, then committing and pushing", () => {
    // 1. Create changes in remote repo by using a temporary clone
    execSync(`git clone ${REMOTE_DIR} ${TEMP_DIR}`, { encoding: "utf-8" })
    runInTempRepo('git config user.email "test@example.com"')
    runInTempRepo('git config user.name "Test User"')
    fs.writeFileSync(path.join(TEMP_DIR, "remote-file.txt"), "remote change")
    runInTempRepo("git add .")
    runInTempRepo('git commit -m "remote commit"')
    runInTempRepo("git push")

    // 2. Create local changes in the main test repo
    fs.writeFileSync(path.join(TEST_DIR, "local-file.txt"), "local change")

    // 3. Run git-ai with --push flag. It should pull remote changes first, then commit local changes and push.
    const output = execSync(`node ${GIT_AI_CLI} --push`, {
      cwd: TEST_DIR,
      encoding: "utf-8",
    })

    // 4. Verify a new commit was created with the correct mocked message
    const log = runInTestRepo("git log -1 --pretty=%B")
    expect(log.trim()).toBe("test: this is a test commit")

    // 5. Verify it attempted to push
    expect(output).toContain("Running git push...")

    // 6. Verify both local and remote files exist (merge was successful)
    expect(fs.existsSync(path.join(TEST_DIR, "local-file.txt"))).toBe(true)
    expect(fs.existsSync(path.join(TEST_DIR, "remote-file.txt"))).toBe(true)

    // 7. Verify the push was successful by checking the remote's log shows our commit
    const remoteLog = execSync("git log -1 --pretty=%B", {
      cwd: REMOTE_DIR,
      encoding: "utf-8",
    })
    expect(remoteLog.trim()).toBe("test: this is a test commit")
  })

  test.skip("should handle merge conflicts when pulling remote changes", () => {
    // 1. Create conflicting changes in remote repo by using a temporary clone
    execSync(`git clone ${REMOTE_DIR} ${TEMP_DIR}`, { encoding: "utf-8" })
    runInTempRepo('git config user.email "tes2t@example.com"')
    runInTempRepo('git config user.name "Test User 2"')
    // Modify the same file with conflicting content
    fs.writeFileSync(path.join(TEMP_DIR, "README.md"), "# Test Repo - Remote \n\nRemote change " + Date.now())
    runInTempRepo("git add .")
    runInTempRepo('git commit -m "remote conflicting commit"')
    runInTempRepo("git push")
    const log = runInTempRepo("git log --oneline")
    console.log("Temp logs:", log)

    const remoteLogs = runInRemoteRepo("git log --oneline")
    console.log("Remote logs:", remoteLogs)

    // 2. Create local conflicting changes in the main test repo
    fs.writeFileSync(path.join(TEST_DIR, "README.md"), "# Test Repo - Local\n\nLocal change " + Date.now())

    // 3. Run git-ai with --push flag. It should attempt to pull but encounter a conflict.
    console.log("Running git-ai with --push...")

    execSync(`node ${GIT_AI_CLI} --push`, {
      cwd: TEST_DIR,
      encoding: "utf-8",
    })

    // Log current status, diff, and log head before proceeding
    console.log("Current git status:")
    console.log(runInTestRepo("git status"))
    console.log("Current git diff:")
    console.log(runInTestRepo("git diff"))
    console.log("Current git logs head:")
    console.log(runInTestRepo("git log --oneline"))

    // 4. Verify the repository is in a conflicted state
    const status = runInTestRepo("git status --porcelain")
    expect(status).toContain("UU README.md")

    // 5. Verify the README.md file contains conflict markers
    const readmeContent = fs.readFileSync(path.join(TEST_DIR, "README.md"), "utf-8")
    expect(readmeContent).toContain("<<<<<<< HEAD")
    expect(readmeContent).toContain("=======")
    expect(readmeContent).toContain(">>>>>>> ")
    expect(readmeContent).toContain("Local change")
    expect(readmeContent).toContain("Remote change")
  })
})
