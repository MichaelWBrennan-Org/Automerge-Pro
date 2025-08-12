#!/usr/bin/env node
/**
 * CLI tool for generating development licenses locally
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const PLANS = {
  FREE: { name: 'Free', features: ['basic_rules', 'single_repo'] },
  PRO: { name: 'Pro', features: ['unlimited_repos', 'advanced_rules', 'compliance_checks', 'ai_analysis'] },
  ENTERPRISE: { name: 'Enterprise', features: ['unlimited_repos', 'advanced_rules', 'compliance_checks', 'ai_analysis', 'priority_support', 'custom_policies'] }
};

/**
 * Generates a secure license key
 */
function generateLicenseKey(accountId, subscriptionId, secret = 'dev-secret') {
  return crypto.createHash('sha256')
    .update(`${accountId}-${subscriptionId}-${secret}`)
    .digest('hex');
}

/**
 * Creates a dev license
 */
function createDevLicense(options = {}) {
  const {
    accountId = 'dev-12345',
    organizationName = 'Development Org',
    plan = 'PRO',
    subscriptionId = `sub_dev_${Date.now()}`,
    secret = 'dev-secret'
  } = options;

  const planData = PLANS[plan] || PLANS.PRO;
  const licenseKey = generateLicenseKey(accountId, subscriptionId, secret);

  return {
    accountId,
    subscriptionId,
    licenseKey,
    organizationName,
    plan: planData.name,
    status: 'active',
    features: planData.features,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    metadata: {
      type: 'development',
      billingCycle: 'monthly',
      unitCount: 1,
      onFreeTrial: false
    }
  };
}

/**
 * Save license to file
 */
async function saveLicenseToFile(license, filename) {
  const filePath = path.resolve(filename);
  await fs.writeFile(filePath, JSON.stringify(license, null, 2));
  return filePath;
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];
    if (key && value) {
      options[key] = value;
    }
  }

  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔑 Automerge-Pro Development License Generator

Usage: node scripts/dev-license-cli.js [options]

Options:
  --accountId        Account/Organization ID (default: dev-12345)
  --organizationName Organization name (default: Development Org)
  --plan             Plan type: FREE, PRO, ENTERPRISE (default: PRO)
  --subscriptionId   Subscription ID (default: auto-generated)
  --secret           Secret for license generation (default: dev-secret)
  --output           Output file path (default: dev-license.json)
  --help, -h         Show this help

Examples:
  # Generate a basic Pro license
  node scripts/dev-license-cli.js

  # Generate an Enterprise license for specific org
  node scripts/dev-license-cli.js --accountId 98765 --organizationName "My Company" --plan ENTERPRISE

  # Save to custom file
  node scripts/dev-license-cli.js --output my-dev-license.json

Features by plan:
  FREE: Basic rules, single repository
  PRO: Unlimited repos, advanced rules, AI analysis
  ENTERPRISE: All Pro features + priority support + custom policies
`);
    return;
  }

  const outputFile = options.output || 'dev-license.json';
  
  try {
    // Create the license
    const license = createDevLicense(options);
    
    // Save to file
    const savedPath = await saveLicenseToFile(license, outputFile);
    
    console.log('🎉 Development license generated successfully!');
    console.log(`📄 Saved to: ${savedPath}`);
    console.log(`🔑 License Key: ${license.licenseKey}`);
    console.log(`📋 Plan: ${license.plan}`);
    console.log(`🏢 Organization: ${license.organizationName} (${license.accountId})`);
    console.log(`⏰ Expires: ${new Date(license.expiresAt).toLocaleDateString()}`);
    
    console.log('\n🧪 Test with:');
    console.log(`curl -X POST http://localhost:3000/validate-license \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"accountId":"${license.accountId}","licenseKey":"${license.licenseKey}"}'`);
    
    console.log('\n⚙️ Environment variables for local development:');
    console.log(`export LICENSE_ACCOUNT_ID="${license.accountId}"`);
    console.log(`export LICENSE_KEY="${license.licenseKey}"`);
    console.log(`export WEBHOOK_SECRET="dev-secret"`);

    console.log('\n📝 License features:');
    license.features.forEach(feature => {
      console.log(`  ✓ ${feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
    });
    
  } catch (error) {
    console.error('❌ Error generating license:', error.message);
    process.exit(1);
  }
}

// Run the CLI if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = {
  generateLicenseKey,
  createDevLicense,
  saveLicenseToFile,
  PLANS
};