/**
 * Mock webhook payloads for testing GitHub webhook handlers
 */

export const pullRequestPayloads = {
  opened: {
    action: 'opened',
    number: 123,
    pull_request: {
      id: 1,
      number: 123,
      title: 'Add new feature',
      body: 'This PR adds a new feature to improve user experience.',
      state: 'open',
      user: {
        login: 'test-user',
        id: 12345,
        type: 'User'
      },
      head: {
        ref: 'feature/new-feature',
        sha: 'abc123def456'
      },
      base: {
        ref: 'main',
        sha: 'def456abc789'
      },
      changed_files: 3,
      additions: 25,
      deletions: 5,
      commits: 2,
      mergeable: true,
      mergeable_state: 'clean'
    },
    repository: {
      id: 123456789,
      name: 'test-repo',
      full_name: 'test-org/test-repo',
      owner: {
        login: 'test-org',
        id: 67890,
        type: 'Organization'
      },
      private: false,
      default_branch: 'main'
    },
    installation: {
      id: 98765
    }
  },

  synchronize: {
    action: 'synchronize',
    number: 123,
    pull_request: {
      id: 1,
      number: 123,
      title: 'Add new feature',
      body: 'This PR adds a new feature to improve user experience.',
      state: 'open',
      user: {
        login: 'test-user',
        id: 12345,
        type: 'User'
      },
      head: {
        ref: 'feature/new-feature',
        sha: 'updated123hash456'
      },
      base: {
        ref: 'main',
        sha: 'def456abc789'
      },
      changed_files: 4,
      additions: 35,
      deletions: 8,
      commits: 3,
      mergeable: true,
      mergeable_state: 'clean'
    },
    repository: {
      id: 123456789,
      name: 'test-repo',
      full_name: 'test-org/test-repo',
      owner: {
        login: 'test-org',
        id: 67890,
        type: 'Organization'
      },
      private: false,
      default_branch: 'main'
    },
    installation: {
      id: 98765
    }
  },

  dependabotPr: {
    action: 'opened',
    number: 124,
    pull_request: {
      id: 2,
      number: 124,
      title: 'Bump lodash from 4.17.20 to 4.17.21',
      body: 'Bumps [lodash](https://github.com/lodash/lodash) from 4.17.20 to 4.17.21.\n\n**Changelog**\nSourced from [lodash\'s changelog](https://github.com/lodash/lodash/blob/master/CHANGELOG.md).',
      state: 'open',
      user: {
        login: 'dependabot[bot]',
        id: 49699333,
        type: 'Bot'
      },
      head: {
        ref: 'dependabot/npm_and_yarn/lodash-4.17.21',
        sha: 'dep123bot456'
      },
      base: {
        ref: 'main',
        sha: 'def456abc789'
      },
      changed_files: 2,
      additions: 2,
      deletions: 2,
      commits: 1,
      mergeable: true,
      mergeable_state: 'clean'
    },
    repository: {
      id: 123456789,
      name: 'test-repo',
      full_name: 'test-org/test-repo',
      owner: {
        login: 'test-org',
        id: 67890,
        type: 'Organization'
      },
      private: false,
      default_branch: 'main'
    },
    installation: {
      id: 98765
    }
  }
};

export const checkRunPayloads = {
  completed: {
    action: 'completed',
    check_run: {
      id: 123456,
      name: 'CI',
      status: 'completed',
      conclusion: 'success',
      started_at: '2023-01-01T12:00:00Z',
      completed_at: '2023-01-01T12:05:00Z',
      head_sha: 'abc123def456',
      pull_requests: [
        {
          id: 1,
          number: 123,
          head: {
            ref: 'feature/new-feature',
            sha: 'abc123def456'
          },
          base: {
            ref: 'main',
            sha: 'def456abc789'
          }
        }
      ]
    },
    repository: {
      id: 123456789,
      name: 'test-repo',
      full_name: 'test-org/test-repo',
      owner: {
        login: 'test-org',
        id: 67890,
        type: 'Organization'
      }
    },
    installation: {
      id: 98765
    }
  },

  failed: {
    action: 'completed',
    check_run: {
      id: 123457,
      name: 'Tests',
      status: 'completed',
      conclusion: 'failure',
      started_at: '2023-01-01T12:00:00Z',
      completed_at: '2023-01-01T12:03:00Z',
      head_sha: 'abc123def456',
      output: {
        title: 'Test Results',
        summary: '5 tests failed',
        text: 'Tests failed in multiple files...'
      },
      pull_requests: [
        {
          id: 1,
          number: 123,
          head: {
            ref: 'feature/new-feature',
            sha: 'abc123def456'
          },
          base: {
            ref: 'main',
            sha: 'def456abc789'
          }
        }
      ]
    },
    repository: {
      id: 123456789,
      name: 'test-repo',
      full_name: 'test-org/test-repo',
      owner: {
        login: 'test-org',
        id: 67890,
        type: 'Organization'
      }
    },
    installation: {
      id: 98765
    }
  }
};

