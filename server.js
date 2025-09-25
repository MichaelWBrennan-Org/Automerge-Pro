const express = require('express');
const session = require('express-session');
const { createNodeMiddleware, createProbot } = require('probot');
const automergeLogic = require('./src/automerge');
const billing = require('./src/billing');
const config = require('./src/config');
const { analyzeNextFilesPullRequest } = require('./apps/backend/src/services/ai-analyzer');
const crypto = require('crypto');
const { Octokit } = require('@octokit/rest');
const { createAppAuth } = require('@octokit/auth-app');

// DynamoDB client for license storage
const DynamoDB = require('aws-sdk/clients/dynamodb');
const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

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

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'automerge-pro-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

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
          
          const success = await automergeLogic.performAutoMerge(pr, repository, octokit, evaluation.reason, evaluation.rule, evaluation);
          
          if (success) {
            console.log(`✅ Successfully auto-merged PR #${pr.number}`);
          }
        } else {
          console.log(`❌ PR #${pr.number} does not qualify for auto-merge: ${evaluation.reason}`);
          
          // Add a comment explaining why the PR wasn't merged
          if (evaluation.reason !== 'evaluation-error') {
            await octokit.rest.issues.createComment({
              owner: repository.owner.login,
              repo: repository.name,
              issue_number: pr.number,
              body: `❌ **AutoMerge Pro** - PR not eligible for auto-merge\n\n**Reason:** ${evaluation.reason}\n\nThis PR doesn't meet the criteria for automatic merging. Please review manually or adjust your AutoMerge Pro configuration.`
            });
          }
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

// License validation endpoint
app.post('/validate-license', async (req, res) => {
  try {
    const { accountId, licenseKey, operation } = req.body;
    
    if (!accountId || !licenseKey) {
      return res.status(400).json({
        valid: false,
        error: 'Missing required fields: accountId, licenseKey'
      });
    }

    // Query license from DynamoDB
    const licenseTable = process.env.LICENSE_TABLE || `automerge-pro-licenses-${process.env.STAGE || 'dev'}`;
    
    try {
      const result = await dynamodb.get({
        TableName: licenseTable,
        Key: { accountId: accountId.toString() }
      }).promise();
      
      const license = result.Item;
      
      if (!license) {
        return res.status(404).json({
          valid: false,
          error: 'License not found'
        });
      }

      // Validate license key
      const expectedKey = crypto.createHash('sha256')
        .update(`${accountId}-${license.subscriptionId}-${process.env.WEBHOOK_SECRET || 'default'}`)
        .digest('hex');
      
      if (licenseKey !== expectedKey) {
        return res.status(401).json({
          valid: false,
          error: 'Invalid license key'
        });
      }

      // Check if license is active
      if (license.status !== 'active') {
        return res.status(403).json({
          valid: false,
          error: `License status: ${license.status}`,
          status: license.status
        });
      }

      // Validate specific operation if provided
      let operationAllowed = true;
      let reason = null;
      
      if (operation) {
        const validation = billing.validateOperation(parseInt(accountId), operation, req.body);
        operationAllowed = validation.allowed;
        reason = validation.reason;
      }

      // Log successful license validation
      console.log(`✅ License validated for account ${accountId}, plan: ${license.plan}`);

      res.json({
        valid: true,
        accountId: parseInt(accountId),
        plan: license.plan,
        subscriptionId: license.subscriptionId,
        features: license.features || [],
        operationAllowed,
        reason,
        validatedAt: new Date().toISOString()
      });
      
    } catch (dbError) {
      console.error('DynamoDB error during license validation:', dbError);
      return res.status(500).json({
        valid: false,
        error: 'Failed to validate license'
      });
    }
    
  } catch (error) {
    console.error('Error validating license:', error);
    res.status(500).json({
      valid: false,
      error: 'Internal server error'
    });
  }
});

// Rules management endpoints
app.get('/api/rules/repository/:repoId', async (req, res) => {
  try {
    const { repoId } = req.params;
    
    // In a real implementation, this would fetch from database
    // For now, return mock data
    const mockRules = [
      {
        id: '1',
        name: 'Auto-merge documentation',
        description: 'Automatically merge changes to documentation files',
        enabled: true,
        conditions: {
          filePatterns: ['*.md', 'docs/**'],
          maxRiskScore: 0.2
        },
        actions: {
          autoApprove: true,
          autoMerge: true,
          mergeMethod: 'squash'
        }
      },
      {
        id: '2',
        name: 'Auto-merge dependabot',
        description: 'Automatically merge dependabot PRs',
        enabled: true,
        conditions: {
          authorPatterns: ['dependabot[bot]'],
          maxRiskScore: 0.3
        },
        actions: {
          autoApprove: true,
          autoMerge: true,
          mergeMethod: 'squash'
        }
      }
    ];
    
    res.json(mockRules);
  } catch (error) {
    console.error('Error fetching rules:', error);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

app.post('/api/rules', async (req, res) => {
  try {
    const rule = req.body;
    
    // In a real implementation, this would save to database
    const newRule = {
      id: Date.now().toString(),
      ...rule,
      createdAt: new Date().toISOString()
    };
    
    res.json(newRule);
  } catch (error) {
    console.error('Error creating rule:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

app.put('/api/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;
    
    // In a real implementation, this would update in database
    const updatedRule = {
      id: ruleId,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    res.json(updatedRule);
  } catch (error) {
    console.error('Error updating rule:', error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

app.delete('/api/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    
    // In a real implementation, this would delete from database
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting rule:', error);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// Submit feedback endpoint
app.post('/submit-feedback', async (req, res) => {
  try {
    const { type, message, accountId, email, metadata } = req.body;
    
    if (!type || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, message'
      });
    }

    const feedbackId = crypto.randomUUID();
    const submittedAt = new Date().toISOString();
    
    const feedbackData = {
      feedbackId,
      type,
      message,
      accountId: accountId || 'anonymous',
      email: email || null,
      metadata: metadata || {},
      submittedAt,
      status: 'new'
    };

    // Store feedback in DynamoDB
    const feedbackTable = process.env.FEEDBACK_TABLE || `automerge-pro-feedback-${process.env.STAGE || 'dev'}`;
    
    await dynamodb.put({
      TableName: feedbackTable,
      Item: feedbackData
    }).promise();

    console.log(`📝 New feedback submitted: ${feedbackId} (${type})`);

    res.json({
      success: true,
      feedbackId,
      message: 'Feedback submitted successfully',
      submittedAt
    });
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    });
  }
});

// GitHub OAuth routes
app.get('/github/auth', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${req.protocol}://${req.get('host')}/github/callback`;
  const scope = 'repo,user:email';
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store state in session or database for validation
  req.session = req.session || {};
  req.session.oauthState = state;
  
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
  res.redirect(authUrl);
});

app.get('/github/callback', async (req, res) => {
  const { code, state } = req.query;
  
  // Validate state parameter
  if (!req.session || req.session.oauthState !== state) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || 'OAuth error');
    }
    
    // Get user information
    const octokit = new Octokit({ auth: tokenData.access_token });
    const { data: user } = await octokit.rest.users.getAuthenticated();
    
    // Store user session
    req.session.githubUser = {
      id: user.id,
      login: user.login,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      access_token: tokenData.access_token
    };
    
    // Redirect to dashboard
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// GitHub repositories endpoint
app.get('/api/github/repositories', async (req, res) => {
  try {
    if (!req.session || !req.session.githubUser) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const octokit = new Octokit({ auth: req.session.githubUser.access_token });
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      type: 'all',
      per_page: 100,
      sort: 'updated'
    });
    
    // Filter repositories where the app can be installed
    const availableRepos = repos.filter(repo => 
      repo.permissions && 
      (repo.permissions.admin || repo.permissions.push)
    );
    
    res.json(availableRepos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      description: repo.description,
      default_branch: repo.default_branch,
      permissions: repo.permissions
    })));
    
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Authentication status endpoint
app.get('/api/auth/status', (req, res) => {
  if (req.session && req.session.githubUser) {
    res.json({
      authenticated: true,
      user: req.session.githubUser
    });
  } else {
    res.json({
      authenticated: false
    });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ success: true });
  });
});

// GitHub app installation status
app.get('/api/github/installation-status/:repoId', async (req, res) => {
  try {
    const { repoId } = req.params;
    
    if (!probot) {
      return res.json({ installed: false, reason: 'App not configured' });
    }
    
    // Check if app is installed on this repository
    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.APP_ID,
        privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }
    });
    
    // Get installations for this app
    const { data: installations } = await octokit.rest.apps.listInstallations();
    
    for (const installation of installations) {
      const { data: repos } = await octokit.rest.apps.listReposAccessibleToInstallation({
        installation_id: installation.id
      });
      
      if (repos.repositories.some(repo => repo.id === parseInt(repoId))) {
        return res.json({ 
          installed: true, 
          installation_id: installation.id,
          account: installation.account
        });
      }
    }
    
    res.json({ installed: false, reason: 'App not installed on this repository' });
    
  } catch (error) {
    console.error('Error checking installation status:', error);
    res.status(500).json({ error: 'Failed to check installation status' });
  }
});

