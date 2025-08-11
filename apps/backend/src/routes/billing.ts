import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { config } from '../config';
import { featureGating } from '../services/feature-gating';

interface MarketplacePlan {
  id: number;
  name: string;
  description: string;
  monthly_price_in_cents: number;
  yearly_price_in_cents: number;
  price_model: string;
  has_free_trial: boolean;
  unit_name: string;
  bullets: string[];
}

interface MarketplaceAccount {
  type: string;
  id: number;
  node_id: string;
  login: string;
  organization_billing_email?: string;
}

interface MarketplacePurchase {
  account: MarketplaceAccount;
  billing_cycle: string;
  unit_count: number;
  on_free_trial: boolean;
  free_trial_ends_on?: string;
  next_billing_date?: string;
  plan: MarketplacePlan;
}

const PLAN_MAPPING: Record<number, string> = {
  1: 'FREE',
  2: 'TEAM', 
  3: 'GROWTH',
  4: 'ENTERPRISE'
};

export async function billingRoutes(fastify: FastifyInstance) {
  // Get billing info
  fastify.get('/org/:orgId', async (request: FastifyRequest<{
    Params: { orgId: string }
  }>, reply: FastifyReply) => {
    const { orgId } = request.params;

    try {
      const stats = await featureGating.getUsageStats(orgId);
      
      const org = await request.prisma.organization.findUnique({
        where: { id: orgId }
      });

      if (!org) {
        return reply.status(404).send({ error: 'Organization not found' });
      }

      return reply.send({
        plan: org.plan,
        usage: stats.usage,
        limits: stats.limits,
        subscriptionId: org.subscriptionId,
        trialEndsAt: org.trialEndsAt
      });
    } catch (error) {
      request.log.error('Error fetching billing info:', error);
      return reply.status(500).send({ error: 'Failed to fetch billing info' });
    }
  });

  // GitHub Marketplace webhook
  fastify.post('/marketplace/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-hub-signature-256'] as string;
    const event = request.headers['x-github-event'] as string;

    if (!signature || !event) {
      return reply.status(400).send({ error: 'Missing required headers' });
    }

    // Verify webhook signature
    const payload = JSON.stringify(request.body);
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', config.billing.githubMarketplaceWebhookSecret)
      .update(payload)
      .digest('hex')}`;

    if (signature !== expectedSignature) {
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    try {
      switch (event) {
        case 'marketplace_purchase':
          await handleMarketplacePurchase(request.body as any, request);
          break;
        case 'marketplace_purchase_changed':
          await handleMarketplacePurchaseChanged(request.body as any, request);
          break;
        case 'marketplace_purchase_cancelled':
          await handleMarketplacePurchaseCancelled(request.body as any, request);
          break;
        case 'marketplace_purchase_pending_change':
          await handleMarketplacePurchasePendingChange(request.body as any, request);
          break;
        case 'marketplace_purchase_pending_change_cancelled':
          await handleMarketplacePurchasePendingChangeCancelled(request.body as any, request);
          break;
      }

      return reply.send({ status: 'ok' });
    } catch (error) {
      request.log.error('Marketplace webhook error:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Plan upgrade endpoint
  fastify.post('/org/:orgId/upgrade', async (request: FastifyRequest<{
    Params: { orgId: string };
    Body: { planId: number; billingCycle: string };
  }>, reply: FastifyReply) => {
    // This would redirect to GitHub Marketplace for plan purchase
    const { orgId } = request.params;
    const { planId } = request.body;

    const org = await request.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org) {
      return reply.status(404).send({ error: 'Organization not found' });
    }

    // Generate GitHub Marketplace URL
    const marketplaceUrl = `https://github.com/marketplace/automerge-pro/order/MDEyOk1hcmtldHBsYWNlTGlzdGluZw%3D%3D?account=${org.login}&plan_id=${planId}`;

    return reply.send({ 
      redirectUrl: marketplaceUrl 
    });
  });
}

async function handleMarketplacePurchase(payload: any, request: FastifyRequest) {
  const purchase: MarketplacePurchase = payload.marketplace_purchase;
  const action = payload.action;

  if (action === 'purchased') {
    const plan = PLAN_MAPPING[purchase.plan.id] || 'FREE';
    
    await request.prisma.organization.upsert({
      where: { githubId: purchase.account.id.toString() },
      create: {
        githubId: purchase.account.id.toString(),
        login: purchase.account.login,
        plan: plan as any,
        subscriptionId: `mp_${purchase.account.id}_${purchase.plan.id}`,
        billingEmail: purchase.account.organization_billing_email,
        trialEndsAt: purchase.free_trial_ends_on ? new Date(purchase.free_trial_ends_on) : null
      },
      update: {
        plan: plan as any,
        subscriptionId: `mp_${purchase.account.id}_${purchase.plan.id}`,
        billingEmail: purchase.account.organization_billing_email,
        trialEndsAt: purchase.free_trial_ends_on ? new Date(purchase.free_trial_ends_on) : null
      }
    });

    request.log.info(`Plan purchased: ${purchase.account.login} -> ${plan}`);
  }
}

async function handleMarketplacePurchaseChanged(payload: any, request: FastifyRequest) {
  const purchase: MarketplacePurchase = payload.marketplace_purchase;
  const action = payload.action;

  if (action === 'changed') {
    const plan = PLAN_MAPPING[purchase.plan.id] || 'FREE';
    
    await request.prisma.organization.update({
      where: { githubId: purchase.account.id.toString() },
      data: {
        plan: plan as any,
        subscriptionId: `mp_${purchase.account.id}_${purchase.plan.id}`,
        trialEndsAt: purchase.free_trial_ends_on ? new Date(purchase.free_trial_ends_on) : null
      }
    });

    // Enforce new plan limits
    const org = await request.prisma.organization.findUnique({
      where: { githubId: purchase.account.id.toString() }
    });

    if (org) {
      await featureGating.enforceRepositoryLimit(org.id);
    }

    request.log.info(`Plan changed: ${purchase.account.login} -> ${plan}`);
  }
}

async function handleMarketplacePurchaseCancelled(payload: any, request: FastifyRequest) {
  const purchase: MarketplacePurchase = payload.marketplace_purchase;
  const action = payload.action;

  if (action === 'cancelled') {
    await request.prisma.organization.update({
      where: { githubId: purchase.account.id.toString() },
      data: {
        plan: 'FREE',
        subscriptionId: null,
        trialEndsAt: null
      }
    });

    // Enforce free plan limits
    const org = await request.prisma.organization.findUnique({
      where: { githubId: purchase.account.id.toString() }
    });

    if (org) {
      await featureGating.enforceRepositoryLimit(org.id);
    }

    request.log.info(`Plan cancelled: ${purchase.account.login} -> FREE`);
  }
}

async function handleMarketplacePurchasePendingChange(payload: any, request: FastifyRequest) {
  // Handle pending plan changes if needed
  request.log.info('Marketplace purchase pending change:', payload.action);
}

async function handleMarketplacePurchasePendingChangeCancelled(payload: any, request: FastifyRequest) {
  // Handle cancelled pending plan changes if needed
  request.log.info('Marketplace purchase pending change cancelled:', payload.action);
}