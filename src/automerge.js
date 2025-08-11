/**
 * Automerge Logic Module
 * Simple implementation of automerge rules and evaluation
 */

const billing = require('./billing');
const config = require('./config');

/**
 * Evaluates whether a PR should be automatically merged
 * @param {Object} pullRequest - The pull request data from GitHub
 * @param {Object} repository - The repository data from GitHub  
 * @param {Object} octokit - GitHub API client
 * @returns {Promise<Object>} - Evaluation result with shouldMerge and reason
 */
async function evaluateAutomergeRules(pullRequest, repository, octokit) {
  try {
    console.log(`Evaluating automerge rules for PR #${pullRequest.number}`);
    
    // Load repository configuration
    const repoConfig = await config.loadConfigFromGitHub(octokit, repository.owner.login, repository.name);
    
    // Get the files changed in the PR
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pullRequest.number,
    });
    
    // Check if we have a custom rule that matches
    const matchingRule = config.findMatchingRule(repoConfig, pullRequest, files);
    if (matchingRule && matchingRule.actions.autoMerge) {
      console.log(`✅ PR #${pullRequest.number} matches custom rule: ${matchingRule.name}`);
      return { shouldMerge: true, reason: matchingRule.name, rule: matchingRule };
    }
    
    // Fall back to built-in rules if no custom rules match
    return await evaluateBuiltInRules(pullRequest, repository, files, octokit);
    
  } catch (error) {
    console.error('Error evaluating automerge rules:', error);
    return { shouldMerge: false, reason: 'evaluation-error' };
  }
}

/**
 * Evaluates built-in automerge rules
 * @param {Object} pullRequest - The pull request data
 * @param {Object} repository - The repository data
 * @param {Array} files - Changed files
 * @param {Object} octokit - GitHub API client
 * @returns {Promise<Object>} - Evaluation result
 */
async function evaluateBuiltInRules(pullRequest, repository, files, octokit) {
    
    // Rule 1: Documentation-only changes
    const docFiles = files.filter(file => 
      file.filename.match(/\.(md|txt|rst|adoc)$/i) || 
      file.filename.startsWith('docs/') ||
      file.filename.startsWith('README')
    );
    
    if (files.length === docFiles.length && files.length > 0) {
      console.log(`✅ PR #${pullRequest.number} contains only documentation changes`);
      return { shouldMerge: true, reason: 'documentation-only' };
    }
    
    // Rule 2: Configuration files with low risk
    const configFiles = files.filter(file => 
      file.filename.match(/\.(yml|yaml|json|toml)$/i) ||
      file.filename.includes('config') ||
      file.filename === '.gitignore'
    );
    
    if (files.length === configFiles.length && files.length > 0) {
      // Check if changes are small (less than 50 lines total)
      const totalChanges = files.reduce((sum, file) => sum + file.changes, 0);
      if (totalChanges < 50) {
        console.log(`✅ PR #${pullRequest.number} contains only small config changes`);
        return { shouldMerge: true, reason: 'small-config-changes' };
      }
    }
    
    // Rule 3: Test-only changes from trusted authors
    const testFiles = files.filter(file => 
      file.filename.includes('test') ||
      file.filename.includes('spec') ||
      file.filename.startsWith('__tests__/')
    );
    
    if (files.length === testFiles.length && files.length > 0) {
      console.log(`✅ PR #${pullRequest.number} contains only test changes`);
      return { shouldMerge: true, reason: 'test-only' };
    }
    
    // Rule 4: Dependency updates (package.json, requirements.txt, etc.)
    const depFiles = files.filter(file => 
      file.filename.match(/(package\.json|package-lock\.json|requirements\.txt|Gemfile|go\.mod)$/i)
    );
    
    if (files.length === depFiles.length && files.length > 0) {
      // Only auto-merge if it's a minor version update
      const hasMinorUpdates = await checkForMinorVersionUpdates(files, octokit, repository.owner.login, repository.name, pullRequest.number);
      if (hasMinorUpdates) {
        console.log(`✅ PR #${pullRequest.number} contains only minor dependency updates`);
        return { shouldMerge: true, reason: 'minor-deps' };
      }
    }
    
    console.log(`❌ PR #${pullRequest.number} does not match automerge criteria`);
    return { shouldMerge: false, reason: 'no-matching-rules' };
}

/**
 * Checks if dependency updates are minor (patch/minor versions only)
 * @param {Array} files - Changed files
 * @param {Object} octokit - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} prNumber - PR number
 * @returns {Promise<boolean>}
 */
async function checkForMinorVersionUpdates(files, octokit, owner, repo, prNumber) {
  try {
    // Get the diff content for package.json files
    for (const file of files) {
      if (file.filename === 'package.json') {
        const { data: diff } = await octokit.rest.repos.getCompareCommits({
          owner,
          repo,
          base: `HEAD~1`,
          head: 'HEAD'
        });
        
        // Simple heuristic: if the diff contains major version changes (X.0.0), don't auto-merge
        const diffContent = diff.files.find(f => f.filename === 'package.json')?.patch || '';
        const majorVersionPattern = /[+-]\s*"[^"]+":\s*"[^\d]*(\d+)\.0\.0/;
        
        if (majorVersionPattern.test(diffContent)) {
          console.log('Major version update detected, skipping auto-merge');
          return false;
        }
      }
    }
    return true;
  } catch (error) {
    console.error('Error checking version updates:', error);
    return false;
  }
}

/**
 * Performs the actual auto-merge of a pull request
 * @param {Object} pullRequest - The pull request data
 * @param {Object} repository - The repository data
 * @param {Object} octokit - GitHub API client
 * @param {string} reason - Reason for auto-merge
 * @param {Object} rule - Optional rule that matched (for custom merge method)
 * @returns {Promise<boolean>} - Success status
 */
async function performAutoMerge(pullRequest, repository, octokit, reason, rule = null) {
  try {
    console.log(`Performing auto-merge for PR #${pullRequest.number} (${reason})`);
    
    // Determine merge method from rule or use default
    const mergeMethod = rule?.actions?.mergeMethod || 'squash';
    
    // First, create an approval review if needed
    if (!rule || rule.actions.autoApprove !== false) {
      await octokit.rest.pulls.createReview({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pullRequest.number,
        event: 'APPROVE',
        body: `✅ Automatically approved by Automerge Pro\n\nReason: ${reason}`
      });
      
      // Wait a moment for the review to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Then merge the PR
    const mergeResult = await octokit.rest.pulls.merge({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pullRequest.number,
      merge_method: mergeMethod,
      commit_title: `${pullRequest.title} (#${pullRequest.number})`,
      commit_message: `Automatically merged by Automerge Pro\n\nReason: ${reason}`
    });
    
    // Delete branch if configured
    if (rule?.actions?.deleteBranch !== false && pullRequest.head.repo.id === pullRequest.base.repo.id) {
      try {
        await octokit.rest.git.deleteRef({
          owner: repository.owner.login,
          repo: repository.name,
          ref: `heads/${pullRequest.head.ref}`
        });
        console.log(`🗑️ Deleted branch: ${pullRequest.head.ref}`);
      } catch (error) {
        console.log(`⚠️ Could not delete branch ${pullRequest.head.ref}: ${error.message}`);
      }
    }
    
    console.log(`✅ Successfully auto-merged PR #${pullRequest.number}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to auto-merge PR #${pullRequest.number}:`, error.message);
    return false;
  }
}

module.exports = {
  evaluateAutomergeRules,
  performAutoMerge,
  checkForMinorVersionUpdates
};