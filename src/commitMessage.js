import OpenAI from "openai";
import ora from 'ora';
import config from './config.js';
import { countTokens } from './tokenCounter.js';

const openai = new OpenAI(process.env.OPENAI_API_KEY);

function filterExcludedFiles(diff) {
  const lines = diff.split('\n');
  let filteredLines = [];
  let skipFile = false;

  for (const line of lines) {
    // Check for diff file headers
    if (line.startsWith('diff --git')) {
      // Check if this file should be excluded
      skipFile = config.excludedFiles.some(excludedFile =>
        line.includes(`/${excludedFile}`) || line.includes(` ${excludedFile}`)
      );
    }


    // Only include lines if we're not skipping the current file
    if (!skipFile) {
      filteredLines.push(line);
    }
  }

  return filteredLines.join('\n');
}

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

    spinner.succeed('Commit message generated');
    return completion.choices[0].message.content.trim();
  } catch (error) {
    spinner.fail('Failed to generate commit message');
    throw new Error(`Failed to generate commit message: ${error.message}`);
  }
}
