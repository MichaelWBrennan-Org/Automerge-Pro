/**
 * Automerge Logic Module
 * Simple implementation of automerge rules and evaluation
 */

const billing = require('./billing');
const config = require('./config');
const { analyzeNextFilesPullRequest } = require('../apps/backend/src/services/ai-analyzer');

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
    
    // First check GitHub-specific requirements
    const githubChecks = await checkGitHubRequirements(pullRequest, repository, octokit);
    if (!githubChecks.passed) {
      return { shouldMerge: false, reason: githubChecks.reason };
    }
    
    // Load repository configuration
    const repoConfig = await config.loadConfigFromGitHub(octokit, repository.owner.login, repository.name);
    
    // Get the files changed in the PR
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pullRequest.number,
    });
    
    // Perform AI analysis if enabled
    let aiAnalysis = null;
    if (process.env.OPENAI_API_KEY && repoConfig?.settings?.aiAnalysis !== false) {
      try {
        console.log(`🤖 Running AI analysis for PR #${pullRequest.number}`);
        aiAnalysis = await analyzeNextFilesPullRequest({
          title: pullRequest.title,
          body: pullRequest.body || '',
          files: files.map(file => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            patch: file.patch || ''
          })),
          author: pullRequest.user.login,
          baseBranch: pullRequest.base.ref,
          headBranch: pullRequest.head.ref
        });
        
        console.log(`🤖 AI Analysis - Risk Score: ${aiAnalysis.riskScore}, Auto-approve: ${aiAnalysis.autoApprovalRecommended}`);
        
        // If AI recommends against auto-merge, respect that
        if (!aiAnalysis.autoApprovalRecommended && aiAnalysis.riskScore > 0.7) {
          return { 
            shouldMerge: false, 
            reason: `AI analysis: ${aiAnalysis.summary}`, 
            aiAnalysis 
          };
        }
      } catch (error) {
        console.error('AI analysis failed, falling back to rule-based evaluation:', error);
      }
    }
    
    // Check if we have a custom rule that matches
    const matchingRule = config.findMatchingRule(repoConfig, pullRequest, files);
    if (matchingRule && matchingRule.actions.autoMerge) {
      console.log(`✅ PR #${pullRequest.number} matches custom rule: ${matchingRule.name}`);
      return { shouldMerge: true, reason: matchingRule.name, rule: matchingRule, aiAnalysis };
    }
    
    // Fall back to built-in rules if no custom rules match
    const result = await evaluateBuiltInRules(pullRequest, repository, files, octokit);
    result.aiAnalysis = aiAnalysis;
    return result;
    
  } catch (error) {
    console.error('Error evaluating automerge rules:', error);
    return { shouldMerge: false, reason: 'evaluation-error' };
  }
}

/**
 * Checks GitHub-specific requirements before allowing automerge
 * @param {Object} pullRequest - The pull request data
 * @param {Object} repository - The repository data
 * @param {Object} octokit - GitHub API client
 * @returns {Promise<Object>} - Check result
 */
async function checkGitHubRequirements(pullRequest, repository, octokit) {
  try {
    // Check if PR is mergeable
    if (pullRequest.mergeable === false) {
      return { passed: false, reason: 'PR has merge conflicts' };
    }
    
    // Check if PR is in a mergeable state
    if (pullRequest.state !== 'open') {
      return { passed: false, reason: 'PR is not open' };
    }
    
    // Check branch protection rules
    const branchProtection = await checkBranchProtection(pullRequest, repository, octokit);
    if (!branchProtection.passed) {
      return { passed: false, reason: branchProtection.reason };
    }
    
    // Check required status checks
    const statusChecks = await checkStatusChecks(pullRequest, repository, octokit);
    if (!statusChecks.passed) {
      return { passed: false, reason: statusChecks.reason };
    }
    
    // Check required reviews
    const reviews = await checkRequiredReviews(pullRequest, repository, octokit);
    if (!reviews.passed) {
      return { passed: false, reason: reviews.reason };
    }
    
    return { passed: true };
    
  } catch (error) {
    console.error('Error checking GitHub requirements:', error);
    return { passed: false, reason: 'Error checking requirements' };
  }
}

/**
 * Checks branch protection rules
 * @param {Object} pullRequest - The pull request data
 * @param {Object} repository - The repository data
 * @param {Object} octokit - GitHub API client
 * @returns {Promise<Object>} - Check result
 */
