# AutoMerge Pro

🚀 **AI-Powered GitHub App for Intelligent Pull Request Automation**

AutoMerge Pro is a production-ready GitHub App that intelligently automates your pull request workflow using advanced AI risk scoring and customizable rules. Save hours of manual review time while maintaining code quality and security.

[![GitHub Marketplace](https://img.shields.io/badge/GitHub%20Marketplace-AutoMerge%20Pro-blue)](https://github.com/marketplace/automerge-pro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI/CD](https://github.com/MichaelWBrennan-Org/Automerge-Pro/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/MichaelWBrennan-Org/Automerge-Pro/actions)
[![GitHub stars](https://img.shields.io/github/stars/MichaelWBrennan-Org/Automerge-Pro?style=social)](https://github.com/MichaelWBrennan-Org/Automerge-Pro)
[![Production Ready](https://img.shields.io/badge/status-production%20ready-green)](https://github.com/MichaelWBrennan-Org/Automerge-Pro)
[![Test Coverage](https://img.shields.io/badge/coverage-90%25-brightgreen)](https://github.com/MichaelWBrennan-Org/Automerge-Pro)
[![Deploy](https://img.shields.io/badge/deploy-AWS%20Lambda-orange)](https://github.com/MichaelWBrennan-Org/Automerge-Pro)

## ✨ Features

### 🤖 **AI-Powered Risk Analysis** (Production Ready)
- **GPT-4 Integration**: Advanced code analysis using OpenAI's latest models
- **Intelligent Risk Scoring**: 0-1 risk score with detailed breakdown by category
- **Security Detection**: Identifies potential vulnerabilities and security risks
- **Breaking Change Analysis**: Detects API changes and compatibility issues
- **Code Quality Assessment**: Evaluates complexity, maintainability, and best practices
- **Fallback Analysis**: Heuristic analysis when AI is unavailable

### ⚙️ **Intelligent Automation Rules** (Fully Implemented)
- **File Pattern Matching**: Auto-approve changes to documentation, tests, or specific directories
- **Author-Based Rules**: Trust certain team members and bots for automatic approvals
- **Branch Protection**: Respects GitHub branch protection rules and required status checks
- **Risk Score Thresholds**: Customize automation based on AI-calculated risk levels
- **Merge Methods**: Support for squash, merge, and rebase strategies
- **Conditional Logic**: Complex rule conditions and actions

### 📊 **Modern Dashboard** (React/Next.js)
- **GitHub OAuth Integration**: Seamless authentication with your GitHub account
- **Repository Management**: Select and manage repositories through an intuitive interface
- **Rule Management**: Visual rule builder with real-time validation
- **Live Status Updates**: Real-time monitoring of PR processing and automation
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices

### 🔗 **GitHub Integration** (Complete)
- **Status Check Integration**: Shows detailed progress in GitHub's UI
- **PR Comments**: Informative comments with AI analysis details
- **Bot Reviews**: Automatic approval reviews with detailed explanations
- **Branch Cleanup**: Automatic deletion of merged branches
- **Error Handling**: Graceful handling of GitHub API errors and rate limits

### 🔔 **Smart Notifications** (Ready)
- **GitHub Notifications**: Native GitHub notifications for all events
- **Status Checks**: Detailed status checks with progress information
- **PR Comments**: Rich comments with AI analysis and recommendations
- **Webhook Support**: Custom webhook integrations for advanced workflows

## 🚀 Quick Start

### **1. Install the GitHub App** (One-Click Setup)

[![Add to GitHub](https://img.shields.io/badge/Add%20to%20GitHub-AutoMerge%20Pro-brightgreen)](https://github.com/apps/automerge-pro)

Click the button above to install AutoMerge Pro on your GitHub repositories. The app will request minimal permissions and works immediately after installation.

### **2. Connect Your Account** (Dashboard Access)

1. Visit the [AutoMerge Pro Dashboard](https://automerge-pro.com/dashboard)
2. Click "Connect GitHub" to authenticate
3. Select which repositories to enable
4. Configure your first automerge rule

### **3. Zero-Config Defaults** (Works Immediately)

After installation, AutoMerge Pro works out of the box with smart defaults:

- ✅ **Documentation-only PRs** are auto-approved and auto-merged
- ✅ **Dependabot updates** are auto-approved and auto-merged  
- ✅ **Status checks** show progress in GitHub's UI
- ✅ **AI analysis** provides detailed risk assessment
- ✅ **Branch protection** rules are respected

### **4. Advanced Configuration** (Optional)

For advanced users, configure via `.automerge-pro.yml` in your repository root:

```yaml
version: '1'
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
      autoMerge: true
      mergeMethod: "squash"

settings:
  aiAnalysis: true
  riskThreshold: 0.5
  autoDeleteBranches: true
```

## 🏗️ **Architecture & Deployment**

### **Production-Ready Infrastructure**

AutoMerge Pro is built on modern, scalable infrastructure:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App  │    │  AWS Lambda     │    │   GitHub API    │
│  (Frontend)     │◄──►│   (Backend)     │◄──►│   + OpenAI      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                       ┌───────▼───────┐
                       │   DynamoDB    │
                       │   + Redis     │
                       └───────────────┘
```

### **Tech Stack**
- **Frontend**: Next.js 14, React, Tailwind CSS, TypeScript
- **Backend**: Node.js, Express, AWS Lambda, TypeScript
- **AI**: OpenAI GPT-4, Fallback heuristics
- **Database**: DynamoDB, Redis caching
- **Infrastructure**: AWS Lambda, CloudFormation, API Gateway
- **CI/CD**: GitHub Actions, AWS SAM

### **Deployment Options**

**Option 1: One-Click Deploy (Recommended)**
```bash
# Deploy to AWS with a single command
./scripts/deploy.sh --environment production
```

**Option 2: Manual Deployment**
```bash
# Install dependencies
npm install

# Run tests
npm test

# Deploy with AWS SAM
sam deploy --guided
```

**Option 3: Local Development**
```bash
# Start all services locally
npm run dev

# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

## 🎯 **How It Works**

### **1. AI Analysis** (Every PR)
When a pull request is created or updated, AutoMerge Pro:

1. **Analyzes the code** using GPT-4 for risk assessment
2. **Evaluates file patterns** against your configured rules
3. **Checks GitHub requirements** (status checks, reviews, branch protection)
4. **Calculates risk score** (0-1) with detailed breakdown
5. **Makes merge decision** based on rules and AI analysis

### **2. Smart Automation** (Rule-Based)
The system applies your configured rules:

- **File Pattern Matching**: `*.md`, `docs/**`, `test/**`
- **Author Trust**: `dependabot[bot]`, specific team members
- **Risk Thresholds**: Only merge if risk score is below threshold
- **Branch Protection**: Respects GitHub's branch protection rules
- **Status Checks**: Waits for all required checks to pass

### **3. GitHub Integration** (Seamless)
AutoMerge Pro integrates deeply with GitHub:

- **Status Checks**: Shows progress in GitHub's UI
- **PR Comments**: Detailed analysis and recommendations
- **Bot Reviews**: Automatic approval with explanations
- **Branch Cleanup**: Deletes merged branches automatically
- **Error Handling**: Graceful failure with helpful messages

## 📊 **Success Stories**

See how teams are using AutoMerge Pro to boost productivity:

- **[TechCorp: 60% Reduction in Review Time](case-studies/techcorp-case-study.md)** - How a SaaS platform saved 15+ hours per developer per month
- **[ReactiveUI: Scaling Open Source Maintenance](case-studies/reactiveui-case-study.md)** - How maintainers reduced workload by 50% while improving contributor experience

*Want to share your success story? [Contact us](mailto:success@automerge-pro.com)!*

## 💰 **Pricing Plans**

| Plan | Price | Repositories | AI Analysis | Advanced Rules | Support |
|------|-------|--------------|-------------|----------------|---------|
| **Free** | $0/month | 1 repo | ✅ Basic | ✅ 3 rules | Community |
| **Team** | $15/month | 10 repos | ✅ GPT-4 | ✅ Unlimited | Priority |  
| **Growth** | $50/month | Unlimited | ✅ Premium | ✅ All features | Premium |
| **Enterprise** | Custom | Unlimited | ✅ Custom | ✅ Custom | SLA |

### **Feature Comparison**

| Feature | Free | Team | Growth | Enterprise |
|---------|------|------|---------|------------|
| **Core Features** |
| Auto-merge rules | ✅ | ✅ | ✅ | ✅ |
| File pattern matching | ✅ | ✅ | ✅ | ✅ |
| Author-based rules | ✅ | ✅ | ✅ | ✅ |
| GitHub integration | ✅ | ✅ | ✅ | ✅ |
| **AI Analysis** |
| Basic risk scoring | ✅ | ✅ | ✅ | ✅ |
| GPT-4 analysis | ❌ | ✅ | ✅ | ✅ |
| Security detection | ❌ | ✅ | ✅ | ✅ |
| Custom AI models | ❌ | ❌ | ❌ | ✅ |
| **Advanced Features** |
| Dashboard access | ❌ | ✅ | ✅ | ✅ |
| Custom webhooks | ❌ | ❌ | ✅ | ✅ |
| Priority support | ❌ | ✅ | ✅ | ✅ |
| On-premise deployment | ❌ | ❌ | ❌ | ✅ |

[View detailed pricing →](https://automerge-pro.com/pricing)

## 🛠️ **Development & Testing**

### **Local Development Setup**

```bash
# 1. Clone the repository
git clone https://github.com/your-org/automerge-pro.git
cd automerge-pro

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Start development servers
npm run dev

# 5. Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

### **Testing**

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

### **Code Quality**

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check

# Format code
npm run format
```

## 🔧 **Configuration**

### **Environment Variables**

```bash
# Required
GITHUB_APP_ID=your-github-app-id
GITHUB_PRIVATE_KEY=your-github-app-private-key
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_CLIENT_ID=your-oauth-client-id
GITHUB_CLIENT_SECRET=your-oauth-client-secret

# Optional
OPENAI_API_KEY=your-openai-api-key
DATABASE_URL=postgresql://user:pass@localhost:5432/automerge_pro
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

### **GitHub App Permissions**

AutoMerge Pro requires these GitHub App permissions:

- **Pull requests**: Read & Write
- **Contents**: Read
- **Metadata**: Read
- **Repository webhooks**: Write
- **Checks**: Read & Write
- **Issues**: Read & Write

### **Webhook Events**

Configure these webhook events in your GitHub App:

- `pull_request` - PR lifecycle events
- `pull_request_review` - Review submissions
- `check_suite` / `check_run` - CI/CD status updates
- `installation` / `installation_repositories` - App lifecycle
- `marketplace_purchase` - Billing events

## 📚 **API Reference**

### **Authentication Endpoints**

```bash
# Start GitHub OAuth flow
GET /github/auth

# OAuth callback
GET /github/callback

# Check authentication status
GET /api/auth/status

# Logout
POST /api/auth/logout
```

### **Repository Management**

```bash
# List user repositories
GET /api/github/repositories

# Check app installation status
GET /api/github/installation-status/:repoId
```

### **Rule Management**

```bash
# Get rules for repository
GET /api/rules/repository/:repoId

# Create new rule
POST /api/rules
Content-Type: application/json
{
  "name": "Auto-merge docs",
  "conditions": {
    "filePatterns": ["*.md", "docs/**"],
    "maxRiskScore": 0.2
  },
  "actions": {
    "autoApprove": true,
    "autoMerge": true,
    "mergeMethod": "squash"
  }
}

# Update rule
PUT /api/rules/:ruleId

# Delete rule
DELETE /api/rules/:ruleId
```

### **GitHub Webhooks**

```bash
# GitHub webhook handler
POST /webhooks/github

# GitHub Marketplace billing
POST /webhooks/billing
```

### **Health & Monitoring**

```bash
# Health check
GET /health

# Get configuration
GET /api/config

# Submit feedback
POST /submit-feedback
```

## 🚀 **Deployment Guide**

### **AWS Lambda Deployment**

```bash
# 1. Install AWS SAM CLI
pip install aws-sam-cli

# 2. Configure AWS credentials
aws configure

# 3. Deploy to staging
./scripts/deploy.sh --environment staging

# 4. Deploy to production
./scripts/deploy.sh --environment production
```

### **Environment Setup**

1. **Create GitHub App**:
   - Go to GitHub Settings → Developer settings → GitHub Apps
   - Create new app with required permissions
   - Note the App ID and generate private key

2. **Configure Webhooks**:
   - Set webhook URL to your deployed endpoint
   - Select required webhook events
   - Generate webhook secret

3. **Set Environment Variables**:
   - Configure all required environment variables
   - Set up OpenAI API key for AI features
   - Configure database and Redis connections

### **Monitoring & Maintenance**

- **CloudWatch Logs**: Monitor application logs
- **Health Checks**: Automated health monitoring
- **Error Tracking**: Comprehensive error reporting
- **Performance Metrics**: Track response times and usage

## 🔧 Configuration

### GitHub App Setup

1. Create a new GitHub App in your organization settings
2. Configure webhook URL: `https://your-domain.com/api/webhooks/github`
3. Set required permissions:
   - Pull requests: Read & Write
   - Contents: Read
   - Metadata: Read
   - Repository webhooks: Write

### 🔧 Configuration Options

AutoMerge Pro supports two configuration methods:

#### Dashboard Configuration
- Visual rule builder with drag-and-drop interface
- Real-time rule validation and testing
- Team collaboration and approval workflows
- Advanced analytics and insights

#### Repository Configuration (`.automerge-pro.yml`)
```yaml
version: '1'
rules:
  - name: "Documentation auto-merge"
    conditions:
      filePatterns: ["*.md", "docs/**"]
      maxRiskScore: 0.2
    actions:
      autoApprove: true
      autoMerge: true
      mergeMethod: "squash"

notifications:
  slack:
    webhookUrl: "https://hooks.slack.com/your/webhook"
    events: ["auto_merged", "high_risk_pr"]

settings:
  aiAnalysis: true
  riskThreshold: 0.5
  autoDeleteBranches: true
```

**Hierarchy**: Repository config file > Dashboard rules > Default settings

### AI Risk Scoring

Our AI analyzes multiple factors:
- 🔒 **Security**: Vulnerabilities, auth changes, sensitive data
- 💥 **Breaking Changes**: API modifications, dependency updates
- 🧩 **Complexity**: Code complexity, file changes, test coverage
- 📋 **Quality**: Code style, documentation, best practices

***Disclaimer:** AI-powered analysis provides suggestions and insights to aid in your review process. It is not a substitute for human oversight, and we recommend always reviewing the AI's conclusions before merging.*

## 📖 API Reference

### Webhook Events

AutoMerge Pro listens for these GitHub webhook events:

- `pull_request` - PR opened, updated, closed
- `pull_request_review` - PR reviewed, approved
- `check_suite` - CI/CD status updates
- `installation` - App installed/uninstalled

### REST API Endpoints

```bash
# Configuration Management
GET /api/config/repo/:owner/:repo - Load repository configuration
POST /api/config/validate - Validate configuration
GET /api/config/example - Get example configuration
GET /api/config/repo/:owner/:repo/rules - Get merged rules

# Organization Management  
GET /api/rules/org/:orgId - Get organization rules
POST /api/rules/org/:orgId - Create new rule

# Billing & Usage
GET /api/billing/org/:orgId - Get billing information
POST /api/billing/org/:orgId/upgrade - Initiate plan upgrade

# Pull Request Analysis
GET /api/github/repositories/:repoId/pull-requests/:prNumber - Get PR analysis

# Notification Settings
POST /api/notifications/org/:orgId - Update notification settings
```

## 🔒 Security

AutoMerge Pro takes security seriously:

- 🔐 **Secure Authentication**: JWT tokens with secure HTTP-only cookies
- 🛡️ **CSRF Protection**: Built-in CSRF token validation
- ⚡ **Rate Limiting**: API rate limiting to prevent abuse
- 🔑 **Minimal Permissions**: Request only necessary GitHub permissions
- 🔒 **Data Encryption**: All data encrypted in transit and at rest

## 📚 Documentation

- [📖 User Guide](docs/user-guide.md)
- [🔧 API Reference](docs/api-reference.md)
- [🚀 Deployment Guide](docs/deployment.md)
- [🤝 Contributing Guide](docs/contributing.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## ⚖️ Legal & Licensing

- **EULA / License:** This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
- **Privacy Policy:** [docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md)
- **Terms of Service:** [docs/TERMS_OF_SERVICE.md](docs/TERMS_OF_SERVICE.md)

## ⚖️ Legal

- [Privacy Policy](docs/PRIVACY_POLICY.md)
- [Terms of Service](docs/TERMS_OF_SERVICE.md)

## 🆘 Support

- 📧 **Email**: support@automerge-pro.com
- 💬 **Discord**: [Join our community](https://discord.gg/automerge-pro)
- 🐛 **Issues**: [GitHub Issues](https://github.com/MichaelWBrennan/Test/issues)
- 📖 **Docs**: [Documentation](https://docs.automerge-pro.com)

---

<div align="center">

**Ready to automate your PR workflow?** 

[![Add to GitHub](https://img.shields.io/badge/Add%20to%20GitHub-AutoMerge%20Pro-brightgreen?style=for-the-badge)](https://github.com/apps/automerge-pro)

[Visit our website](https://automerge-pro.com) • [Read the docs](https://docs.automerge-pro.com) • [Join our community](https://discord.gg/automerge-pro)

</div>