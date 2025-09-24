import OpenAI from "openai";
import ora from 'ora';
import config from './config.js';
import { countTokens } from './tokenCounter.js';
import { git } from './git.js';

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

    // Prefer the helper output_text; fallback to scanning structured output for 'output_text'
    let response = (resp.output_text ?? "").trim();
    if (!response && Array.isArray(resp.output)) {
      const textPart = resp.output.find(p => p?.type === 'output_text');
      if (textPart) {
        response = (textPart.text ?? textPart?.content?.[0]?.text ?? "").trim();
      }
    }

    if (!response) {
      try {
        console.error("\n[git-ai] Responses API raw response (empty output):\n" + JSON.stringify(resp, null, 2));
      } catch (_) {
        console.error("\n[git-ai] Responses API raw response (could not stringify)", resp);
      }
      throw new Error("Empty response from Responses API");
    }
    // If response is longer than ~100 chars, retry once with stricter instruction
    if (response.length > 100) {
      console.warn(`[git-ai] First attempt is ${response.length} chars (>100). Retrying with stricter length guidance...`);
      const retryInstruction = `${config.systemMessage}\n\nIMPORTANT: The previous suggestion was ${response.length} characters, which is too long. Regenerate a single-line conventional commit message strictly under 100 characters, preserving intent, without scope and without quotes.\n\n${promptMessage}\n\nPrevious suggestion (too long):\n${response}`;
      const resp2 = await openai.responses.create({
        model: config.modelName,
        input: retryInstruction,
        reasoning: { effort: config.reasoningEffort },
      });
      let response2 = (resp2.output_text ?? "").trim();
      if (!response2 && Array.isArray(resp2.output)) {
        const textPart2 = resp2.output.find(p => p?.type === 'output_text');
        if (textPart2) {
          response2 = (textPart2.text ?? textPart2?.content?.[0]?.text ?? "").trim();
        }
      }

      if (!response2) {
        try {
          console.error("\n[git-ai] Responses API raw response (empty output on retry):\n" + JSON.stringify(resp2, null, 2));
        } catch (_) {
          console.error("\n[git-ai] Responses API raw response (could not stringify on retry)", resp2);
        }
        throw new Error("Empty response from Responses API (retry)");
      }
      response = response2;
    }

    spinner.succeed('Generated commit message:');
    return response.trim();
  } catch (error) {
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
