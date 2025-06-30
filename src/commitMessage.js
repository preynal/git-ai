import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import ora from 'ora';
import config from './config.js';
import { countTokens } from './tokenCounter.js';
import { git } from './git.js';


export async function generateCommitMessage(diff) {
  if (process.env.NODE_ENV === 'test') {
    return 'test: this is a test commit';
  }

  const spinner = ora('Generating commit message...').start();

  try {
    // The diff passed in is already filtered.
    const filteredDiff = diff;

    // If there's no content after filtering, throw an error
    if (!filteredDiff.trim()) {
      spinner.fail('No diff content remaining after filtering excluded files');
      throw new Error('No diff content remaining after filtering excluded files');
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
        const modelConfig = config.models[config.defaultModel];
        const cost = (newTokenCount / 1_000_000) * modelConfig.pricePerMillionTokens;
        console.log(
          `\n\x1b[90mCorrected - Input request: \x1b[33m${newTokenCount}\x1b[90m tokens to ${modelConfig.name}` +
          `\n\x1b[90mCorrected - Estimated cost: \x1b[33m$${cost.toFixed(6)}\x1b[0m \x1b[90m($${modelConfig.pricePerMillionTokens}/M)\x1b[0m`
        );
      }
    } else {
      promptMessage = `Please generate a commit message for this diff:\n\n${filteredDiff}`;
    }

    let response;
    const modelConfig = config.models[config.defaultModel];

    if (config.defaultModel === 'openai') {
      const openai = new OpenAI(process.env.OPENAI_API_KEY);
      const completion = await openai.chat.completions.create({
        model: modelConfig.name,
        messages: [
          {
            role: "system",
            content: config.systemMessage,
          },
          {
            role: "user",
            content: promptMessage,
          },
        ],
        max_tokens: 100,
      });
      response = completion.choices[0].message.content.trim();
    } else {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      const completion = await anthropic.messages.create({
        model: modelConfig.name,
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `${config.systemMessage}\n\n${promptMessage}`,
          }
        ],
      });
      response = completion.content[0].text.trim();
    }

    spinner.succeed('Generated commit message:');
    return response;
  } catch (error) {
    spinner.fail('Failed to generate commit message');
    throw new Error(`Failed to generate commit message: ${error.message}`);
  }
}