async function checkBranchProtection(pullRequest, repository, octokit) {
  try {
    const { data: protection } = await octokit.rest.repos.getBranchProtection({
      owner: repository.owner.login,
      repo: repository.name,
      branch: pullRequest.base.ref
    });
    
    // If no branch protection, allow merge
    if (!protection) {
      return { passed: true };
    }
    
    // Check if branch protection allows automerge
    if (protection.required_status_checks && protection.required_status_checks.strict) {
      // Strict status checks require the head branch to be up to date
      const { data: comparison } = await octokit.rest.repos.compareCommits({
        owner: repository.owner.login,
        repo: repository.name,
        base: pullRequest.base.sha,
        head: pullRequest.head.sha
      });
      
      if (comparison.behind_by > 0) {
        return { passed: false, reason: 'Branch is behind base branch' };
      }
    }
    
    return { passed: true };
    
  } catch (error) {
    // If branch protection check fails, assume it's allowed
    console.log('Branch protection check failed, allowing merge:', error.message);
    return { passed: true };
  }
}

/**
 * Checks required status checks
 * @param {Object} pullRequest - The pull request data
 * @param {Object} repository - The repository data
 * @param {Object} octokit - GitHub API client
 * @returns {Promise<Object>} - Check result
 */
async function checkStatusChecks(pullRequest, repository, octokit) {
  try {
    const { data: checks } = await octokit.rest.checks.listForRef({
      owner: repository.owner.login,
      repo: repository.name,
      ref: pullRequest.head.sha
    });
    
    // Check if all required checks are passing
    const requiredChecks = checks.check_runs.filter(check => 
      check.status === 'completed' && 
      check.conclusion !== 'success' && 
      check.conclusion !== 'skipped'
    );
    
    if (requiredChecks.length > 0) {
      const failedChecks = requiredChecks.filter(check => check.conclusion === 'failure');
      if (failedChecks.length > 0) {
        return { 
          passed: false, 
          reason: `Required checks failed: ${failedChecks.map(c => c.name).join(', ')}` 
        };
      }
      
      const pendingChecks = requiredChecks.filter(check => check.status !== 'completed');
      if (pendingChecks.length > 0) {
        return { 
          passed: false, 
          reason: `Required checks pending: ${pendingChecks.map(c => c.name).join(', ')}` 
        };
      }
    }
    
    return { passed: true };
    
  } catch (error) {
    console.log('Status checks check failed, allowing merge:', error.message);
    return { passed: true };
  }
}

/**
 * Checks required reviews
 * @param {Object} pullRequest - The pull request data
 * @param {Object} repository - The repository data
 * @param {Object} octokit - GitHub API client
 * @returns {Promise<Object>} - Check result
 */
