const simpleGit = require('simple-git');
const git = simpleGit();

async function stageAllChanges() {
    try {
        // Get the status of the repository
        const status = await git.status();
        
        // Stage all modified, new, and deleted files
        if (status.modified.length > 0 || 
            status.not_added.length > 0 || 
            status.deleted.length > 0) {
            
            await git.add('.');
            console.log('✅ All changes have been staged successfully!');
            
            // Show what was staged
            const finalStatus = await git.status();
            console.log('\nStaged changes:');
            finalStatus.staged.forEach(file => console.log(`- ${file}`));
        } else {
            console.log('No changes to stage.');
        }
    } catch (error) {
        console.error('❌ Error staging changes:', error.message);
        process.exit(1);
    }
}

stageAllChanges();
