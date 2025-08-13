import Stripe from 'stripe';
import { config } from '../config';
import { PrismaClient } from '@prisma/client';

// Initialize Stripe with secret key
const stripe = new Stripe(config.stripe?.secretKey || process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  organizationId: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  repositoryLimit: number;
  stripePriceId: string;
}

// Define subscription plans with Stripe price IDs
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: ['1 repository', 'Basic automerge rules', 'Community support'],
    repositoryLimit: 1,
    stripePriceId: ''
  },
  TEAM: {
    id: 'team',
    name: 'Team',
    price: 99,
    interval: 'month',
    features: ['10 repositories', 'AI analysis', 'Advanced rules', 'Slack notifications', 'Priority support'],
    repositoryLimit: 10,
    stripePriceId: process.env.STRIPE_TEAM_PRICE_ID || 'price_team_monthly'
  },
  GROWTH: {
    id: 'growth',
    name: 'Growth',
    price: 299,
    interval: 'month',
    features: ['Unlimited repositories', 'Premium AI models', 'Compliance checks', 'Webhooks', 'Custom integrations'],
    repositoryLimit: -1,
    stripePriceId: process.env.STRIPE_GROWTH_PRICE_ID || 'price_growth_monthly'
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999,
    interval: 'month',
    features: ['Everything in Growth', 'SSO integration', 'On-premise deployment', 'Custom SLA', 'Dedicated support'],
    repositoryLimit: -1,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly'
  }
};

export class StripeBillingService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a Stripe customer for an organization
   */
  async createCustomer(organizationId: string, email: string, name?: string): Promise<StripeCustomer> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          organizationId
        }
      });

      // Store customer ID in database
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: { stripeCustomerId: customer.id }
      });

      return {
        id: customer.id,
        email,
        name,
        organizationId
      };
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  /**
   * Create a Stripe Checkout session for subscription upgrade
   */
  async createCheckoutSession(
    organizationId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    try {
      const plan = SUBSCRIPTION_PLANS[planId.toUpperCase()];
      if (!plan || !plan.stripePriceId) {
        throw new Error('Invalid plan or missing Stripe price ID');
      }

      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId }
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      let customerId = org.stripeCustomerId;

      // Create customer if doesn't exist
      if (!customerId) {
        const customer = await this.createCustomer(organizationId, org.email || 'unknown@example.com', org.name);
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        metadata: {
          organizationId,
          planId
        }
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  /**
   * Handle successful subscription creation from Stripe webhook
   */
  async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = subscription.customer as string;
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      
      if (!customer.metadata?.organizationId) {
        throw new Error('Organization ID not found in customer metadata');
      }

      const organizationId = customer.metadata.organizationId;
      
      // Get plan info from subscription
      const priceId = subscription.items.data[0]?.price.id;
      const planId = Object.keys(SUBSCRIPTION_PLANS).find(
        key => SUBSCRIPTION_PLANS[key].stripePriceId === priceId
      ) || 'FREE';

      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          plan: planId,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: customerId,
          subscriptionStatus: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        }
      });

      console.log(`Subscription created for organization ${organizationId}, plan: ${planId}`);
    } catch (error) {
      console.error('Error handling subscription created:', error);
      throw error;
    }
  }

  /**
   * Handle subscription updated from Stripe webhook
   */
  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = subscription.customer as string;
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      
      if (!customer.metadata?.organizationId) {
        throw new Error('Organization ID not found in customer metadata');
      }

      const organizationId = customer.metadata.organizationId;

      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          subscriptionStatus: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        }
      });

      console.log(`Subscription updated for organization ${organizationId}, status: ${subscription.status}`);
    } catch (error) {
      console.error('Error handling subscription updated:', error);
      throw error;
    }
  }

  /**
   * Handle subscription deleted/cancelled from Stripe webhook
   */
  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = subscription.customer as string;
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      
      if (!customer.metadata?.organizationId) {
        throw new Error('Organization ID not found in customer metadata');
      }

      const organizationId = customer.metadata.organizationId;

      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          plan: 'FREE',
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: null,
        }
      });

      console.log(`Subscription canceled for organization ${organizationId}`);
    } catch (error) {
      console.error('Error handling subscription deleted:', error);
      throw error;
    }
  }

  /**
   * Create a billing portal session for customer to manage subscription
   */
  async createBillingPortalSession(organizationId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    try {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId }
      });

      if (!org?.stripeCustomerId) {
        throw new Error('No Stripe customer found for organization');
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: org.stripeCustomerId,
        return_url: returnUrl,
      });

      return session;
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      throw new Error('Failed to create billing portal session');
    }
  }

  /**
   * Get subscription details for an organization
   */
  async getSubscriptionDetails(organizationId: string) {
    try {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId }
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      const plan = SUBSCRIPTION_PLANS[org.plan] || SUBSCRIPTION_PLANS.FREE;

      let subscriptionDetails = null;
      if (org.stripeSubscriptionId) {
        try {
          subscriptionDetails = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
        } catch (error) {
          console.warn('Failed to retrieve Stripe subscription:', error);
        }
      }

      return {
        plan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          features: plan.features,
          repositoryLimit: plan.repositoryLimit
        },
        subscription: subscriptionDetails ? {
          id: subscriptionDetails.id,
          status: subscriptionDetails.status,
          currentPeriodStart: new Date(subscriptionDetails.current_period_start * 1000),
          currentPeriodEnd: new Date(subscriptionDetails.current_period_end * 1000),
          cancelAtPeriodEnd: subscriptionDetails.cancel_at_period_end
        } : null,
        customer: org.stripeCustomerId
      };
    } catch (error) {
      console.error('Error getting subscription details:', error);
      throw new Error('Failed to get subscription details');
    }
  }

  /**
   * Calculate usage-based pricing adjustments
   */
  async calculateUsageBasedPricing(organizationId: string): Promise<{
    basePrice: number;
    usageOverage: number;
    totalPrice: number;
  }> {
    try {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          installations: {
            include: {
              repositories: true
            }
          }
        }
      });

      if (!org) {
        throw new Error('Organization not found');
      }

      const plan = SUBSCRIPTION_PLANS[org.plan] || SUBSCRIPTION_PLANS.FREE;
      const totalRepositories = org.installations.reduce((sum, inst) => sum + inst.repositories.length, 0);

      let usageOverage = 0;
      if (plan.repositoryLimit > 0 && totalRepositories > plan.repositoryLimit) {
        const overage = totalRepositories - plan.repositoryLimit;
        usageOverage = overage * 10; // $10 per additional repository
      }

      return {
        basePrice: plan.price,
        usageOverage,
        totalPrice: plan.price + usageOverage
      };
    } catch (error) {
      console.error('Error calculating usage-based pricing:', error);
      throw new Error('Failed to calculate pricing');
    }
  }
}

export default StripeBillingService;