/**
 * Billing Module
 * Handles GitHub Marketplace purchases and subscription management
 */

/**
 * Available subscription plans
 */
const PLANS = {
  FREE: {
    name: 'Free',
    description: '1 repo, basic automerge rules',
    monthly_price_in_cents: 0,
    yearly_price_in_cents: 0,
    number_of_repos: 1,
    features: ['basic_rules', 'single_repo']
  },
  PRO: {
    name: 'Pro',
    description: 'Unlimited repos, advanced rules, compliance checks',
    monthly_price_in_cents: 1500,
    yearly_price_in_cents: 15000,
    number_of_repos: -1,
    features: ['unlimited_repos', 'advanced_rules', 'compliance_checks', 'ai_analysis']
  },
  ENTERPRISE: {
    name: 'Enterprise',
    description: 'Unlimited repos + priority support & custom merge policies',
    monthly_price_in_cents: 5000,
    yearly_price_in_cents: 50000,
    number_of_repos: -1,
    features: ['unlimited_repos', 'advanced_rules', 'compliance_checks', 'ai_analysis', 'priority_support', 'custom_policies']
  }
};

// In-memory storage for demo purposes (replace with database in production)
const subscriptions = new Map();

/**
 * Handles marketplace purchase events
 * @param {Object} payload - The marketplace_purchase webhook payload
 */
async function handleMarketplacePurchase(payload) {
  const { action, marketplace_purchase } = payload;
  
  try {
    console.log(`Processing marketplace purchase: ${action}`);
    
    switch (action) {
      case 'purchased':
        await handlePurchase(marketplace_purchase);
        break;
      case 'changed':
        await handlePlanChange(marketplace_purchase);
        break;
      case 'cancelled':
        await handleCancellation(marketplace_purchase);
        break;
      case 'pending_change':
        await handlePendingChange(marketplace_purchase);
        break;
      case 'pending_change_cancelled':
        await handlePendingChangeCancellation(marketplace_purchase);
        break;
      default:
        console.log(`Unknown marketplace action: ${action}`);
    }
  } catch (error) {
    console.error('Error handling marketplace purchase:', error);
    throw error;
  }
}

/**
 * Handles new subscription purchases
 * @param {Object} purchase - The marketplace purchase data
 */
async function handlePurchase(purchase) {
  const accountId = purchase.account.id;
  const planName = purchase.plan.name;
  
  console.log(`New subscription: ${planName} for account ${purchase.account.login} (ID: ${accountId})`);
  
  // Store subscription info
  subscriptions.set(accountId, {
    account: purchase.account,
    plan: purchase.plan,
    status: 'active',
    purchased_at: new Date().toISOString(),
    features: getPlanFeatures(planName)
  });
  
  // Log the purchase
  console.log(`✅ Subscription activated for ${purchase.account.login}`);
  
  // TODO: Send welcome email or notification
  // TODO: Enable features for the account
}

/**
 * Handles subscription plan changes
 * @param {Object} purchase - The marketplace purchase data
 */
async function handlePlanChange(purchase) {
  const accountId = purchase.account.id;
  const newPlanName = purchase.plan.name;
  
  console.log(`Plan change: ${newPlanName} for account ${purchase.account.login} (ID: ${accountId})`);
  
  // Update subscription
  const existing = subscriptions.get(accountId) || {};
  subscriptions.set(accountId, {
    ...existing,
    account: purchase.account,
    plan: purchase.plan,
    status: 'active',
    changed_at: new Date().toISOString(),
    features: getPlanFeatures(newPlanName)
  });
  
  console.log(`✅ Plan updated to ${newPlanName} for ${purchase.account.login}`);
  
  // TODO: Update feature access
  // TODO: Send confirmation email
}

/**
 * Handles subscription cancellations
 * @param {Object} purchase - The marketplace purchase data
 */
async function handleCancellation(purchase) {
  const accountId = purchase.account.id;
  
  console.log(`Cancellation: account ${purchase.account.login} (ID: ${accountId})`);
  
  // Update subscription status
  const existing = subscriptions.get(accountId) || {};
  subscriptions.set(accountId, {
    ...existing,
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    features: getPlanFeatures('Free') // Revert to free features
  });
  
  console.log(`❌ Subscription cancelled for ${purchase.account.login}`);
  
  // TODO: Disable premium features
  // TODO: Send cancellation confirmation
}

/**
 * Handles pending plan changes
 * @param {Object} purchase - The marketplace purchase data
 */
