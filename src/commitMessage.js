import OpenAI from "openai";
import ora from 'ora';
import config from './config.js';
import { countTokens } from './tokenCounter.js';
import { git } from './git.js';

const MAX_COMMIT_MESSAGE_LENGTH = 100;
const MAX_VALIDATION_RETRIES = 3;
const scopedTypePattern = /^[a-zA-Z]+\([^)]*\)(?:!)?:/;

class CommitMessageValidationError extends Error {
  constructor(message, failedAttempts) {
    super(message);
    this.name = "CommitMessageValidationError";
    this.failedAttempts = failedAttempts;
  }
}

function extractResponseText(resp) {
  let responseText = (resp.output_text ?? "").trim();
  if (!responseText && Array.isArray(resp.output)) {
    const textPart = resp.output.find((part) => part?.type === "output_text");
    if (textPart) {
      responseText = (textPart.text ?? textPart?.content?.[0]?.text ?? "").trim();
    }
  }
  return responseText;
}

function logRawResponse(label, payload) {
  try {
    console.error(`\n[git-ai] Responses API raw response (${label}):\n` + JSON.stringify(payload, null, 2));
  } catch (_) {
    console.error(`\n[git-ai] Responses API raw response (${label}, could not stringify)`, payload);
  }
}

function ensureResponseText(resp, label) {
  const text = extractResponseText(resp);
  if (!text) {
    logRawResponse(label, resp);
    throw new Error(`Empty response from Responses API${label ? ` (${label})` : ""}`);
  }
  return text.trim();
}

function detectCommitMessageIssue(message) {
  if (message.length > MAX_COMMIT_MESSAGE_LENGTH) {
    return { type: "length", length: message.length };
  }

  if (scopedTypePattern.test(message)) {
    return { type: "scope" };
  }

  return null;
}

async function enforceCommitMessageConstraints({ initialMessage, promptMessage, openai }) {
  let attempt = initialMessage.trim();
  let retries = 0;
  const failedAttempts = [];

  while (true) {
    const issue = detectCommitMessageIssue(attempt);
    if (!issue) {
      return attempt;
    }

    failedAttempts.push({
      attemptNumber: failedAttempts.length + 1,
      issue: issue.type,
      detail: issue.type === "length" ? `${issue.length} chars` : "scope detected",
      message: attempt,
    });

    if (retries >= MAX_VALIDATION_RETRIES) {
      throw new CommitMessageValidationError(
        "Failed to generate a valid commit message after multiple retries",
        failedAttempts,
      );
    }

    retries += 1;
    let retryInstruction;
    let label;

    if (issue.type === "length") {
      console.warn(`[git-ai] Attempt ${retries} is ${issue.length} chars (>100). Retrying with stricter length guidance...`);
      retryInstruction = `${config.systemMessage}\n\nIMPORTANT: The previous suggestion was ${issue.length} characters, which is too long. Regenerate a single-line conventional commit message strictly under 100 characters, preserving intent, without scope and without quotes.\n\n${promptMessage}\n\nPrevious suggestion (too long):\n${attempt}`;
      label = `retry-length-${retries}`;
    } else if (issue.type === "scope") {
      console.warn(`[git-ai] Attempt ${retries} improperly used a commit scope. Retrying without scope...`);
      retryInstruction = `${config.systemMessage}\n\nvoile de silencer un message, c'était pas bon, fais moi le nouveau. The previous suggestion incorrectly used a scope like "type(scope):". Regenerate a single-line conventional commit message without any scope/parentheses after the type and under 100 characters.\n\n${promptMessage}\n\nPrevious suggestion (invalid scope):\n${attempt}`;
      label = `retry-scope-${retries}`;
    } else {
      throw new Error(`Unsupported commit validation issue: ${issue.type}`);
    }

    const resp = await openai.responses.create({
      model: config.modelName,
      input: retryInstruction,
      reasoning: { effort: config.reasoningEffort },
    });

    attempt = ensureResponseText(resp, label);
  }
}

export async function generateCommitMessage(diff) {
  if (process.env.NODE_ENV === 'test') {
    return "test: this is a test commit";
  }

  const spinner = ora("Generating commit message...").start();

  try {
    // The diff passed in is already filtered.
    const filteredDiff = diff;

    // If there's no content after filtering, throw an error
    if (!filteredDiff.trim()) {
      spinner.fail("No diff content remaining after filtering excluded files");
      throw new Error("No diff content remaining after filtering excluded files");
    }

    // Check token count
    const tokenCount = await countTokens(filteredDiff);
    let promptMessage;

    if (tokenCount > config.maxDiffTokens) {
      spinner.warn(`Diff is too large (${tokenCount} tokens). Maximum allowed is ${config.maxDiffTokens}. Using file names only.`);
      const diffSummary = await git.diff(["--name-status", "--staged"]);
      const summaryContent = `The diff is too large to be displayed. Here is a summary of the changed files:\n\n${diffSummary}`;
      promptMessage = `Please generate a commit message for these changes:\n\n${summaryContent}`;

      // Recalculate token count for the summary and log the correction
      const newTokenCount = await countTokens(promptMessage);
      if (newTokenCount !== null) {
        const cost = (newTokenCount / 1_000_000) * config.pricePerMillionTokens;
        console.log(
          `\n\x1b[90mCorrected - Input request: \x1b[33m${newTokenCount}\x1b[90m tokens to ${config.modelName}` +
          `\n\x1b[90mCorrected - Estimated cost: \x1b[33m$${cost.toFixed(6)}\x1b[0m \x1b[90m($${config.pricePerMillionTokens}/M)\x1b[0m`
        );
      }
    } else {
      promptMessage = `Please generate a commit message for this diff:\n\n${filteredDiff}`;
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const instruction = `${config.systemMessage}\n\n${promptMessage}`;
    let resp = await openai.responses.create({
      model: config.modelName,
      input: instruction,
      reasoning: { effort: config.reasoningEffort },
    });

    let response = ensureResponseText(resp, "initial");
    response = await enforceCommitMessageConstraints({ initialMessage: response, promptMessage, openai });

    spinner.succeed('Generated commit message:');
    return response.trim();
  } catch (error) {
    if (error.failedAttempts?.length) {
      const formattedAttempts = error.failedAttempts
        .map(({ attemptNumber, issue, detail, message }) => {
          const issueInfo = detail ? `${issue} (${detail})` : issue;
          return `Attempt ${attemptNumber} [${issueInfo}]:\n${message}`;
        })
        .join("\n---\n");

      console.error(`\n[git-ai] Commit message validation attempts (all rejected):\n${formattedAttempts}`);
    }

    try {
      const details = {
        status: error?.status,
        code: error?.code,
        type: error?.type,
        message: error?.message,
        headers: error?.headers,
        request_id: error?.request_id,
        error: error?.error,
      };
      console.error("\n[git-ai] OpenAI Responses API error details:\n" + JSON.stringify(details, null, 2));
      // As a last resort, dump the whole error object too
      console.error("\n[git-ai] OpenAI Responses API raw error:\n" + JSON.stringify(error, null, 2));
    } catch (_) {
      console.error("\n[git-ai] OpenAI Responses API error (non-serializable):", error);
    }
    spinner.fail(`Failed to generate commit message: ${error.message}`);
    throw new Error(`Failed to generate commit message: ${error.message}`);
  }
}
