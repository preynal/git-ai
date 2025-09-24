# `git ai`

Stage all changes and generate a commit message using OpenAI gpt-5 with one command.

What it does:
```bash
git add . && git diff --staged | english | git commit -F -
```

## Features

- Generates clear and concise commit messages following conventional commits format
- Automatically analyzes staged git changes
- Configurable file exclusions
- Token counting and cost estimation

## Installation

1. Clone the repository:
```bash
git clone https://github.com/preynal/git-ai
cd ./git-ai
```

2. Install dependencies:
```bash
yarn
# or
npm install
```

3. Configure OpenAI API key:
Create a `.env` file in the root directory:
```
OPENAI_API_KEY=your-api-key
```

## Recommended Usage

Add a `git ai` alias to your `~/.gitconfig` file:

``` file=.gitconfig
[alias]
	ai = "!node <PATH_TO_CLONED_DIR>/git-ai.js"
```

Then in any git reposoritory, you can run:
```
git ai
```

It will add all changes to the staging area, generate a commit message, and you can approve it by pressing Enter.

## Configuration

The tool can be configured through `src/config.js`:

- `systemMessage`: Custom prompt for the AI
- `excludedFiles`: Array of files to exclude from the diff analysis
- `modelName`: GPT model to use (default: `gpt-5`)
- `pricePerMillionTokens`: pricing used for local cost estimation

## Requirements

- Tested on Node.js 22 LTS
- Git
- OpenAI API key

## License

MIT