async function handlePendingChange(purchase) {
  const accountId = purchase.account.id;
  
  console.log(`Pending change: ${purchase.plan.name} for account ${purchase.account.login}`);
  
  // Store pending change info
  const existing = subscriptions.get(accountId) || {};
  subscriptions.set(accountId, {
    ...existing,
    pending_change: {
      plan: purchase.plan,
      effective_date: purchase.effective_date
    }
  });
}

/**
 * Handles pending change cancellations
 * @param {Object} purchase - The marketplace purchase data
 */
async function handlePendingChangeCancellation(purchase) {
  const accountId = purchase.account.id;
  
  console.log(`Pending change cancelled for account ${purchase.account.login}`);
  
  // Remove pending change
  const existing = subscriptions.get(accountId) || {};
  delete existing.pending_change;
  subscriptions.set(accountId, existing);
}

/**
 * Gets features available for a plan
 * @param {string} planName - The plan name
 * @returns {Array} Array of feature names
 */
function getPlanFeatures(planName) {
  const plan = Object.values(PLANS).find(p => p.name.toLowerCase() === planName.toLowerCase());
  return plan ? plan.features : PLANS.FREE.features;
}

/**
 * Checks if an account has a specific feature
 * @param {number} accountId - The account ID
 * @param {string} feature - The feature name
 * @returns {boolean} Whether the account has the feature
 */
function hasFeature(accountId, feature) {
  const subscription = subscriptions.get(accountId);
  
  if (!subscription || subscription.status === 'cancelled') {
    // Free plan features
    return PLANS.FREE.features.includes(feature);
  }
  
  return subscription.features.includes(feature);
}

/**
 * Gets the subscription info for an account
 * @param {number} accountId - The account ID
 * @returns {Object|null} Subscription info or null if not found
 */
function getSubscription(accountId) {
  return subscriptions.get(accountId) || null;
}

/**
 * Gets usage limits for an account
 * @param {number} accountId - The account ID
 * @returns {Object} Usage limits
 */
function getUsageLimits(accountId) {
  const subscription = subscriptions.get(accountId);
  
  if (!subscription || subscription.status === 'cancelled') {
    return {
      max_repos: PLANS.FREE.number_of_repos,
      max_rules: 3,
      ai_analysis: false,
      priority_support: false
    };
  }
  
  const planName = subscription.plan.name.toLowerCase();
  
  switch (planName) {
    case 'pro':
      return {
        max_repos: -1,
        max_rules: -1,
        ai_analysis: true,
        priority_support: false
      };
    case 'enterprise':
      return {
        max_repos: -1,
        max_rules: -1,
        ai_analysis: true,
        priority_support: true
      };
    default:
      return {
        max_repos: 1,
        max_rules: 3,
        ai_analysis: false,
        priority_support: false
      };
  }
}

/**
 * Validates if an operation is allowed for an account
 * @param {number} accountId - The account ID
 * @param {string} operation - The operation type
 * @param {Object} context - Additional context (e.g., current repo count)
 * @returns {Object} Validation result
 */
function validateOperation(accountId, operation, context = {}) {
  const limits = getUsageLimits(accountId);
  const subscription = subscriptions.get(accountId);
  
  switch (operation) {
    case 'add_repository':
      if (limits.max_repos === -1) {
        return { allowed: true };
      }
      if ((context.current_repos || 0) >= limits.max_repos) {
        return { 
          allowed: false, 
          reason: `Repository limit reached (${limits.max_repos}). Upgrade your plan for unlimited repositories.`,
          upgrade_required: true
        };
      }
      return { allowed: true };
      
    case 'create_rule':
      if (limits.max_rules === -1) {
        return { allowed: true };
      }
      if ((context.current_rules || 0) >= limits.max_rules) {
        return { 
          allowed: false, 
          reason: `Rule limit reached (${limits.max_rules}). Upgrade your plan for unlimited rules.`,
          upgrade_required: true
        };
      }
      return { allowed: true };
      
    case 'ai_analysis':
      if (limits.ai_analysis) {
        return { allowed: true };
      }
      return { 
        allowed: false, 
        reason: 'AI analysis requires Pro or Enterprise plan.',
        upgrade_required: true
      };
      
    default:
      return { allowed: true };
  }
}

module.exports = {
  PLANS,
  handleMarketplacePurchase,
  hasFeature,
  getSubscription,
  getUsageLimits,
  validateOperation,
  getPlanFeatures
};