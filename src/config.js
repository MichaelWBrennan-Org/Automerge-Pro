/**
 * Configuration Module
 * Handles .automerge-pro.yml schema validation and loading
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Default configuration schema
 */
const defaultSchema = {
  version: '1',
  rules: [
    {
      name: "Auto-merge dependabot",
      description: "Automatically merge dependabot PRs",
      enabled: true,
      conditions: {
        authorPatterns: ["dependabot[bot]"],
        maxRiskScore: 0.3
      },
      actions: {
        autoApprove: true,
        autoMerge: true,
        mergeMethod: "squash",
        deleteBranch: true
      }
    }
  ],
  settings: {
    aiAnalysis: false,
    riskThreshold: 0.5,
    autoDeleteBranches: true,
    requireStatusChecks: true,
    allowForceUpdates: false
  }
};

/**
 * Load configuration from repository
 * @param {string} repoPath - Path to repository root
 * @returns {Object} Parsed configuration or defaults
 */
function loadConfig(repoPath) {
  try {
    const configPath = path.join(repoPath, '.automerge-pro.yml');
    
    if (!fs.existsSync(configPath)) {
      console.log(`No .automerge-pro.yml found at ${configPath}, using defaults`);
      return defaultSchema;
    }

    const fileContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(fileContent);

    // Validate the loaded configuration
    const validatedConfig = validateConfig(config);
    
    console.log(`✅ Loaded configuration from ${configPath}`);
    return validatedConfig;
    
  } catch (error) {
    console.warn(`⚠️ Config load failed, using defaults: ${error.message}`);
    return defaultSchema;
  }
}

/**
 * Load configuration from GitHub repository using API
 * @param {Object} octokit - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<Object>} Parsed configuration or defaults
 */
async function loadConfigFromGitHub(octokit, owner, repo) {
  try {
    console.log(`Loading config from ${owner}/${repo}/.automerge-pro.yml`);
    
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '.automerge-pro.yml'
    });

    if (data.type !== 'file') {
      throw new Error('.automerge-pro.yml is not a file');
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const config = yaml.load(content);

    const validatedConfig = validateConfig(config);
    console.log(`✅ Loaded configuration from ${owner}/${repo}/.automerge-pro.yml`);
    return validatedConfig;
    
  } catch (error) {
    if (error.status === 404) {
      console.log(`No .automerge-pro.yml found in ${owner}/${repo}, using defaults`);
    } else {
      console.warn(`⚠️ Config load failed for ${owner}/${repo}, using defaults: ${error.message}`);
    }
    return defaultSchema;
  }
}

/**
 * Validate configuration schema
 * @param {Object} config - Raw configuration object
 * @returns {Object} Validated configuration
 * @throws {Error} If validation fails
 */
function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration must be an object');
  }

  // Validate version
  if (config.version && config.version !== '1') {
    throw new Error(`Unsupported configuration version: ${config.version}`);
  }

  // Validate rules array
  if (!Array.isArray(config.rules)) {
    throw new Error('rules must be an array');
  }

  // Validate each rule
  config.rules.forEach((rule, index) => {
    if (!rule.name || typeof rule.name !== 'string') {
      throw new Error(`Rule ${index}: name must be a string`);
    }

    if (!rule.conditions || typeof rule.conditions !== 'object') {
      throw new Error(`Rule ${index}: conditions must be an object`);
    }

    if (!rule.actions || typeof rule.actions !== 'object') {
      throw new Error(`Rule ${index}: actions must be an object`);
    }

    // Validate merge method if specified
    if (rule.actions.mergeMethod) {
      const validMethods = ['merge', 'squash', 'rebase'];
      if (!validMethods.includes(rule.actions.mergeMethod)) {
        throw new Error(`Rule ${index}: Invalid merge method: ${rule.actions.mergeMethod}`);
      }
    }
  });

  // Merge with defaults
  return {
    ...defaultSchema,
    ...config,
    rules: config.rules || defaultSchema.rules,
    settings: { ...defaultSchema.settings, ...config.settings }
  };
}

/**
 * Find matching rule for a pull request
 * @param {Object} config - Configuration object
 * @param {Object} pullRequest - PR data
 * @param {Array} files - Changed files
 * @returns {Object|null} Matching rule or null
 */
function findMatchingRule(config, pullRequest, files) {
  for (const rule of config.rules) {
    if (!rule.enabled) continue;

    console.log(`Checking rule: ${rule.name}`);

    // Check author patterns
    if (rule.conditions.authorPatterns) {
      const authorMatch = rule.conditions.authorPatterns.some(pattern => {
        if (pattern.startsWith('@') && pattern.includes('/')) {
          // Team pattern like "@core-team/*" - simplified check
          return false; // Would need GitHub API to check team membership
        }
        return matchPattern(pullRequest.user.login, pattern);
      });

      if (!authorMatch) {
        console.log(`Rule ${rule.name}: Author ${pullRequest.user.login} doesn't match patterns`);
        continue;
      }
    }

    // Check file patterns
    if (rule.conditions.filePatterns) {
      const fileMatch = files.some(file => 
        rule.conditions.filePatterns.some(pattern => 
          matchPattern(file.filename, pattern)
        )
      );

      if (!fileMatch) {
        console.log(`Rule ${rule.name}: No files match patterns`);
        continue;
      }
    }

    // Check block patterns (files that should NOT match)
    if (rule.conditions.blockPatterns) {
      const blocked = files.some(file => 
        rule.conditions.blockPatterns.some(pattern => 
          matchPattern(file.filename, pattern)
        )
      );

      if (blocked) {
        console.log(`Rule ${rule.name}: Files match block patterns`);
        continue;
      }
    }

    console.log(`✅ Rule ${rule.name} matches PR #${pullRequest.number}`);
    return rule;
  }

  return null;
}

/**
 * Simple pattern matching (supports * wildcards)
 * @param {string} text - Text to match
 * @param {string} pattern - Pattern with * wildcards
 * @returns {boolean} Whether text matches pattern
 */
function matchPattern(text, pattern) {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(text);
}

module.exports = {
  loadConfig,
  loadConfigFromGitHub,
  validateConfig,
  findMatchingRule,
  matchPattern,
  defaultSchema
};