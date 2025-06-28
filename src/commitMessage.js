import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import ora from 'ora';
import config from './config.js';
import { countTokens } from './tokenCounter.js';
import { filterExcludedFiles } from "./filterExcludedFiles.js";


export async function generateCommitMessage(diff) {
  if (process.env.NODE_ENV === 'test') {
    return 'test: this is a test commit';
  }

  const spinner = ora('Generating commit message...').start();

  try {
    // Filter out excluded files from the diff
    const filteredDiff = filterExcludedFiles(diff);

    // If there's no content after filtering, throw an error
    if (!filteredDiff.trim()) {
      spinner.fail('No diff content remaining after filtering excluded files');
      throw new Error('No diff content remaining after filtering excluded files');
    }

    // Check token count
    const tokenCount = await countTokens(filteredDiff);
    if (tokenCount > config.maxDiffTokens) {
      spinner.fail(`Diff is too large (${tokenCount} tokens). Maximum allowed is ${config.maxDiffTokens} tokens`);
      throw new Error(`Diff exceeds maximum token limit of ${config.maxDiffTokens}`);
    }

    let response;

    if (config.defaultModel === 'openai') {
      const openai = new OpenAI(process.env.OPENAI_API_KEY);
      const completion = await openai.chat.completions.create({
        model: config.models.openai.name,
        messages: [
          {
            role: "system",
            content: config.systemMessage,
          },
          {
            role: "user",
            content: `Please generate a commit message for this diff:\n\n${filteredDiff}`,
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
        model: config.models.anthropic.name,
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `${config.systemMessage}\n\nPlease generate a commit message for this diff:\n\n${filteredDiff}`,
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
