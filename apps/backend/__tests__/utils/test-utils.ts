/**
 * Test utilities and common mocks for AWS Lambda environment and external services
 */

import { jest } from '@jest/globals';

/**
 * Mock AWS Lambda environment variables and context
 */
export function mockLambdaEnvironment() {
  const originalEnv = process.env;
  
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AWS_LAMBDA_FUNCTION_NAME: 'automerge-pro-handler',
      AWS_LAMBDA_FUNCTION_VERSION: '1',
      AWS_REGION: 'us-east-1',
      NODE_ENV: 'test',
      APP_ID: '123456',
      PRIVATE_KEY: 'test-private-key',
      WEBHOOK_SECRET: 'test-webhook-secret',
      JWT_SECRET: 'test-jwt-secret',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      OPENAI_API_KEY: 'test-openai-key'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });
}

/**
 * Create mock AWS Lambda event and context
 */
export function createLambdaEvent(httpMethod: string = 'POST', path: string = '/api/webhooks/github', body?: any, headers?: Record<string, string>) {
  return {
    httpMethod,
    path,
    pathParameters: null,
    queryStringParameters: null,
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Event': 'pull_request',
      'X-Hub-Signature-256': 'sha256=test-signature',
      ...headers
    },
    body: body ? JSON.stringify(body) : null,
    isBase64Encoded: false,
    requestContext: {
      requestId: 'test-request-id',
      stage: 'test',
      httpMethod,
      path,
      accountId: '123456789',
      resourceId: 'test-resource',
      requestTimeEpoch: Date.now(),
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'GitHub-Hookshot/test'
      },
      protocol: 'HTTP/1.1',
      resourcePath: path,
      apiId: 'test-api'
    }
  };
}

export function createLambdaContext() {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'automerge-pro-handler',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789:function:automerge-pro-handler',
    memoryLimitInMB: '512',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/automerge-pro-handler',
    logStreamName: 'test-log-stream',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {}
  };
}

/**
 * Mock Prisma Client for testing
 */
export function createMockPrismaClient() {
  return {
    organization: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    repository: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    mergeRule: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    pullRequest: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn()
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn()
  };
}

/**
 * Mock Redis client for testing
 */
export function createMockRedisClient() {
  const store = new Map();
  
  return {
    get: jest.fn((key: string) => Promise.resolve(store.get(key) || null)),
    set: jest.fn((key: string, value: string, ...args: any[]) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    setex: jest.fn((key: string, seconds: number, value: string) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve(1);
    }),
    exists: jest.fn((key: string) => Promise.resolve(store.has(key) ? 1 : 0)),
    expire: jest.fn(() => Promise.resolve(1)),
    ttl: jest.fn(() => Promise.resolve(-1)),
    keys: jest.fn((pattern: string) => Promise.resolve(Array.from(store.keys()))),
    flushall: jest.fn(() => {
      store.clear();
      return Promise.resolve('OK');
    }),
    quit: jest.fn(() => Promise.resolve('OK')),
    disconnect: jest.fn()
  };
}

/**
 * Mock GitHub Octokit client
 */
export function createMockOctokit() {
  return {
    rest: {
      repos: {
        getContent: jest.fn(),
        listPullRequestsAssociatedWithCommit: jest.fn(),
        get: jest.fn(),
        createCommitStatus: jest.fn(),
        merge: jest.fn()
      },
      pulls: {
        get: jest.fn(),
        list: jest.fn(),
        listFiles: jest.fn(),
        createReview: jest.fn(),
        merge: jest.fn(),
        update: jest.fn()
      },
      checks: {
        listForRef: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      apps: {
        getInstallation: jest.fn(),
        listInstallationReposForAuthenticatedUser: jest.fn()
      },
      issues: {
        createComment: jest.fn(),
        listComments: jest.fn()
      }
    },
    graphql: jest.fn(),
    paginate: jest.fn(),
    auth: jest.fn()
  };
}

/**
 * Create mock Fastify request object
 */
export function createMockFastifyRequest(overrides: any = {}) {
  return {
    params: {},
    query: {},
    body: {},
    headers: {
      'content-type': 'application/json',
      'user-agent': 'test-agent'
    },
    cookies: {},
    log: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    },
    jwtVerify: jest.fn(),
    prisma: createMockPrismaClient(),
    redis: createMockRedisClient(),
    ...overrides
  };
}

/**
 * Create mock Fastify reply object
 */
export function createMockFastifyReply() {
  const reply = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    code: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    headers: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    callNotFound: jest.fn().mockReturnThis(),
    getResponseTime: jest.fn().mockReturnValue(100),
    statusCode: 200,
    sent: false
  };

  return reply;
}

/**
 * Create mock Fastify instance
 */
export function createMockFastify() {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    register: jest.fn(),
    listen: jest.fn(),
    close: jest.fn(),
    addHook: jest.fn(),
    decorate: jest.fn(),
    decorateRequest: jest.fn(),
    decorateReply: jest.fn(),
    setErrorHandler: jest.fn(),
    log: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    },
    inject: jest.fn()
  };
}

/**
 * Helper function to wait for async operations in tests
 */
export function waitFor(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper to create test database records
 */
export const testData = {
  organization: {
    id: 'test-org-id',
    githubId: '67890',
    login: 'test-org',
    name: 'Test Organization',
    plan: 'TEAM' as const,
    subscriptionId: 'sub_test123',
    billingEmail: 'billing@test-org.com',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },
  
  repository: {
    id: 'test-repo-id',
    githubId: '123456789',
    name: 'test-repo',
    fullName: 'test-org/test-repo',
    private: false,
    defaultBranch: 'main',
    installationId: 98765,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },

  mergeRule: {
    id: 'test-rule-id',
    name: 'Auto-merge documentation',
    description: 'Automatically merge documentation changes',
    enabled: true,
    repositoryId: 'test-repo-id',
    organizationId: 'test-org-id',
    conditions: {
      filePatterns: ['*.md', 'docs/**'],
      maxRiskScore: 0.3
    },
    actions: {
      autoApprove: true,
      autoMerge: true,
      notify: false
    },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },

  pullRequest: {
    id: 'test-pr-id',
    githubId: '1',
    number: 123,
    title: 'Add new feature',
    body: 'This PR adds a new feature',
    state: 'OPEN' as const,
    repositoryId: 'test-repo-id',
    riskScore: 0.2,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  }
};

// Simple test to avoid "no tests" error
describe('Test Utils', () => {
  it('should create mock Lambda environment', () => {
    expect(createLambdaEvent).toBeDefined();
    expect(createLambdaContext).toBeDefined();
  });

  it('should create mock clients', () => {
    const prisma = createMockPrismaClient();
    expect(prisma.organization.findUnique).toBeDefined();
    
    const redis = createMockRedisClient();
    expect(redis.get).toBeDefined();
    
    const octokit = createMockOctokit();
    expect(octokit.rest.pulls.get).toBeDefined();
  });
});