const express = require('express');
const { createNodeMiddleware, createProbot } = require('probot');
const automergeLogic = require('./src/automerge');
const billing = require('./src/billing');
const config = require('./src/config');

const app = express();

// GitHub App configuration with error handling
let probot = null;
try {
  if (process.env.APP_ID && process.env.PRIVATE_KEY) {
    probot = createProbot({
      appId: process.env.APP_ID,
      privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
      secret: process.env.WEBHOOK_SECRET || 'CHANGE_ME',
    });
  } else {
    console.warn('⚠️ GitHub App credentials not provided. Webhook handlers will not be available.');
  }
} catch (error) {
  console.error('❌ Failed to initialize Probot:', error.message);
  console.warn('⚠️ Continuing without GitHub App functionality. Webhook handlers will not be available.');
}

// Add middleware for parsing JSON (important for Lambda)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS headers for API Gateway
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Main automerge handler
if (probot) {
  probot.on(['pull_request'], async (context) => {
    const { payload, octokit } = context;
    
    try {
      // Log the event
      console.log(`Received pull_request event: ${payload.action} for PR #${payload.pull_request?.number}`);
      
      // Basic automerge logic using the automerge module
      if (payload.action === 'opened' || payload.action === 'synchronize') {
        const { pull_request: pr, repository } = payload;
        
        // Check if account has necessary permissions
        const installationId = payload.installation.id;
        const validation = billing.validateOperation(installationId, 'ai_analysis');
        
        // Use sophisticated automerge logic
        const evaluation = await automergeLogic.evaluateAutomergeRules(pr, repository, octokit);
        
        if (evaluation.shouldMerge) {
          console.log(`Auto-merging PR #${pr.number} - ${evaluation.reason}`);
          
          const success = await automergeLogic.performAutoMerge(pr, repository, octokit, evaluation.reason, evaluation.rule);
          
          if (success) {
            console.log(`✅ Successfully auto-merged PR #${pr.number}`);
          }
        } else {
          console.log(`❌ PR #${pr.number} does not qualify for auto-merge: ${evaluation.reason}`);
        }
      }
    } catch (error) {
      console.error('Error processing pull_request:', error);
    }
  });

  // Marketplace purchase events for billing
  probot.on(['marketplace_purchase'], async (context) => {
    const { payload } = context;
    
    try {
      console.log(`Received marketplace_purchase event: ${payload.action}`);
      
      // Handle billing logic using the billing module
      await billing.handleMarketplacePurchase(payload);
      
      console.log(`Successfully processed marketplace_purchase event: ${payload.action}`);
    } catch (error) {
      console.error('Error processing marketplace_purchase:', error);
    }
  });

  // Installation events
  probot.on(['installation', 'installation_repositories'], async (context) => {
    const { payload } = context;
    
    try {
      console.log(`Received installation event: ${payload.action}`);
      
      // Handle installation logic
      if (payload.action === 'created') {
        console.log(`App installed for account: ${payload.installation.account.login}`);
      } else if (payload.action === 'deleted') {
        console.log(`App uninstalled for account: ${payload.installation.account.login}`);
      }
      
      console.log(`Successfully processed installation event: ${payload.action}`);
    } catch (error) {
      console.error('Error processing installation:', error);
    }
  });
}

// Setup routes
if (probot) {
  app.use('/webhooks/github', createNodeMiddleware(probot));
} else {
  // Fallback webhook handler when Probot is not available
  app.post('/webhooks/github', (req, res) => {
    console.log('⚠️ Received GitHub webhook but Probot is not initialized');
    res.status(503).json({ 
      error: 'GitHub App not configured', 
      message: 'APP_ID and PRIVATE_KEY environment variables required' 
    });
  });
}

// Billing webhook endpoint for marketplace events
app.post('/webhooks/billing', (req, res) => {
  try {
    console.log('Received billing webhook:', req.body.action);
    billing.handleMarketplacePurchase(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling billing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'automerge-pro-server',
    environment: process.env.NODE_ENV || 'development',
    stage: process.env.STAGE || 'local',
    probot_initialized: probot !== null,
    github_app_configured: !!(process.env.APP_ID && process.env.PRIVATE_KEY)
  });
});

// API endpoint to get current configuration
app.get('/api/config', (req, res) => {
  res.json({
    plans: Object.values(billing.PLANS)
  });
});

// API endpoint to get subscription info
app.get('/api/billing/:accountId', (req, res) => {
  const accountId = parseInt(req.params.accountId);
  const subscription = billing.getSubscription(accountId);
  const limits = billing.getUsageLimits(accountId);
  
  res.json({
    subscription,
    limits,
    features: billing.getPlanFeatures(subscription?.plan?.name || 'Free')
  });
});

// API endpoint to validate operations
app.post('/api/validate/:accountId/:operation', (req, res) => {
  const accountId = parseInt(req.params.accountId);
  const operation = req.params.operation;
  const context = req.body || {};
  
  const validation = billing.validateOperation(accountId, operation, context);
  res.json(validation);
});

// Default route for Lambda health check
app.get('/', (req, res) => {
  res.json({
    message: 'Automerge-Pro GitHub App Backend',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      github_webhook: '/webhooks/github',
      billing_webhook: '/webhooks/billing',
      config: '/api/config',
      billing_info: '/api/billing/:accountId',
      validate_operation: '/api/validate/:accountId/:operation'
    }
  });
});

// Start the server (only when running locally, not in Lambda)
const PORT = process.env.PORT || 3000;

async function start() {
  // Only start server if not running in Lambda environment
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    app.listen(PORT, () => {
      console.log(`🚀 Automerge Pro app running on port ${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 Config endpoint: http://localhost:${PORT}/api/config`);
      console.log(`💰 Billing webhook: http://localhost:${PORT}/webhooks/billing`);
    });
  }
}

if (require.main === module) {
  start().catch(console.error);
}

module.exports = { app, probot };