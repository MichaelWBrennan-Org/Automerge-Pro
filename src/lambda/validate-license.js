const AWS = require('aws-sdk');
const crypto = require('crypto');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_PREFIX = process.env.DYNAMODB_TABLE_PREFIX || 'automerge-pro-dev';

/**
 * AWS Lambda function for license validation
 * Validates licenses and enforces feature gating based on billing tiers
 */
exports.handler = async (event, context) => {
  console.log('License validation request:', JSON.stringify(event, null, 2));
  
  try {
    const { httpMethod, path, pathParameters, body } = event;
    
    // Handle different HTTP methods
    switch (httpMethod) {
      case 'POST':
        if (path.includes('/validate-license')) {
          return await validateLicense(event);
        } else if (path.includes('/check-features')) {
          return await checkFeatureAccess(event);
        }
        break;
      case 'GET':
        if (path.includes('/license-info')) {
          return await getLicenseInfo(event);
        }
        break;
      default:
        return createResponse(405, { error: 'Method not allowed' });
    }
    
    return createResponse(404, { error: 'Endpoint not found' });
    
  } catch (error) {
    console.error('License validation error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};

async function validateLicense(event) {
  const { organizationId, licenseKey, operation } = JSON.parse(event.body || '{}');
  
  if (!organizationId || !licenseKey) {
    return createResponse(400, { 
      error: 'Missing required parameters: organizationId, licenseKey' 
    });
  }
  
  try {
    // Get license from DynamoDB
    const license = await getLicenseFromDB(organizationId, licenseKey);
    
    if (!license) {
      return createResponse(404, { 
        valid: false,
        error: 'License not found' 
      });
    }
    
    // Validate license
    const validation = validateLicenseData(license);
    
    if (!validation.valid) {
      return createResponse(200, validation);
    }
    
    // Check operation-specific permissions
    if (operation) {
      const permitted = checkOperationPermission(license, operation);
      validation.operationPermitted = permitted;
      
      if (!permitted) {
        validation.error = `Operation '${operation}' not permitted for plan '${license.plan}'`;
      }
    }
    
    // Log validation event
    await logValidationEvent(organizationId, licenseKey, operation, validation);
    
    return createResponse(200, validation);
    
  } catch (error) {
    console.error('License validation failed:', error);
    return createResponse(500, { 
      valid: false,
      error: 'Validation service error' 
    });
  }
}

async function checkFeatureAccess(event) {
  const { organizationId, features } = JSON.parse(event.body || '{}');
  
  if (!organizationId || !Array.isArray(features)) {
    return createResponse(400, { 
      error: 'Missing required parameters: organizationId, features (array)' 
    });
  }
  
  try {
    // Get organization's license
    const organization = await getOrganizationFromDB(organizationId);
    
    if (!organization) {
      return createResponse(404, { error: 'Organization not found' });
    }
    
    const featureAccess = {};
    
    for (const feature of features) {
      featureAccess[feature] = checkFeaturePermission(organization.plan, feature);
    }
    
    return createResponse(200, {
      organizationId,
      plan: organization.plan,
      features: featureAccess,
      limits: getPlanLimits(organization.plan)
    });
    
  } catch (error) {
    console.error('Feature access check failed:', error);
    return createResponse(500, { error: 'Feature access service error' });
  }
}

async function getLicenseInfo(event) {
  const { organizationId } = event.pathParameters || {};
  
  if (!organizationId) {
    return createResponse(400, { error: 'Missing organizationId parameter' });
  }
  
  try {
    const organization = await getOrganizationFromDB(organizationId);
    
    if (!organization) {
      return createResponse(404, { error: 'Organization not found' });
    }
    
    const licenseInfo = {
      organizationId,
      plan: organization.plan,
      status: organization.status,
      features: getAvailableFeatures(organization.plan),
      limits: getPlanLimits(organization.plan),
      usage: await getCurrentUsage(organizationId),
      expiresAt: organization.expiresAt,
      trialEndsAt: organization.trialEndsAt
    };
    
    return createResponse(200, licenseInfo);
    
  } catch (error) {
    console.error('License info retrieval failed:', error);
    return createResponse(500, { error: 'License info service error' });
  }
}

// Database operations

async function getLicenseFromDB(organizationId, licenseKey) {
  const params = {
    TableName: `${TABLE_PREFIX}-licenses`,
    Key: { organization_id: organizationId }
  };
  
  const result = await dynamodb.get(params).promise();
  
  if (!result.Item) {
    return null;
  }
  
  // Verify license key
  if (result.Item.license_key !== licenseKey) {
    return null;
  }
  
  return result.Item;
}

async function getOrganizationFromDB(organizationId) {
  const params = {
    TableName: `${TABLE_PREFIX}-organizations`,
    Key: { id: organizationId }
  };
  
  const result = await dynamodb.get(params).promise();
  return result.Item || null;
}

async function getCurrentUsage(organizationId) {
  // Get usage data from analytics events
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const params = {
    TableName: `${TABLE_PREFIX}-analytics-events`,
    IndexName: 'organization-timestamp-index',
    KeyConditionExpression: 'organization_id = :orgId AND #timestamp >= :timestamp',
    ExpressionAttributeNames: {
      '#timestamp': 'timestamp'
    },
    ExpressionAttributeValues: {
      ':orgId': organizationId,
      ':timestamp': thirtyDaysAgo.getTime()
    }
  };
  
  const result = await dynamodb.query(params).promise();
  
  // Calculate usage metrics
  const usage = {
    repositories: new Set(),
    activeRules: new Set(),
    prsProcessed: 0,
    apiCalls: 0
  };
  
  result.Items.forEach(event => {
    if (event.repository_id) usage.repositories.add(event.repository_id);
    if (event.rule_id) usage.activeRules.add(event.rule_id);
    if (event.event_type === 'pr_processed') usage.prsProcessed++;
    if (event.event_type === 'api_call') usage.apiCalls++;
  });
  
  return {
    repositories: usage.repositories.size,
    activeRules: usage.activeRules.size,
    prsProcessed: usage.prsProcessed,
    apiCalls: usage.apiCalls
  };
}

// License validation logic

function validateLicenseData(license) {
  const now = new Date();
  
  // Check if license exists
  if (!license) {
    return { valid: false, error: 'License not found' };
  }
  
  // Check if license is expired
  if (license.expires_at && new Date(license.expires_at) < now) {
    return { valid: false, error: 'License expired', expiredAt: license.expires_at };
  }
  
  // Check if license is active
  if (license.status !== 'active') {
    return { valid: false, error: 'License not active', status: license.status };
  }
  
  // Validate license signature (if using signed licenses)
  if (license.signature && !verifyLicenseSignature(license)) {
    return { valid: false, error: 'Invalid license signature' };
  }
  
  return {
    valid: true,
    organizationId: license.organization_id,
    plan: license.plan,
    features: getAvailableFeatures(license.plan),
    limits: getPlanLimits(license.plan),
    expiresAt: license.expires_at,
    issuedAt: license.issued_at
  };
}

function verifyLicenseSignature(license) {
  // Implement license signature verification if using signed licenses
  // This would typically use public key cryptography
  return true; // Simplified for demo
}

// Feature gating logic

function checkOperationPermission(license, operation) {
  const plan = license.plan;
  
  const operationPermissions = {
    'create_rule': {
      'FREE': 3, // Max 3 rules
      'TEAM': 50,
      'GROWTH': 999,
      'ENTERPRISE': 999
    },
    'ai_analysis': {
      'FREE': false,
      'TEAM': true,
      'GROWTH': true,
      'ENTERPRISE': true
    },
    'advanced_notifications': {
      'FREE': false,
      'TEAM': false,
      'GROWTH': true,
      'ENTERPRISE': true
    },
    'custom_integrations': {
      'FREE': false,
      'TEAM': false,
      'GROWTH': true,
      'ENTERPRISE': true
    },
    'priority_support': {
      'FREE': false,
      'TEAM': true,
      'GROWTH': true,
      'ENTERPRISE': true
    },
    'sso_integration': {
      'FREE': false,
      'TEAM': false,
      'GROWTH': false,
      'ENTERPRISE': true
    }
  };
  
  const permission = operationPermissions[operation];
  if (!permission) {
    return true; // Operation not restricted
  }
  
  const planPermission = permission[plan];
  
  if (typeof planPermission === 'boolean') {
    return planPermission;
  }
  
  if (typeof planPermission === 'number') {
    // This would require checking current usage
    return true; // Simplified - would check actual usage
  }
  
  return false;
}

function checkFeaturePermission(plan, feature) {
  const featurePermissions = {
    'basic_automation': {
      'FREE': true,
      'TEAM': true,
      'GROWTH': true,
      'ENTERPRISE': true
    },
    'ai_risk_analysis': {
      'FREE': false,
      'TEAM': true,
      'GROWTH': true,
      'ENTERPRISE': true
    },
    'advanced_rules': {
      'FREE': false,
      'TEAM': true,
      'GROWTH': true,
      'ENTERPRISE': true
    },
    'slack_notifications': {
      'FREE': false,
      'TEAM': true,
      'GROWTH': true,
      'ENTERPRISE': true
    },
    'email_notifications': {
      'FREE': true,
      'TEAM': true,
      'GROWTH': true,
      'ENTERPRISE': true
    },
    'analytics_dashboard': {
      'FREE': 'basic',
      'TEAM': 'advanced',
      'GROWTH': 'premium',
      'ENTERPRISE': 'enterprise'
    },
    'compliance_checks': {
      'FREE': false,
      'TEAM': false,
      'GROWTH': true,
      'ENTERPRISE': true
    },
    'custom_webhooks': {
      'FREE': false,
      'TEAM': false,
      'GROWTH': true,
      'ENTERPRISE': true
    },
    'sso_authentication': {
      'FREE': false,
      'TEAM': false,
      'GROWTH': false,
      'ENTERPRISE': true
    },
    'audit_logging': {
      'FREE': false,
      'TEAM': false,
      'GROWTH': false,
      'ENTERPRISE': true
    },
    'priority_support': {
      'FREE': false,
      'TEAM': true,
      'GROWTH': true,
      'ENTERPRISE': true
    },
    'sla_guarantees': {
      'FREE': false,
      'TEAM': false,
      'GROWTH': false,
      'ENTERPRISE': true
    }
  };
  
  const permission = featurePermissions[feature];
  if (!permission) {
    return false; // Feature not defined
  }
  
  return permission[plan] || false;
}

function getAvailableFeatures(plan) {
  const allFeatures = [
    'basic_automation',
    'ai_risk_analysis', 
    'advanced_rules',
    'slack_notifications',
    'email_notifications',
    'analytics_dashboard',
    'compliance_checks',
    'custom_webhooks',
    'sso_authentication',
    'audit_logging',
    'priority_support',
    'sla_guarantees'
  ];
  
  return allFeatures.reduce((features, feature) => {
    const access = checkFeaturePermission(plan, feature);
    if (access) {
      features[feature] = access;
    }
    return features;
  }, {});
}

function getPlanLimits(plan) {
  const planLimits = {
    'FREE': {
      repositories: 1,
      rules: 3,
      prsPerMonth: 50,
      apiCallsPerDay: 100,
      storageGB: 0.1,
      supportLevel: 'community'
    },
    'TEAM': {
      repositories: 10,
      rules: 50,
      prsPerMonth: 1000,
      apiCallsPerDay: 1000,
      storageGB: 5,
      supportLevel: 'email'
    },
    'GROWTH': {
      repositories: 999,
      rules: 999,
      prsPerMonth: 10000,
      apiCallsPerDay: 10000,
      storageGB: 50,
      supportLevel: 'priority'
    },
    'ENTERPRISE': {
      repositories: 999,
      rules: 999,
      prsPerMonth: 999999,
      apiCallsPerDay: 999999,
      storageGB: 500,
      supportLevel: 'sla'
    }
  };
  
  return planLimits[plan] || planLimits['FREE'];
}

// Logging and monitoring

async function logValidationEvent(organizationId, licenseKey, operation, validation) {
  const event = {
    id: crypto.randomBytes(16).toString('hex'),
    organization_id: organizationId,
    event_type: 'license_validation',
    timestamp: Date.now(),
    ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days TTL
    data: {
      operation,
      valid: validation.valid,
      plan: validation.plan,
      error: validation.error
    },
    metadata: {
      service: 'license-validator',
      version: '1.0.0'
    }
  };
  
  const params = {
    TableName: `${TABLE_PREFIX}-analytics-events`,
    Item: event
  };
  
  try {
    await dynamodb.put(params).promise();
  } catch (error) {
    console.error('Failed to log validation event:', error);
  }
}

// Utility functions

function createResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers
    },
    body: JSON.stringify(body)
  };
}