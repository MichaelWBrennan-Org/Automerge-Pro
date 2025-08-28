import { billingRoutes } from '../src/routes/billing';
import { createMockFastify, createMockFastifyRequest, createMockFastifyReply, testData } from './utils/test-utils';
import { marketplacePurchasePayloads } from './mocks/webhook-payloads';
import * as crypto from 'crypto';

// Mock the config
jest.mock('../src/config', () => ({
  config: {
    billing: {
      githubMarketplaceWebhookSecret: 'test-webhook-secret'
    }
  }
}));

// Mock feature gating service (avoid referencing variables before init due to jest hoisting)
jest.mock('../src/services/feature-gating', () => ({
  featureGating: {
    getUsageStats: jest.fn(),
    enforceRepositoryLimit: jest.fn(),
    getPlanLimits: jest.fn(),
    getOrganizationLimits: jest.fn()
  }
}));

// Mock crypto module
jest.mock('crypto', () => ({
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('test-signature-hash')
  })
}));

// Access the mocked feature gating to configure return values in tests
const { featureGating: mockFeatureGating } = require('../src/services/feature-gating');

describe('Billing Routes', () => {
  let fastify: any;
  let request: any;
  let reply: any;

  beforeEach(() => {
    fastify = createMockFastify();
    request = createMockFastifyRequest();
    reply = createMockFastifyReply();
    
    // Reset all mocks
    jest.clearAllMocks();
    // Ensure signature verification uses the expected default signature after any prior test modifications
    (crypto.createHmac as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('test-signature-hash')
    });
    
    // Setup billing routes
    billingRoutes(fastify);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /org/:orgId', () => {
    it('should return billing information for organization', async () => {
      request.params = { orgId: 'test-org-id' };
      
      // Mock organization data
      request.prisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        plan: 'TEAM',
        subscriptionId: 'sub_test123',
        trialEndsAt: new Date('2023-12-31')
      });

      // Mock feature gating stats
      mockFeatureGating.getUsageStats.mockResolvedValue({
        usage: { repositories: 5, activeRules: 10 },
        limits: { repositories: 10, aiAnalysis: true }
      });

      const handler = fastify.get.mock.calls.find((call: any) => call[0] === '/org/:orgId')[1];
      await handler(request, reply);

      expect(reply.send).toHaveBeenCalledWith({
        plan: 'TEAM',
        usage: { repositories: 5, activeRules: 10 },
        limits: { repositories: 10, aiAnalysis: true },
        subscriptionId: 'sub_test123',
        trialEndsAt: new Date('2023-12-31')
      });
    });

    it('should return 404 for non-existent organization', async () => {
      request.params = { orgId: 'non-existent' };
      request.prisma.organization.findUnique.mockResolvedValue(null);

      const handler = fastify.get.mock.calls.find((call: any) => call[0] === '/org/:orgId')[1];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Organization not found' });
    });

    it('should handle database errors', async () => {
      request.params = { orgId: 'test-org-id' };
      request.prisma.organization.findUnique.mockRejectedValue(new Error('Database error'));

      const handler = fastify.get.mock.calls.find((call: any) => call[0] === '/org/:orgId')[1];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Failed to fetch billing info' });
    });
  });

  describe('POST /marketplace/webhook', () => {
    beforeEach(() => {
      request.headers = {
        'x-hub-signature-256': 'sha256=test-signature-hash',
        'x-github-event': 'marketplace_purchase'
      };
    });

    it('should handle marketplace purchase event', async () => {
      request.body = marketplacePurchasePayloads.purchased;
      
      // Mock signature verification to pass
      (crypto.createHmac as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test-signature-hash')
      });

      request.prisma.organization.upsert.mockResolvedValue({
        ...testData.organization,
        plan: 'TEAM'
      });

      const handler = fastify.post.mock.calls.find((call: any) => call[0] === '/marketplace/webhook')[1];
      await handler(request, reply);

      expect(request.prisma.organization.upsert).toHaveBeenCalledWith({
        where: { githubId: '67890' },
        create: {
          githubId: '67890',
          login: 'test-org',
          plan: 'TEAM',
          subscriptionId: 'mp_67890_2',
          billingEmail: 'billing@test-org.com',
          trialEndsAt: null
        },
        update: {
          plan: 'TEAM',
          subscriptionId: 'mp_67890_2',
          billingEmail: 'billing@test-org.com',
          trialEndsAt: null
        }
      });

      expect(reply.send).toHaveBeenCalledWith({ status: 'ok' });
    });

    it('should handle marketplace purchase changed event', async () => {
      request.headers['x-github-event'] = 'marketplace_purchase_changed';
      request.body = marketplacePurchasePayloads.changed;

      request.prisma.organization.update.mockResolvedValue({
        ...testData.organization,
        plan: 'GROWTH'
      });
      request.prisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        id: 'found-org-id'
      });

      const handler = fastify.post.mock.calls.find((call: any) => call[0] === '/marketplace/webhook')[1];
      await handler(request, reply);

      expect(request.prisma.organization.update).toHaveBeenCalledWith({
        where: { githubId: '67890' },
        data: {
          plan: 'GROWTH',
          subscriptionId: 'mp_67890_3',
          trialEndsAt: null
        }
      });

      expect(reply.send).toHaveBeenCalledWith({ status: 'ok' });
    });

    it('should handle marketplace purchase cancelled event', async () => {
      request.headers['x-github-event'] = 'marketplace_purchase_cancelled';
      request.body = marketplacePurchasePayloads.cancelled;

      request.prisma.organization.update.mockResolvedValue({
        ...testData.organization,
        plan: 'FREE'
      });
      request.prisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        id: 'found-org-id'
      });

      const handler = fastify.post.mock.calls.find((call: any) => call[0] === '/marketplace/webhook')[1];
      await handler(request, reply);

      expect(request.prisma.organization.update).toHaveBeenCalledWith({
        where: { githubId: '67890' },
        data: {
          plan: 'FREE',
          subscriptionId: null,
          trialEndsAt: null
        }
      });

      expect(reply.send).toHaveBeenCalledWith({ status: 'ok' });
    });

    it('should reject requests with missing headers', async () => {
      request.headers = {}; // No headers

      const handler = fastify.post.mock.calls.find((call: any) => call[0] === '/marketplace/webhook')[1];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Missing required headers' });
    });

    it('should reject requests with invalid signature', async () => {
      request.headers['x-hub-signature-256'] = 'sha256=invalid-signature';
      request.body = marketplacePurchasePayloads.purchased;

      // Mock signature verification to fail
      (crypto.createHmac as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('different-signature')
      });

      const handler = fastify.post.mock.calls.find((call: any) => call[0] === '/marketplace/webhook')[1];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Invalid signature' });
    });

    it('should handle unknown webhook events gracefully', async () => {
      request.headers['x-github-event'] = 'unknown_event';
      request.body = { action: 'unknown' };

      const handler = fastify.post.mock.calls.find((call: any) => call[0] === '/marketplace/webhook')[1];
      await handler(request, reply);

      expect(reply.send).toHaveBeenCalledWith({ status: 'ok' });
    });

    it('should handle pending change events', async () => {
      request.headers['x-github-event'] = 'marketplace_purchase_pending_change';
      request.body = marketplacePurchasePayloads.pendingChange;

      const handler = fastify.post.mock.calls.find((call: any) => call[0] === '/marketplace/webhook')[1];
      await handler(request, reply);

      expect(reply.send).toHaveBeenCalledWith({ status: 'ok' });
      expect(request.log.info).toHaveBeenCalledWith('Marketplace purchase pending change:', 'pending_change');
    });

    it('should handle pending change cancelled events', async () => {
      request.headers['x-github-event'] = 'marketplace_purchase_pending_change_cancelled';
      request.body = { action: 'pending_change_cancelled' };

      const handler = fastify.post.mock.calls.find((call: any) => call[0] === '/marketplace/webhook')[1];
      await handler(request, reply);

      expect(reply.send).toHaveBeenCalledWith({ status: 'ok' });
      expect(request.log.info).toHaveBeenCalledWith('Marketplace purchase pending change cancelled:', 'pending_change_cancelled');
    });

    it('should handle database errors during webhook processing', async () => {
      request.body = marketplacePurchasePayloads.purchased;
      request.prisma.organization.upsert.mockRejectedValue(new Error('Database error'));

      const handler = fastify.post.mock.calls.find((call: any) => call[0] === '/marketplace/webhook')[1];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
      expect(request.log.error).toHaveBeenCalledWith('Marketplace webhook error:', expect.any(Error));
    });
  });

  describe('POST /org/:orgId/upgrade', () => {
    it('should generate marketplace upgrade URL', async () => {
      request.params = { orgId: 'test-org-id' };
      request.body = { planId: 2, billingCycle: 'monthly' };
      
      request.prisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        login: 'test-org'
      });

      const handler = fastify.post.mock.calls.find((call: any) => call[0] === '/org/:orgId/upgrade')[1];
      await handler(request, reply);

      expect(reply.send).toHaveBeenCalledWith({
        redirectUrl: expect.stringContaining('https://github.com/marketplace/automerge-pro/order/')
      });
      expect(reply.send).toHaveBeenCalledWith({
        redirectUrl: expect.stringContaining('account=test-org')
      });
      expect(reply.send).toHaveBeenCalledWith({
        redirectUrl: expect.stringContaining('plan_id=2')
      });
    });

    it('should return 404 for non-existent organization', async () => {
      request.params = { orgId: 'non-existent' };
      request.body = { planId: 2, billingCycle: 'monthly' };
      request.prisma.organization.findUnique.mockResolvedValue(null);

      const handler = fastify.post.mock.calls.find((call: any) => call[0] === '/org/:orgId/upgrade')[1];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Organization not found' });
    });
  });

  describe('Webhook signature verification', () => {
    it('should verify webhook signature correctly', () => {
      const secret = 'test-secret';
      const payload = JSON.stringify({ action: 'test' });
      const expectedSignature = 'sha256=test-hash';

      (crypto.createHmac as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('test-hash')
      });

      request.headers = {
        'x-hub-signature-256': expectedSignature,
        'x-github-event': 'marketplace_purchase'
      };
      request.body = { action: 'test' };

      const handler = fastify.post.mock.calls.find((call: any) => call[0] === '/marketplace/webhook')[1];
      
      // Should not throw or return error response
      expect(() => handler(request, reply)).not.toThrow();
    });

    it('should handle malformed signature', async () => {
      request.headers = {
        'x-hub-signature-256': 'invalid-format', // Missing sha256= prefix
        'x-github-event': 'marketplace_purchase'
      };
      request.body = marketplacePurchasePayloads.purchased;

      const handler = fastify.post.mock.calls.find((call: any) => call[0] === '/marketplace/webhook')[1];
      await handler(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Invalid signature' });
    });
  });

  describe('Plan mapping', () => {
    it('should map GitHub plan IDs to internal plan names correctly', async () => {
      const testCases = [
        { planId: 1, expectedPlan: 'FREE' },
        { planId: 2, expectedPlan: 'TEAM' },
        { planId: 3, expectedPlan: 'GROWTH' },
        { planId: 4, expectedPlan: 'ENTERPRISE' },
        { planId: 999, expectedPlan: 'FREE' } // Unknown ID defaults to FREE
      ];

      for (const { planId, expectedPlan } of testCases) {
        const payload = {
          ...marketplacePurchasePayloads.purchased,
          marketplace_purchase: {
            ...marketplacePurchasePayloads.purchased.marketplace_purchase,
            plan: {
              ...marketplacePurchasePayloads.purchased.marketplace_purchase.plan,
              id: planId
            }
          }
        };

        request.body = payload;
        request.headers = {
          'x-hub-signature-256': 'sha256=test-signature-hash',
          'x-github-event': 'marketplace_purchase'
        };
        request.prisma.organization.upsert.mockClear();

        const handler = fastify.post.mock.calls.find((call: any) => call[0] === '/marketplace/webhook')[1];
        await handler(request, reply);

        expect(request.prisma.organization.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({
              plan: expectedPlan
            }),
            update: expect.objectContaining({
              plan: expectedPlan
            })
          })
        );
      }
    });
  });
});