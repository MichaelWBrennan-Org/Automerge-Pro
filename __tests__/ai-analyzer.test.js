const { analyzeNextFilesPullRequest } = require('../apps/backend/src/services/ai-analyzer');

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

describe('AI Analyzer', () => {
  const mockInput = {
    title: 'Fix bug in authentication',
    body: 'This PR fixes a critical bug in the authentication system',
    files: [
      {
        filename: 'src/auth.js',
        status: 'modified',
        additions: 10,
        deletions: 5,
        patch: '+  console.log("Debug auth");\n-  // Old code'
      },
      {
        filename: 'test/auth.test.js',
        status: 'added',
        additions: 20,
        deletions: 0,
        patch: '+  describe("Authentication", () => {\n+    it("should authenticate user", () => {\n+      // test code\n+    });\n+  });'
      }
    ],
    author: 'testuser',
    baseBranch: 'main',
    headBranch: 'fix/auth-bug'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should analyze a PR and return structured results', async () => {
    const mockOpenAI = require('openai').default;
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            riskScore: 0.3,
            summary: 'Low-risk bug fix with tests',
            concerns: ['Minor security concern with debug logging'],
            recommendations: ['Remove debug logging before merge'],
            autoApprovalRecommended: true,
            categories: {
              security: 0.2,
              breaking: 0.1,
              complexity: 0.3,
              testing: 0.8,
              documentation: 0.1
            }
          })
        }
      }]
    };

    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue(mockResponse)
        }
      }
    }));

    const result = await analyzeNextFilesPullRequest(mockInput);

    expect(result).toEqual({
      riskScore: 0.3,
      summary: 'Low-risk bug fix with tests',
      concerns: ['Minor security concern with debug logging'],
      recommendations: ['Remove debug logging before merge'],
      autoApprovalRecommended: true,
      categories: {
        security: 0.2,
        breaking: 0.1,
        complexity: 0.3,
        testing: 0.8,
        documentation: 0.1
      }
    });
  });

  it('should handle OpenAI API errors gracefully', async () => {
    const mockOpenAI = require('openai').default;
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('API Error'))
        }
      }
    }));

    const result = await analyzeNextFilesPullRequest(mockInput);

    // Should fall back to heuristic analysis
    expect(result).toHaveProperty('riskScore');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('autoApprovalRecommended');
    expect(result).toHaveProperty('categories');
  });

  it('should validate and sanitize AI response', async () => {
    const mockOpenAI = require('openai').default;
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            riskScore: 1.5, // Invalid: should be 0-1
            summary: null, // Invalid: should be string
            concerns: 'not an array', // Invalid: should be array
            recommendations: ['Valid recommendation'],
            autoApprovalRecommended: 'yes', // Invalid: should be boolean
            categories: {
              security: 2.0, // Invalid: should be 0-1
              breaking: -0.5, // Invalid: should be 0-1
              complexity: 0.5,
              testing: 0.3,
              documentation: 0.1
            }
          })
        }
      }]
    };

    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue(mockResponse)
        }
      }
    }));

    const result = await analyzeNextFilesPullRequest(mockInput);

    // Should sanitize invalid values
    expect(result.riskScore).toBe(1); // Clamped to 1
    expect(result.summary).toBe('No summary provided'); // Default value
    expect(result.concerns).toEqual([]); // Default empty array
    expect(result.autoApprovalRecommended).toBe(false); // Default false
    expect(result.categories.security).toBe(1); // Clamped to 1
    expect(result.categories.breaking).toBe(0); // Clamped to 0
  });

  it('should generate fallback analysis for documentation-only changes', async () => {
    const mockOpenAI = require('openai').default;
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('API Error'))
        }
      }
    }));

    const docInput = {
      ...mockInput,
      files: [
        {
          filename: 'README.md',
          status: 'modified',
          additions: 5,
          deletions: 2,
          patch: '+  Updated documentation\n-  Old text'
        }
      ]
    };

    const result = await analyzeNextFilesPullRequest(docInput);

    expect(result.riskScore).toBeLessThan(0.2);
    expect(result.autoApprovalRecommended).toBe(true);
    expect(result.categories.documentation).toBeGreaterThan(0.8);
  });

  it('should generate fallback analysis for dependabot PRs', async () => {
    const mockOpenAI = require('openai').default;
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('API Error'))
        }
      }
    }));

    const dependabotInput = {
      ...mockInput,
      author: 'dependabot[bot]',
      files: [
        {
          filename: 'package.json',
          status: 'modified',
          additions: 2,
          deletions: 2,
          patch: '+  "lodash": "^4.17.20",\n-  "lodash": "^4.17.19"'
        }
      ]
    };

    const result = await analyzeNextFilesPullRequest(dependabotInput);

    expect(result.riskScore).toBeLessThan(0.2);
    expect(result.autoApprovalRecommended).toBe(true);
    expect(result.summary).toContain('dependency update');
  });
});