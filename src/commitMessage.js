const OpenAI = require("openai");

const openai = new OpenAI(process.env.OPENAI_API_KEY);

async function generateCommitMessage(diff) {
  try {
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
          content: `Please generate a commit message for this diff:\n\n${diff}`,
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
