import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import crypto from 'crypto';
import { config } from '../config';
import { StripeBillingService, SUBSCRIPTION_PLANS } from '../services/stripe-billing';

interface CreateCheckoutRequest {
  Body: {
    planId: string;
    successUrl: string;
    cancelUrl: string;
  };
  Params: {
    orgId: string;
  };
}

interface StripeWebhookRequest {
  Body: any;
  Headers: {
    'stripe-signature': string;
  };
}

export async function stripeRoutes(fastify: FastifyInstance) {
  const stripeBilling = new StripeBillingService(fastify.prisma);

  // Get all available subscription plans
  fastify.get('/plans', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const plans = Object.values(SUBSCRIPTION_PLANS).map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        interval: plan.interval,
        features: plan.features,
        repositoryLimit: plan.repositoryLimit === -1 ? 'Unlimited' : plan.repositoryLimit
      }));

      return reply.send({ plans });
    } catch (error) {
      request.log.error('Error fetching plans:', error);
      return reply.status(500).send({ error: 'Failed to fetch plans' });
    }
  });

  // Create Stripe Checkout session for subscription upgrade
  fastify.post<CreateCheckoutRequest>('/checkout/:orgId', async (request, reply) => {
    const { orgId } = request.params;
    const { planId, successUrl, cancelUrl } = request.body;

    try {
      // Validate plan exists
      if (!SUBSCRIPTION_PLANS[planId.toUpperCase()]) {
        return reply.status(400).send({ error: 'Invalid plan ID' });
      }

      const session = await stripeBilling.createCheckoutSession(
        orgId,
        planId,
        successUrl,
        cancelUrl
      );

      return reply.send({
        sessionId: session.id,
        url: session.url
      });
    } catch (error) {
      request.log.error('Error creating checkout session:', error);
      return reply.status(500).send({ error: 'Failed to create checkout session' });
    }
  });

  // Create billing portal session for subscription management
  fastify.post('/portal/:orgId', async (request: FastifyRequest<{
    Params: { orgId: string };
    Body: { returnUrl: string };
  }>, reply: FastifyReply) => {
    const { orgId } = request.params;
    const { returnUrl } = request.body;

    try {
      const session = await stripeBilling.createBillingPortalSession(orgId, returnUrl);

      return reply.send({
        url: session.url
      });
    } catch (error) {
      request.log.error('Error creating billing portal session:', error);
      return reply.status(500).send({ error: 'Failed to create billing portal session' });
    }
  });

  // Get subscription details for organization
  fastify.get('/subscription/:orgId', async (request: FastifyRequest<{
    Params: { orgId: string };
  }>, reply: FastifyReply) => {
    const { orgId } = request.params;

    try {
      const details = await stripeBilling.getSubscriptionDetails(orgId);
      return reply.send(details);
    } catch (error) {
      request.log.error('Error fetching subscription details:', error);
      return reply.status(500).send({ error: 'Failed to fetch subscription details' });
    }
  });

  // Get usage-based pricing calculation
  fastify.get('/pricing/:orgId', async (request: FastifyRequest<{
    Params: { orgId: string };
  }>, reply: FastifyReply) => {
    const { orgId } = request.params;

    try {
      const pricing = await stripeBilling.calculateUsageBasedPricing(orgId);
      return reply.send(pricing);
    } catch (error) {
      request.log.error('Error calculating pricing:', error);
      return reply.status(500).send({ error: 'Failed to calculate pricing' });
    }
  });

  // Stripe webhook handler
  fastify.post<StripeWebhookRequest>('/webhook', async (request, reply) => {
    const signature = request.headers['stripe-signature'];
    
    if (!signature) {
      return reply.status(400).send({ error: 'Missing Stripe signature' });
    }

    try {
      // Verify webhook signature
      const event = Stripe.webhooks.constructEvent(
        JSON.stringify(request.body),
        signature,
        config.stripe.webhookSecret
      );

      request.log.info('Processing Stripe webhook:', { type: event.type, id: event.id });

      // Handle different webhook events
      switch (event.type) {
        case 'customer.subscription.created':
          await stripeBilling.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await stripeBilling.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await stripeBilling.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          request.log.info('Payment succeeded:', event.data.object);
          // Could trigger success emails, notifications, etc.
          break;

        case 'invoice.payment_failed':
          request.log.warn('Payment failed:', event.data.object);
          // Could trigger retry logic, notifications, etc.
          break;

        case 'customer.subscription.trial_will_end':
          request.log.info('Trial ending soon:', event.data.object);
          // Could trigger trial ending notifications
          break;

        default:
          request.log.info('Unhandled webhook event type:', event.type);
      }

      return reply.send({ received: true });
    } catch (error) {
      request.log.error('Stripe webhook error:', error);
      return reply.status(400).send({ error: 'Webhook signature verification failed' });
    }
  });

  // Lead capture and trial conversion
  fastify.post('/trial-signup', async (request: FastifyRequest<{
    Body: {
      email: string;
      name?: string;
      company?: string;
      githubHandle?: string;
      planId?: string;
    };
  }>, reply: FastifyReply) => {
    const { email, name, company, githubHandle, planId = 'team' } = request.body;

    try {
      // Basic email validation
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return reply.status(400).send({ error: 'Valid email is required' });
      }

      // Create organization record for trial
      const org = await request.prisma.organization.create({
        data: {
          id: crypto.randomUUID(),
          name: company || name || email.split('@')[0],
          email,
          plan: 'FREE', // Start with free, upgrade to trial
          subscriptionStatus: 'trialing',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
          metadata: {
            signupSource: 'stripe_trial',
            githubHandle,
            requestedPlan: planId,
            signupDate: new Date().toISOString()
          }
        }
      });

      // Send welcome email (if email service is configured)
      try {
        // Could integrate with email service here
        request.log.info('Trial signup completed:', { organizationId: org.id, email });
      } catch (emailError) {
        request.log.warn('Failed to send welcome email:', emailError);
      }

      return reply.send({
        organizationId: org.id,
        trialEndsAt: org.trialEndsAt,
        message: 'Trial signup successful! You have 14 days to try all features.'
      });
    } catch (error) {
      request.log.error('Error during trial signup:', error);
      return reply.status(500).send({ error: 'Failed to process trial signup' });
    }
  });

  // Lead capture for demo requests
  fastify.post('/demo-request', async (request: FastifyRequest<{
    Body: {
      email: string;
      name: string;
      company: string;
      message?: string;
      repositories?: number;
      teamSize?: number;
    };
  }>, reply: FastifyReply) => {
    const { email, name, company, message, repositories, teamSize } = request.body;

    try {
      // Basic validation
      if (!email || !name || !company) {
        return reply.status(400).send({ error: 'Email, name, and company are required' });
      }

      // Store demo request
      const demoRequest = await request.prisma.demoRequest.create({
        data: {
          id: crypto.randomUUID(),
          email,
          name,
          company,
          message,
          repositories,
          teamSize,
          requestedAt: new Date(),
          status: 'pending'
        }
      });

      // Could integrate with CRM, send notification to sales team, etc.
      request.log.info('Demo request received:', { id: demoRequest.id, company, email });

      return reply.send({
        id: demoRequest.id,
        message: 'Demo request received! Our team will contact you within 24 hours.'
      });
    } catch (error) {
      request.log.error('Error processing demo request:', error);
      return reply.status(500).send({ error: 'Failed to process demo request' });
    }
  });

  // Get conversion metrics for revenue tracking
  fastify.get('/metrics/conversion', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [
        totalSignups,
        paidConversions,
        trialConversions,
        revenueData
      ] = await Promise.all([
        // Total signups in last 30 days
        request.prisma.organization.count({
          where: {
            createdAt: { gte: thirtyDaysAgo }
          }
        }),

        // Paid conversions
        request.prisma.organization.count({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            plan: { not: 'FREE' },
            subscriptionStatus: 'active'
          }
        }),

        // Trial to paid conversions
        request.prisma.organization.count({
          where: {
            createdAt: { gte: thirtyDaysAgo },
            subscriptionStatus: 'active',
            trialEndsAt: { not: null }
          }
        }),

        // Revenue by plan
        request.prisma.organization.findMany({
          where: {
            subscriptionStatus: 'active',
            plan: { not: 'FREE' }
          },
          select: {
            plan: true
          }
        })
      ]);

      const monthlyRevenue = revenueData.reduce((sum, org) => {
        const plan = SUBSCRIPTION_PLANS[org.plan];
        return sum + (plan?.price || 0);
      }, 0);

      const conversionRate = totalSignups > 0 ? (paidConversions / totalSignups) * 100 : 0;

      return reply.send({
        period: '30_days',
        totalSignups,
        paidConversions,
        trialConversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        monthlyRecurringRevenue: monthlyRevenue,
        projectedAnnualRevenue: monthlyRevenue * 12
      });
    } catch (error) {
      request.log.error('Error fetching conversion metrics:', error);
      return reply.status(500).send({ error: 'Failed to fetch metrics' });
    }
  });
}

export default stripeRoutes;