export const marketplacePurchasePayloads = {
  purchased: {
    action: 'purchased',
    effective_date: '2023-01-01T12:00:00Z',
    marketplace_purchase: {
      account: {
        type: 'Organization',
        id: 67890,
        node_id: 'MDEyOk9yZ2FuaXphdGlvbjY3ODkw',
        login: 'test-org',
        organization_billing_email: 'billing@test-org.com'
      },
      billing_cycle: 'monthly',
      unit_count: 1,
      on_free_trial: false,
      free_trial_ends_on: null,
      next_billing_date: '2023-02-01T12:00:00Z',
      plan: {
        id: 2,
        name: 'Team Plan',
        description: 'For small teams',
        monthly_price_in_cents: 999,
        yearly_price_in_cents: 9990,
        price_model: 'per-unit',
        has_free_trial: true,
        unit_name: 'seat',
        bullets: [
          'Up to 10 repositories',
          'AI-powered analysis',
          'Slack notifications'
        ]
      }
    }
  },

  changed: {
    action: 'changed',
    effective_date: '2023-01-15T12:00:00Z',
    marketplace_purchase: {
      account: {
        type: 'Organization',
        id: 67890,
        node_id: 'MDEyOk9yZ2FuaXphdGlvbjY3ODkw',
        login: 'test-org',
        organization_billing_email: 'billing@test-org.com'
      },
      billing_cycle: 'monthly',
      unit_count: 1,
      on_free_trial: false,
      free_trial_ends_on: null,
      next_billing_date: '2023-02-15T12:00:00Z',
      plan: {
        id: 3,
        name: 'Growth Plan',
        description: 'For growing teams',
        monthly_price_in_cents: 2999,
        yearly_price_in_cents: 29990,
        price_model: 'per-unit',
        has_free_trial: false,
        unit_name: 'seat',
        bullets: [
          'Unlimited repositories',
          'AI-powered analysis',
          'All integrations',
          'Priority support'
        ]
      }
    }
  },

  cancelled: {
    action: 'cancelled',
    effective_date: '2023-01-20T12:00:00Z',
    marketplace_purchase: {
      account: {
        type: 'Organization',
        id: 67890,
        node_id: 'MDEyOk9yZ2FuaXphdGlvbjY3ODkw',
        login: 'test-org'
      },
      billing_cycle: 'monthly',
      unit_count: 1,
      on_free_trial: false,
      free_trial_ends_on: null,
      next_billing_date: null,
      plan: {
        id: 1,
        name: 'Free Plan',
        description: 'Basic features',
        monthly_price_in_cents: 0,
        yearly_price_in_cents: 0,
        price_model: 'per-unit',
        has_free_trial: false,
        unit_name: 'seat',
        bullets: [
          'Up to 1 repository',
          'Basic automerge rules'
        ]
      }
    }
  },

  pendingChange: {
    action: 'pending_change',
    effective_date: '2023-02-01T12:00:00Z',
    marketplace_purchase: {
      account: {
        type: 'Organization',
        id: 67890,
        node_id: 'MDEyOk9yZ2FuaXphdGlvbjY3ODkw',
        login: 'test-org',
        organization_billing_email: 'billing@test-org.com'
      },
      billing_cycle: 'monthly',
      unit_count: 1,
      on_free_trial: false,
      free_trial_ends_on: null,
      next_billing_date: '2023-02-01T12:00:00Z',
      plan: {
        id: 4,
        name: 'Enterprise Plan',
        description: 'For large organizations',
        monthly_price_in_cents: 9999,
        yearly_price_in_cents: 99990,
        price_model: 'per-unit',
        has_free_trial: false,
        unit_name: 'seat',
        bullets: [
          'Unlimited everything',
          'Priority support',
          'Custom integrations',
          'SLA guarantee'
        ]
      }
    }
  }
};

export const pullRequestFiles = {
  documentationOnly: [
    {
      filename: 'README.md',
      status: 'modified',
      additions: 5,
      deletions: 2,
      changes: 7,
      patch: '@@ -1,3 +1,6 @@\n # Project\n-This is a project\n+This is an awesome project with examples\n+\n+## Getting Started\n+Follow these steps...'
    },
    {
      filename: 'docs/api.md',
      status: 'added',
      additions: 20,
      deletions: 0,
      changes: 20,
      patch: '@@ -0,0 +1,20 @@\n+# API Documentation\n+\n+## Endpoints\n+\n+### GET /api/health\n+Returns health status...'
    }
  ],

  securityChanges: [
    {
      filename: 'src/middleware/auth.ts',
      status: 'modified',
      additions: 15,
      deletions: 10,
      changes: 25,
      patch: '@@ -10,10 +10,15 @@ export function authenticate(req: Request, res: Response, next: NextFunction) {\n   const token = req.headers.authorization?.split(\' \')[1];\n-  if (!token) {\n+  if (!token || token === \'\') {\n     return res.status(401).json({ error: \'No token provided\' });\n   }\n+  \n+  // Additional validation\n+  if (token.length < 10) {\n+    return res.status(401).json({ error: \'Invalid token format\' });\n+  }'
    },
    {
      filename: 'package.json',
      status: 'modified',
      additions: 2,
      deletions: 2,
      changes: 4,
      patch: '@@ -15,8 +15,8 @@\n   "dependencies": {\n-    "jsonwebtoken": "^8.5.1",\n-    "bcrypt": "^5.0.1"\n+    "jsonwebtoken": "^9.0.0",\n+    "bcrypt": "^5.1.0"\n   }'
    }
  ],

  dependencyUpdates: [
    {
      filename: 'package.json',
      status: 'modified',
      additions: 1,
      deletions: 1,
      changes: 2,
      patch: '@@ -15,7 +15,7 @@\n   "dependencies": {\n-    "lodash": "^4.17.20",\n+    "lodash": "^4.17.21",\n     "express": "^4.18.0"'
    },
    {
      filename: 'package-lock.json',
      status: 'modified',
      additions: 50,
      deletions: 50,
      changes: 100,
      patch: '@@ -1000,50 +1000,50 @@\n       "lodash": {\n-        "version": "4.17.20",\n+        "version": "4.17.21",'
    }
  ]
};