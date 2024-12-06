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
git clone [repository-url]
cd [repository-name]
```

2. Install dependencies:
```bash
yarn install
# or
npm install
```

3. Configure OpenAI API key:
Create a `.env` file in the root directory:
```
OPENAI_API_KEY=your-api-key
```

## Usage

1. Stage your changes using git:
```bash
git add .
# or stage specific files
git add file1.js file2.js
```

2. Generate commit message:
```bash
yarn start
# or
npm start
```

## Configuration

The tool can be configured through `src/config.js`:

- `excludedFiles`: Array of files to exclude from the diff analysis
- `pricePerMillionTokens`: OpenAI API pricing configuration
- `modelName`: GPT model to use
- `systemMessage`: Custom prompt for the AI

## Requirements

- Node.js 16 or higher
- Git
- OpenAI API key

## License

MIT
