const simpleGit = require('simple-git');

const git = simpleGit();

async function stageAllChanges() {
    try {
        // Get the status of the repository
        const status = await git.status();

        // Stage only modified files
        if (status.modified.length > 0) {
            // Add only modified files
            for (const file of status.modified) {
                await git.add(file);
            }
            console.log('✅ All modified files have been staged successfully!');

            // Show what was staged and their diffs
            const finalStatus = await git.status();
            console.log('\nStaged changes:');
            finalStatus.staged.forEach((file) => console.log(`- ${file}`));

            // Show the diff of staged changes
            const diff = await git.diff(['--staged']);
            if (diff) {
                console.log('\nDiff of staged changes:');
                console.log(diff);
            }
        } else {
            console.log('No changes to stage.');
        }
    } catch (error) {
        console.error('❌ Error staging changes:', error.message);
        process.exit(1);
    }
}

module.exports = { stageAllChanges, git };
