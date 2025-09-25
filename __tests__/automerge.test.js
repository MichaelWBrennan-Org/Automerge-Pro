const automergeLogic = require('../src/automerge');

// Mock GitHub API client
const mockOctokit = {
  rest: {
    pulls: {
      listFiles: jest.fn(),
      createReview: jest.fn(),
      merge: jest.fn(),
      listReviews: jest.fn()
    },
    checks: {
      listForRef: jest.fn(),
      create: jest.fn()
    },
    repos: {
      getBranchProtection: jest.fn(),
      compareCommits: jest.fn()
    },
    issues: {
      createComment: jest.fn()
    },
    git: {
      deleteRef: jest.fn()
    }
  }
};

// Mock pull request data
const mockPullRequest = {
  number: 123,
  title: 'Update documentation',
  body: 'This PR updates the README file',
  state: 'open',
  mergeable: true,
  user: { login: 'testuser' },
  base: { ref: 'main', sha: 'abc123' },
  head: { ref: 'feature/docs', sha: 'def456' }
};

const mockRepository = {
  owner: { login: 'testorg' },
  name: 'testrepo'
};

describe('AutoMerge Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateAutomergeRules', () => {
    it('should return shouldMerge: false for PRs with merge conflicts', async () => {
      const prWithConflicts = { ...mockPullRequest, mergeable: false };
      
      const result = await automergeLogic.evaluateAutomergeRules(
        prWithConflicts, 
        mockRepository, 
        mockOctokit
      );
      
      expect(result.shouldMerge).toBe(false);
      expect(result.reason).toBe('PR has merge conflicts');
    });

    it('should return shouldMerge: false for closed PRs', async () => {
      const closedPR = { ...mockPullRequest, state: 'closed' };
      
      const result = await automergeLogic.evaluateAutomergeRules(
        closedPR, 
        mockRepository, 
        mockOctokit
      );
      
      expect(result.shouldMerge).toBe(false);
      expect(result.reason).toBe('PR is not open');
    });

    it('should return shouldMerge: true for documentation-only changes', async () => {
      mockOctokit.rest.pulls.listFiles.mockResolvedValue({
        data: [
          { filename: 'README.md', additions: 5, deletions: 2, status: 'modified' },
          { filename: 'docs/guide.md', additions: 10, deletions: 0, status: 'added' }
        ]
      });

      // Mock branch protection to allow merge
      mockOctokit.rest.repos.getBranchProtection.mockRejectedValue(new Error('No protection'));

      const result = await automergeLogic.evaluateAutomergeRules(
        mockPullRequest, 
        mockRepository, 
        mockOctokit
      );
      
      expect(result.shouldMerge).toBe(true);
      expect(result.reason).toBe('documentation-only');
    });

    it('should return shouldMerge: true for dependabot PRs', async () => {
      const dependabotPR = { 
        ...mockPullRequest, 
        user: { login: 'dependabot[bot]' },
        head: { ref: 'dependabot/npm/lodash-4.17.21', sha: 'def456' }
      };

      mockOctokit.rest.pulls.listFiles.mockResolvedValue({
        data: [
          { filename: 'package.json', additions: 2, deletions: 2, status: 'modified' },
          { filename: 'package-lock.json', additions: 10, deletions: 10, status: 'modified' }
        ]
      });

      // Mock branch protection to allow merge
      mockOctokit.rest.repos.getBranchProtection.mockRejectedValue(new Error('No protection'));

      const result = await automergeLogic.evaluateAutomergeRules(
        dependabotPR, 
        mockRepository, 
        mockOctokit
      );
      
      expect(result.shouldMerge).toBe(true);
      expect(result.reason).toBe('minor-deps');
    });

    it('should respect branch protection rules', async () => {
      mockOctokit.rest.pulls.listFiles.mockResolvedValue({
        data: [{ filename: 'README.md', additions: 1, deletions: 1, status: 'modified' }]
      });

      // Mock branch protection that requires status checks
      mockOctokit.rest.repos.getBranchProtection.mockResolvedValue({
        data: {
          required_status_checks: { strict: true },
          required_pull_request_reviews: { required_approving_review_count: 1 }
        }
      });

      // Mock status checks that are pending
      mockOctokit.rest.checks.listForRef.mockResolvedValue({
        data: {
          check_runs: [
            { name: 'CI', status: 'in_progress', conclusion: null }
          ]
        }
      });

      const result = await automergeLogic.evaluateAutomergeRules(
        mockPullRequest, 
        mockRepository, 
        mockOctokit
      );
      
      expect(result.shouldMerge).toBe(false);
      expect(result.reason).toContain('Required checks pending');
    });
  });

  describe('performAutoMerge', () => {
    it('should successfully merge a PR', async () => {
      mockOctokit.rest.checks.create.mockResolvedValue({ data: {} });
      mockOctokit.rest.pulls.createReview.mockResolvedValue({ data: {} });
      mockOctokit.rest.pulls.merge.mockResolvedValue({ data: { merged: true } });
      mockOctokit.rest.issues.createComment.mockResolvedValue({ data: {} });
      mockOctokit.rest.git.deleteRef.mockResolvedValue({ data: {} });

      const result = await automergeLogic.performAutoMerge(
        mockPullRequest,
        mockRepository,
        mockOctokit,
        'documentation-only'
      );

      expect(result).toBe(true);
      expect(mockOctokit.rest.pulls.createReview).toHaveBeenCalled();
      expect(mockOctokit.rest.pulls.merge).toHaveBeenCalled();
      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
    });

    it('should handle merge failures gracefully', async () => {
      mockOctokit.rest.checks.create.mockResolvedValue({ data: {} });
      mockOctokit.rest.pulls.createReview.mockResolvedValue({ data: {} });
      mockOctokit.rest.pulls.merge.mockRejectedValue(new Error('Merge failed'));
      mockOctokit.rest.issues.createComment.mockResolvedValue({ data: {} });

      const result = await automergeLogic.performAutoMerge(
        mockPullRequest,
        mockRepository,
        mockOctokit,
        'documentation-only'
      );

      expect(result).toBe(false);
      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('Auto-merge Failed')
        })
      );
    });
  });

  describe('checkForMinorVersionUpdates', () => {
    it('should allow minor version updates', async () => {
      const files = [
        { filename: 'package.json', additions: 2, deletions: 2 }
      ];

      mockOctokit.rest.repos.getCompareCommits.mockResolvedValue({
        data: {
          files: [
            { 
              filename: 'package.json', 
              patch: '+  "lodash": "^4.17.20",\n-  "lodash": "^4.17.19"' 
            }
          ]
        }
      });

      const result = await automergeLogic.checkForMinorVersionUpdates(
        files,
        mockOctokit,
        'testorg',
        'testrepo',
        123
      );

      expect(result).toBe(true);
    });

    it('should reject major version updates', async () => {
      const files = [
        { filename: 'package.json', additions: 2, deletions: 2 }
      ];

      mockOctokit.rest.repos.getCompareCommits.mockResolvedValue({
        data: {
          files: [
            { 
              filename: 'package.json', 
              patch: '+  "lodash": "^5.0.0",\n-  "lodash": "^4.17.19"' 
            }
          ]
        }
      });

      const result = await automergeLogic.checkForMinorVersionUpdates(
        files,
        mockOctokit,
        'testorg',
        'testrepo',
        123
      );

      expect(result).toBe(false);
    });
  });
});