// Onboarding dashboard endpoint
app.get('/onboarding', (req, res) => {
  // Serve a simple onboarding dashboard
  res.type('html').send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Automerge-Pro Onboarding</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            line-height: 1.6; 
        }
        .step { 
            background: #f8f9fa; 
            border-left: 4px solid #007acc; 
            padding: 20px; 
            margin: 20px 0; 
            border-radius: 6px; 
        }
        .step.completed { border-left-color: #28a745; background: #d4edda; }
        .step.current { border-left-color: #ffc107; background: #fff3cd; }
        code { 
            background: #f1f3f4; 
            padding: 2px 6px; 
            border-radius: 3px; 
            font-family: 'Monaco', 'Menlo', monospace; 
        }
        pre { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 6px; 
            overflow-x: auto; 
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            background: #007acc;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 5px;
        }
        .btn:hover { background: #005c99; }
    </style>
</head>
<body>
    <h1>🚀 Welcome to Automerge-Pro</h1>
    <p>Follow these steps to get your automated pull request merging set up in minutes!</p>
    
    <div class="step completed">
        <h3>✅ Step 1: App Installation</h3>
        <p>Great! You've successfully installed the Automerge-Pro GitHub App.</p>
    </div>

    <div class="step current">
        <h3>⚙️ Step 2: Configure Your Rules</h3>
        <p>Add a <code>.automerge-pro.yml</code> file to your repository root:</p>
        <pre><code>version: '1'
rules:
  - name: "Auto-merge documentation"
    enabled: true
    conditions:
      filePatterns: ["*.md", "docs/**"]
      maxRiskScore: 0.2
    actions:
      autoApprove: true
      autoMerge: true
      mergeMethod: "squash"
      deleteBranch: true
      
  - name: "Auto-merge dependabot"
    enabled: true
    conditions:
      authorPatterns: ["dependabot[bot]"]
      maxRiskScore: 0.3
    actions:
      autoApprove: true
      autoMerge: true</code></pre>
        <a href="#" class="btn" onclick="copyConfig()">Copy Configuration</a>
    </div>

    <div class="step">
        <h3>🧪 Step 3: Test Your Setup</h3>
        <p>Create a test pull request to see the magic happen:</p>
        <ol>
            <li>Edit your README.md file</li>
            <li>Create a pull request</li>
            <li>Watch Automerge-Pro automatically approve and merge it!</li>
        </ol>
        <a href="https://github.com/${process.env.GITHUB_OWNER || 'your-org'}" class="btn">Open GitHub</a>
    </div>

    <div class="step">
        <h3>📊 Step 4: Monitor & Optimize</h3>
        <p>Track your automation's performance and adjust rules as needed.</p>
        <ul>
            <li>Check merge times and success rates</li>
            <li>Fine-tune risk score thresholds</li>
            <li>Add more sophisticated rules</li>
        </ul>
        <a href="/api/billing/${process.env.DEFAULT_ACCOUNT_ID || '1'}" class="btn">View Billing Info</a>
    </div>

    <div class="step">
        <h3>🎯 Step 5: Advanced Features</h3>
        <p>Unlock powerful features with Pro and Enterprise plans:</p>
        <ul>
            <li>🤖 AI-powered risk analysis</li>
            <li>🔒 Security vulnerability detection</li>
            <li>📱 Slack/Teams notifications</li>
            <li>📈 Advanced analytics</li>
        </ul>
        <a href="https://github.com/marketplace/automerge-pro" class="btn">Upgrade Plan</a>
    </div>

    <div class="step">
        <h3>💡 Need Help?</h3>
        <p>We're here to help you succeed!</p>
        <ul>
            <li>📖 <a href="https://docs.automerge-pro.com">Documentation</a></li>
            <li>💬 <a href="mailto:support@automerge-pro.com">Email Support</a></li>
            <li>🐛 <a href="https://github.com/issues">Report Issues</a></li>
        </ul>
        
        <h4>Quick Feedback</h4>
        <form id="feedbackForm" style="margin-top: 15px;">
            <select id="feedbackType" style="margin-right: 10px; padding: 5px;">
                <option value="suggestion">Suggestion</option>
                <option value="bug">Bug Report</option>
                <option value="question">Question</option>
                <option value="praise">Praise</option>
            </select>
            <input type="text" id="feedbackMessage" placeholder="Your feedback..." style="width: 300px; padding: 5px; margin-right: 10px;">
            <button type="submit" class="btn">Send Feedback</button>
        </form>
    </div>

    <script>
        function copyConfig() {
            const config = \`version: '1'
rules:
  - name: "Auto-merge documentation"
    enabled: true
    conditions:
      filePatterns: ["*.md", "docs/**"]
      maxRiskScore: 0.2
    actions:
      autoApprove: true
      autoMerge: true
      mergeMethod: "squash"
      deleteBranch: true\`;
      
            navigator.clipboard.writeText(config).then(() => {
                alert('Configuration copied to clipboard!');
            });
        }

        document.getElementById('feedbackForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const type = document.getElementById('feedbackType').value;
            const message = document.getElementById('feedbackMessage').value;
            
            if (!message) {
                alert('Please enter your feedback');
                return;
            }
            
            try {
                const response = await fetch('/submit-feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type,
                        message,
                        metadata: { source: 'onboarding_dashboard' }
                    })
                });
                
                if (response.ok) {
                    alert('Thank you for your feedback!');
                    document.getElementById('feedbackMessage').value = '';
                } else {
                    alert('Failed to send feedback. Please try again.');
                }
            } catch (error) {
                alert('Error sending feedback. Please try again.');
            }
        });
    </script>
</body>
</html>
  `);
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