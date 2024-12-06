const { stageAllChanges, git, countTokens, modelName } = require('./src');

async function main() {
    await stageAllChanges();

    try {
        // Get the diff again to count tokens
        const diff = await git.diff(['--staged']);
        if (diff) {
            const tokenCount = await countTokens(diff);
            console.log(`\nThis diff would use approximately ${tokenCount} tokens with ${modelName}`);
        }
    } catch (error) {
        console.error('❌ Error counting tokens:', error.message);
    }
}

main();
