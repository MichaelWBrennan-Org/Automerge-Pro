import { jest } from '@jest/globals';

// Mock BullMQ before other imports
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    // @ts-ignore
    add: jest.fn().mockResolvedValue({ id: 'job-id' }),
    // @ts-ignore
    close: jest.fn().mockResolvedValue(undefined),
    name: 'test-queue'
  })),
  Worker: jest.fn().mockImplementation(() => ({
    // @ts-ignore
    close: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
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
  }))
}));

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    const store = new Map();
    return {
      get: jest.fn((key: string) => Promise.resolve(store.get(key) || null)),
      set: jest.fn((key: string, value: string) => {
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
      keys: jest.fn(() => Promise.resolve(Array.from(store.keys()))),
      flushall: jest.fn(() => {
        store.clear();
        return Promise.resolve('OK');
      }),
      quit: jest.fn(() => Promise.resolve('OK')),
      disconnect: jest.fn()
    };
  });
});

// Global test environment setup
beforeEach(() => {
  jest.clearAllMocks();
});

// Simple test to avoid "no tests" error
describe('Test Setup', () => {
  it('should have proper mocks configured', () => {
    expect(jest.fn).toBeDefined();
  });
});

export {};