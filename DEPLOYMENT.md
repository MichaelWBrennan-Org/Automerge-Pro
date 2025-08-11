# Automerge-Pro GitHub App Backend - Deployment Guide

## 🚀 Complete Implementation Summary

This implementation provides a **production-ready GitHub App backend** with AWS Lambda compatibility and automated deployment pipeline.

## 📋 What's Included

### Core Components
- **`server.js`** - Enhanced Express server with Lambda compatibility
- **`lambda.js`** - AWS Lambda entry point with serverless-express wrapper
- **`src/billing.js`** - Complete billing and subscription management
- **`src/config.js`** - Configuration parsing with YAML schema validation
- **`src/automerge.js`** - Sophisticated automerge rule engine
- **`template.yaml`** - AWS SAM infrastructure template
- **`.github/workflows/ci-cd.yml`** - Complete CI/CD pipeline

### Infrastructure
- AWS Lambda function with automatic scaling
- API Gateway for HTTP routing
- CloudWatch logs integration
- Multi-environment deployment (dev/staging/prod)
- GitHub Pages for documentation

## 🛠️ Deployment Instructions

### Prerequisites
1. AWS Account with appropriate permissions
2. GitHub repository with Actions enabled
3. GitHub App configured (for production use)

### 1. Configure GitHub Secrets
Add these secrets to your GitHub repository:

```
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_SAM_BUCKET=your-sam-deployment-bucket
GITHUB_APP_ID=your-github-app-id
GITHUB_PRIVATE_KEY=your-github-app-private-key-base64
GITHUB_WEBHOOK_SECRET=your-webhook-secret
```

### 2. Deploy to AWS

#### Option A: Automatic Deployment
- Push to `develop` branch → deploys to staging
- Push to `main` branch → deploys to production + GitHub Pages

#### Option B: Manual Deployment
```bash
# Install AWS SAM CLI
pip install aws-sam-cli

# Build and deploy
sam build
sam deploy --guided
```

### 3. Configure GitHub App
Update your GitHub App settings with the webhook URL from deployment:
```
Webhook URL: https://your-api-id.execute-api.region.amazonaws.com/prod/webhooks/github
```

## 🔧 Configuration

### Environment Variables
```bash
APP_ID=123456                    # GitHub App ID
PRIVATE_KEY=-----BEGIN...       # GitHub App Private Key
WEBHOOK_SECRET=your-secret      # Webhook signature verification
NODE_ENV=production             # Environment
STAGE=prod                      # Deployment stage
```

### Repository Configuration
Create `.automerge-pro.yml` in target repositories:

```yaml
version: '1'
rules:
  - name: "Auto-merge dependabot"
    description: "Automatically merge dependabot PRs"
    enabled: true
    conditions:
      authorPatterns: ["dependabot[bot]"]
      maxRiskScore: 0.3
    actions:
      autoApprove: true
      autoMerge: true
      mergeMethod: "squash"
      deleteBranch: true

settings:
  aiAnalysis: false
  riskThreshold: 0.5
  autoDeleteBranches: true
  requireStatusChecks: true
```

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check and system status |
| `/api/config` | GET | Available plans and configuration |
| `/api/billing/:accountId` | GET | Subscription information |
| `/api/validate/:accountId/:operation` | POST | Validate operations against limits |
| `/webhooks/github` | POST | GitHub webhook events |
| `/webhooks/billing` | POST | Marketplace billing events |

## 🏗️ Architecture

```
GitHub → API Gateway → Lambda Function → Express App → Automerge Logic
                    ↘ CloudWatch Logs
GitHub Actions → SAM → CloudFormation → AWS Resources
Docs → GitHub Pages
```

## 🔐 Security Features

- Environment variable based configuration
- GitHub App authentication with minimal permissions
- Webhook secret verification
- CORS headers for API security
- Input validation and sanitization
- IAM roles with least privilege

## 💰 Billing Tiers

| Plan | Price | Repositories | Features |
|------|-------|-------------|----------|
| **Free** | $0/month | 1 repo | Basic automerge rules |
| **Pro** | $15/month | Unlimited | Advanced rules, AI analysis |
| **Enterprise** | $50/month | Unlimited | Priority support, custom policies |

## 🧪 Testing

### Local Testing
```bash
# Without credentials (API-only mode)
npm start

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/config
```

### Lambda Testing
```bash
# Test Lambda wrapper locally
node -e "
const { handler } = require('./lambda.js');
const event = { httpMethod: 'GET', path: '/health', /* ... */ };
handler(event, {}).then(console.log);
"
```

## 📚 Documentation

- **Live Documentation**: Deployed to GitHub Pages automatically
- **API Documentation**: Available at deployed endpoint
- **Configuration Examples**: In repository and docs

## 🎯 Production Checklist

- [ ] GitHub App created and configured
- [ ] AWS account and IAM permissions set up
- [ ] GitHub secrets configured
- [ ] SAM deployment bucket created
- [ ] Webhook URL updated in GitHub App
- [ ] Test deployment with sample repository
- [ ] Monitor CloudWatch logs

## 🚀 Go Live

1. **Deploy**: Push to main branch or run manual deployment
2. **Configure**: Update GitHub App webhook URL
3. **Test**: Create a test PR to verify functionality
4. **Monitor**: Check CloudWatch logs and metrics
5. **Scale**: Enable for more repositories as needed

## 📞 Support

- **Repository**: GitHub Issues for bug reports
- **Documentation**: GitHub Pages site
- **Monitoring**: CloudWatch logs and metrics

---

**Status**: ✅ Production Ready  
**Last Updated**: $(date)  
**Version**: 1.0.0