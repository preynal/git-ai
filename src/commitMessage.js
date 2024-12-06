import OpenAI from "openai";
import ora from 'ora';
import config from './config.js';
import { countTokens } from './tokenCounter.js';
import { filterExcludedFiles } from "./filterExcludedFiles.js";


export async function generateCommitMessage(diff) {
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

    const openai = new OpenAI(process.env.OPENAI_API_KEY);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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

    spinner.succeed('Generated commit message:');
    return completion.choices[0].message.content.trim();
  } catch (error) {
    spinner.fail('Failed to generate commit message');
    throw new Error(`Failed to generate commit message: ${error.message}`);
  }
}
