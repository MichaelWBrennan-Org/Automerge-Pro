import { analyzeNextFilesPullRequest, PRAnalysisInput } from '../src/services/ai-analyzer';
import { pullRequestFiles } from './mocks/webhook-payloads';

// Mock OpenAI module
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

// Mock config since OpenAI needs it
jest.mock('../src/config', () => ({
  config: {
    openai: {
      apiKey: 'test-key',
      model: 'gpt-4'
    }
  }
}));

describe('AI Analyzer', () => {
  let mockCreate: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variable for OpenAI
    process.env.OPENAI_API_KEY = 'test-openai-key';
    
    // Get reference to the mocked create function
    const OpenAI = require('openai');
    const openaiInstance = new OpenAI();
    mockCreate = openaiInstance.chat.completions.create;
    
    // Set default mock response
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              riskScore: 0.2,
              autoApprovalRecommended: true,
              summary: 'Low-risk documentation changes',
              concerns: [],
              recommendations: ['Consider adding examples'],
              categories: {
                security: 0.0,
                breaking: 0.0,
                complexity: 0.1,
                testing: 0.0,
                documentation: 0.9
              }
            })
          }
        }
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      }
    });
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  test('should analyze a simple documentation PR', async () => {
    const input: PRAnalysisInput = {
      title: 'Update README',
      body: 'Fixed typos and added examples',
      files: pullRequestFiles.documentationOnly.map(file => ({
        filename: file.filename,
        status: file.status as any,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch
      })),
      author: 'john-doe',
      baseBranch: 'main',
      headBranch: 'fix/readme-typos'
    };

    const result = await analyzeNextFilesPullRequest(input);
    
    expect(result.riskScore).toBeLessThan(0.3);
    expect(result.autoApprovalRecommended).toBe(true);
    expect(result.categories.documentation).toBeGreaterThan(0.5);
    expect(result.summary).toBe('Low-risk documentation changes');
    expect(result.concerns).toEqual([]);
    expect(result.recommendations).toContain('Consider adding examples');
  });

  test('should flag high-risk security changes', async () => {
    // Configure mock to return high-risk analysis for security changes
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              riskScore: 0.8,
              autoApprovalRecommended: false,
              summary: 'High-risk security changes detected',
              concerns: [
                'Authentication logic modification',
                'Potential security vulnerability'
              ],
              recommendations: [
                'Require security team review',
                'Run additional security tests'
              ],
              categories: {
                security: 0.9,
                breaking: 0.3,
                complexity: 0.6,
                testing: 0.2,
                documentation: 0.1
              }
            })
          }
        }
      ],
      usage: {
        prompt_tokens: 200,
        completion_tokens: 80,
        total_tokens: 280
      }
    });

    const input: PRAnalysisInput = {
      title: 'Update authentication middleware',
      body: 'Changed JWT validation logic',
      files: pullRequestFiles.securityChanges.map(file => ({
        filename: file.filename,
        status: file.status as any,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch
      })),
      author: 'new-contributor',
      baseBranch: 'main',
      headBranch: 'feature/auth-changes'
    };
    
    const result = await analyzeNextFilesPullRequest(input);
    
    expect(result.riskScore).toBeGreaterThan(0.5);
    expect(result.autoApprovalRecommended).toBe(false);
    expect(result.categories.security).toBeGreaterThan(0.5);
    expect(result.concerns).toContain('Authentication logic modification');
  });

  test('should handle dependabot PRs with low risk', async () => {
    // Mock OpenAI to return low-risk analysis for dependency updates
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              riskScore: 0.1,
              autoApprovalRecommended: true,
              summary: 'Routine dependency update',
              concerns: [],
              recommendations: ['Verify automated tests pass'],
              categories: {
                security: 0.0,
                breaking: 0.1,
                complexity: 0.0,
                testing: 0.1,
                documentation: 0.0
              }
            })
          }
        }
      ],
      usage: {
        prompt_tokens: 150,
        completion_tokens: 40,
        total_tokens: 190
      }
    });

    const input: PRAnalysisInput = {
      title: 'Bump lodash from 4.17.20 to 4.17.21',
      body: 'Bumps [lodash](https://github.com/lodash/lodash) from 4.17.20 to 4.17.21.',
      files: pullRequestFiles.dependencyUpdates.map(file => ({
        filename: file.filename,
        status: file.status as any,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch
      })),
      author: 'dependabot[bot]',
      baseBranch: 'main',
      headBranch: 'dependabot/npm_and_yarn/lodash-4.17.21'
    };
    
    const result = await analyzeNextFilesPullRequest(input);
    
    expect(result.riskScore).toBeLessThan(0.2);
    expect(result.autoApprovalRecommended).toBe(true);
    expect(result.summary).toBe('Routine dependency update');
    expect(result.categories.breaking).toBeLessThan(0.2);
  });

  test('should handle OpenAI API errors gracefully with fallback analysis', async () => {
    // Mock OpenAI to throw an error
    mockCreate.mockRejectedValueOnce(
      new Error('API rate limit exceeded')
    );

    const input: PRAnalysisInput = {
      title: 'Update README',
      body: 'Fixed typos and added examples',
      files: [{
        filename: 'README.md',
        status: 'modified',
        additions: 5,
        deletions: 2,
        patch: '@@ documentation changes'
      }],
      author: 'john-doe',
      baseBranch: 'main',
      headBranch: 'fix/readme-typos'
    };

    const result = await analyzeNextFilesPullRequest(input);
    
    // Should fall back to heuristic analysis
    expect(result).toBeDefined();
    expect(result.riskScore).toBeDefined();
    expect(result.autoApprovalRecommended).toBeDefined();
    expect(result.categories).toBeDefined();
    
    // Documentation files should have low risk in fallback
    expect(result.categories.documentation).toBeGreaterThan(0);
  });

  test('should handle invalid JSON response from OpenAI', async () => {
    // Mock OpenAI to return invalid JSON
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: 'Invalid JSON response'
          }
        }
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 10,
        total_tokens: 110
      }
    });

    const input: PRAnalysisInput = {
      title: 'Test PR',
      body: 'Test changes',
      files: [{
        filename: 'test.js',
        status: 'modified',
        additions: 1,
        deletions: 1,
        patch: '@@ test changes'
      }],
      author: 'test-user',
      baseBranch: 'main',
      headBranch: 'test-branch'
    };

    const result = await analyzeNextFilesPullRequest(input);
    
    // Should fall back to heuristic analysis
    expect(result).toBeDefined();
    expect(result.riskScore).toBeDefined();
    expect(result.autoApprovalRecommended).toBeDefined();
  });

  test('should handle empty file list', async () => {
    const input: PRAnalysisInput = {
      title: 'Empty PR',
      body: 'No file changes',
      files: [],
      author: 'test-user',
      baseBranch: 'main',
      headBranch: 'empty-branch'
    };

    const result = await analyzeNextFilesPullRequest(input);
    
    expect(result.riskScore).toBe(0);
    expect(result.autoApprovalRecommended).toBe(true);
    expect(result.summary).toContain('No files changed');
  });

  test('should calculate risk based on file patterns', async () => {
    const input: PRAnalysisInput = {
      title: 'Config changes',
      body: 'Updated configuration',
      files: [
        {
          filename: 'package.json',
          status: 'modified',
          additions: 5,
          deletions: 2,
          patch: '@@ config changes'
        },
        {
          filename: '.env.example',
          status: 'modified',
          additions: 2,
          deletions: 1,
          patch: '@@ env changes'
        }
      ],
      author: 'developer',
      baseBranch: 'main',
      headBranch: 'config-updates'
    };

    const result = await analyzeNextFilesPullRequest(input);
    
    // Configuration files should have moderate to high risk
    expect(result.riskScore).toBeGreaterThan(0.3);
  });
});