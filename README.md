# AI Git Commit Message Generator

A CLI tool that uses OpenAI's GPT models to automatically generate meaningful and conventional commit messages based on your staged changes.

## Features

- Generates clear and concise commit messages following conventional commits format
- Automatically analyzes staged git changes
- Configurable file exclusions
- Token counting and cost estimation
- Uses GPT-4 for intelligent commit message generation

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

- `excludedFiles`: Array of files to exclude from the diff analysis
- `pricePerMillionTokens`: OpenAI API pricing configuration
- `modelName`: GPT model to use
- `systemMessage`: Custom prompt for the AI

## Requirements

- Tested on Node.js 22 LTS
- Git
- OpenAI API key

## License

MIT
