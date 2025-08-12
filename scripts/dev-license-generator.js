#!/usr/bin/env node

/**
 * Comprehensive Development License Generator CLI Tool
 * Generates local development licenses for testing AutoMerge Pro
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const readline = require('readline');

class DevLicenseGenerator {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.colors = {
      reset: '\\033[0m',
      bright: '\\033[1m',
      green: '\\033[32m',
      blue: '\\033[34m',
      yellow: '\\033[33m',
      red: '\\033[31m',
      cyan: '\\033[36m'
    };
  }

  async run() {
    console.log('🔐 AutoMerge Pro Development License Generator');
    console.log('============================================\\n');
    
    const plan = await this.selectPlan();
    const org = await this.getOrgInfo();
    const license = this.generateLicense(plan, org);
    
    this.saveLicense(license);
    this.displayLicense(license);
    
    this.rl.close();
  }

  async selectPlan() {
    const plans = ['FREE', 'TEAM', 'GROWTH', 'ENTERPRISE'];
    console.log('Available plans:');
    plans.forEach((plan, i) => console.log(`  ${i + 1}. ${plan}`));
    
    const answer = await this.ask('\\nSelect plan (1-4, default: 2): ');
    const index = parseInt(answer) - 1 || 1;
    return plans[index] || 'TEAM';
  }

  async getOrgInfo() {
    const name = await this.ask('Organization name (default: Dev Org): ') || 'Dev Org';
    const id = await this.ask('Organization ID (default: auto): ') || this.generateId();
    return { name, id };
  }

  generateLicense(plan, org) {
    const licenseKey = this.generateLicenseKey();
    
    return {
      version: '1.0',
      type: 'development',
      organization: {
        id: org.id,
        name: org.name
      },
      license_key: licenseKey,
      plan: plan,
      status: 'active',
      features: this.getFeatures(plan),
      limits: this.getLimits(plan),
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      signature: this.generateSignature(org.id, plan, licenseKey)
    };
  }

  generateId() {
    return 'dev_' + crypto.randomBytes(8).toString('hex');
  }

  generateLicenseKey() {
    const prefix = 'DEV';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(6).toString('hex').toUpperCase();
    const checksum = crypto.createHash('md5').update(timestamp + random).digest('hex').substring(0, 4).toUpperCase();
    
    return `${prefix}-${timestamp}-${random}-${checksum}`;
  }

  generateSignature(orgId, plan, licenseKey) {
    return crypto.createHash('sha256')
      .update(`${orgId}-${plan}-${licenseKey}-dev-secret`)
      .digest('hex');
  }

  getFeatures(plan) {
    const features = {
      'FREE': {
        basic_automation: true,
        ai_risk_analysis: false,
        advanced_rules: false,
        slack_notifications: false,
        analytics_dashboard: 'basic'
      },
      'TEAM': {
        basic_automation: true,
        ai_risk_analysis: true,
        advanced_rules: true,
        slack_notifications: true,
        analytics_dashboard: 'advanced'
      },
      'GROWTH': {
        basic_automation: true,
        ai_risk_analysis: true,
        advanced_rules: true,
        slack_notifications: true,
        analytics_dashboard: 'premium',
        compliance_checks: true,
        custom_webhooks: true
      },
      'ENTERPRISE': {
        basic_automation: true,
        ai_risk_analysis: true,
        advanced_rules: true,
        slack_notifications: true,
        analytics_dashboard: 'enterprise',
        compliance_checks: true,
        custom_webhooks: true,
        sso_authentication: true,
        audit_logging: true
      }
    };

    return features[plan] || features['TEAM'];
  }

  getLimits(plan) {
    const limits = {
      'FREE': { repositories: 1, rules: 3, prs_per_month: 50 },
      'TEAM': { repositories: 10, rules: 50, prs_per_month: 1000 },
      'GROWTH': { repositories: 999, rules: 999, prs_per_month: 10000 },
      'ENTERPRISE': { repositories: 999, rules: 999, prs_per_month: 999999 }
    };

    return limits[plan] || limits['TEAM'];
  }

  saveLicense(license) {
    fs.writeFileSync('dev-license.json', JSON.stringify(license, null, 2));
    console.log('\\n✅ License saved to dev-license.json');
  }

  displayLicense(license) {
    console.log(`\\n📄 Generated Development License:`);
    console.log(`   Organization: ${license.organization.name}`);
    console.log(`   Plan: ${license.plan}`);
    console.log(`   License Key: ${license.license_key}`);
    console.log(`   Expires: ${new Date(license.expires_at).toLocaleDateString()}`);
    console.log(`   Features: ${Object.keys(license.features).length} enabled`);
  }

  ask(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }
}

// CLI interface
if (require.main === module) {
  const generator = new DevLicenseGenerator();
  generator.run().catch(console.error);
}

module.exports = DevLicenseGenerator;