async function checkRequiredReviews(pullRequest, repository, octokit) {
  try {
    const { data: reviews } = await octokit.rest.pulls.listReviews({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pullRequest.number
    });
    
    // Check if there are any required reviews that haven't been approved
    const requiredReviews = reviews.filter(review => 
      review.state === 'APPROVED' || review.state === 'CHANGES_REQUESTED'
    );
    
    // If there are reviews but none are approved, don't merge
    if (reviews.length > 0 && !requiredReviews.some(review => review.state === 'APPROVED')) {
      return { passed: false, reason: 'Required reviews not completed' };
    }
    
    return { passed: true };
    
  } catch (error) {
    console.log('Reviews check failed, allowing merge:', error.message);
    return { passed: true };
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
 * @param {Object} evaluation - The evaluation result with AI analysis
 * @returns {Promise<boolean>} - Success status
 */
async function performAutoMerge(pullRequest, repository, octokit, reason, rule = null, evaluation = null) {
  try {
    console.log(`Performing auto-merge for PR #${pullRequest.number} (${reason})`);
    
    // Create a status check to show automerge progress
    await createStatusCheck(octokit, repository, pullRequest, 'pending', 'AutoMerge Pro is processing this PR...');
    
    // Determine merge method from rule or use default
    const mergeMethod = rule?.actions?.mergeMethod || 'squash';
    
    // First, create an approval review if needed
    if (!rule || rule.actions.autoApprove !== false) {
      let reviewBody = `✅ **AutoMerge Pro** automatically approved this PR\n\n**Reason:** ${reason}\n\nThis PR meets the criteria for automatic merging based on your configured rules.`;
      
      // Add AI analysis details if available
      if (evaluation.aiAnalysis) {
        const analysis = evaluation.aiAnalysis;
        reviewBody += `\n\n## 🤖 AI Analysis\n\n`;
        reviewBody += `**Risk Score:** ${(analysis.riskScore * 100).toFixed(1)}%\n`;
        reviewBody += `**Summary:** ${analysis.summary}\n\n`;
        
        if (analysis.concerns.length > 0) {
          reviewBody += `**Concerns:**\n${analysis.concerns.map(c => `- ${c}`).join('\n')}\n\n`;
        }
        
        if (analysis.recommendations.length > 0) {
          reviewBody += `**Recommendations:**\n${analysis.recommendations.map(r => `- ${r}`).join('\n')}\n\n`;
        }
        
        reviewBody += `**Categories:**\n`;
        reviewBody += `- Security: ${(analysis.categories.security * 100).toFixed(1)}%\n`;
        reviewBody += `- Breaking Changes: ${(analysis.categories.breaking * 100).toFixed(1)}%\n`;
        reviewBody += `- Complexity: ${(analysis.categories.complexity * 100).toFixed(1)}%\n`;
        reviewBody += `- Testing: ${(analysis.categories.testing * 100).toFixed(1)}%\n`;
        reviewBody += `- Documentation: ${(analysis.categories.documentation * 100).toFixed(1)}%\n`;
      }
      
      await octokit.rest.pulls.createReview({
        owner: repository.owner.login,
        repo: repository.name,
        pull_number: pullRequest.number,
        event: 'APPROVE',
        body: reviewBody
      });
      
      // Wait a moment for the review to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Update status check to show merging
    await createStatusCheck(octokit, repository, pullRequest, 'pending', 'AutoMerge Pro is merging this PR...');
    
    // Then merge the PR
    const mergeResult = await octokit.rest.pulls.merge({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pullRequest.number,
      merge_method: mergeMethod,
      commit_title: `${pullRequest.title} (#${pullRequest.number})`,
      commit_message: `Automatically merged by AutoMerge Pro\n\n**Reason:** ${reason}\n\nThis PR was automatically merged based on your configured automerge rules.`
    });
    
    // Update status check to show success
    await createStatusCheck(octokit, repository, pullRequest, 'success', `Successfully merged using ${mergeMethod} method`);
    
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
    
    // Add a comment to the PR
    await octokit.rest.issues.createComment({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: pullRequest.number,
      body: `🎉 **PR Successfully Merged!**\n\nThis PR was automatically merged by AutoMerge Pro.\n\n**Merge Method:** ${mergeMethod}\n**Reason:** ${reason}\n\nIf you have any questions about this automation, please check your AutoMerge Pro configuration.`
    });
    
    console.log(`✅ Successfully auto-merged PR #${pullRequest.number}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to auto-merge PR #${pullRequest.number}:`, error.message);
    
    // Update status check to show failure
    await createStatusCheck(octokit, repository, pullRequest, 'failure', `Auto-merge failed: ${error.message}`);
    
    // Add a comment explaining the failure
    await octokit.rest.issues.createComment({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: pullRequest.number,
      body: `❌ **Auto-merge Failed**\n\nAutoMerge Pro was unable to merge this PR automatically.\n\n**Error:** ${error.message}\n\nPlease review the PR manually or check your AutoMerge Pro configuration.`
    });
    
    return false;
  }
}

/**
 * Creates a GitHub status check
 * @param {Object} octokit - GitHub API client
 * @param {Object} repository - The repository data
 * @param {Object} pullRequest - The pull request data
 * @param {string} state - Status state (pending, success, failure)
 * @param {string} description - Status description
 */
async function createStatusCheck(octokit, repository, pullRequest, state, description) {
  try {
    await octokit.rest.checks.create({
      owner: repository.owner.login,
      repo: repository.name,
      name: 'AutoMerge Pro',
      head_sha: pullRequest.head.sha,
      status: 'completed',
      conclusion: state,
      output: {
        title: 'AutoMerge Pro Status',
        summary: description,
        text: `AutoMerge Pro is monitoring this PR for automatic merging opportunities.\n\n**Current Status:** ${description}`
      }
    });
  } catch (error) {
    console.log('Failed to create status check:', error.message);
  }
}

module.exports = {
  evaluateAutomergeRules,
  performAutoMerge,
  checkForMinorVersionUpdates
};