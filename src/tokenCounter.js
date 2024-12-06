const { encoding_for_model } = require('tiktoken');

const modelName = "gpt-4o-mini";

async function countTokens(text) {
    const enc = encoding_for_model(modelName);
    const tokens = enc.encode(text);
    enc.free(); // Free up memory
    return tokens.length;
}

module.exports = { countTokens, modelName };
