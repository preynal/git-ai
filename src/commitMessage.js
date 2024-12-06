const OpenAI = require("openai");
const { excludedFiles } = require('./config');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

function filterExcludedFiles(diff) {
  const lines = diff.split('\n');
  let filteredLines = [];
  let skipFile = false;

  for (const line of lines) {
    // Check for diff file headers
    if (line.startsWith('diff --git')) {
      // Check if this file should be excluded
      skipFile = excludedFiles.some(excludedFile => 
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

async function generateCommitMessage(diff) {
  try {
    // Filter out excluded files from the diff
    const filteredDiff = filterExcludedFiles(diff);

    // If there's no content after filtering, throw an error
    if (!filteredDiff.trim()) {
      throw new Error('No diff content remaining after filtering excluded files');
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that generates clear and concise git commit messages. Follow conventional commits format.",
        },
        {
          role: "user",
          content: `Please generate a commit message for this diff:\n\n${filteredDiff}`,
        },
      ],
      max_tokens: 100,
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    throw new Error(`Failed to generate commit message: ${error.message}`);
  }
}

module.exports = { generateCommitMessage };
