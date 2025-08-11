# AutoMerge Pro Server Usage Guide

This document explains how to use the simple server.js implementation of AutoMerge Pro.

## Server Architecture

The `server.js` file provides a complete GitHub App implementation using:
- **Express.js** for the web server
- **Probot** for GitHub App event handling
- **Modular design** with separate automerge and billing logic

## Quick Start

1. **Setup environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your GitHub App credentials
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm run server
   ```

## Features

### Automerge Logic (`src/automerge.js`)

The server automatically evaluates pull requests based on these rules:

- **Documentation-only changes**: `*.md`, `docs/`, `README*`
- **Small config changes**: `*.yml`, `*.json`, `*.toml`, less than 50 lines
- **Test-only changes**: `test/`, `spec/`, `__tests__/`
- **Minor dependency updates**: patch/minor versions only

### Billing System (`src/billing.js`)

Handles GitHub Marketplace integration:

- **Plan Management**: Free, Pro, Enterprise tiers
- **Usage Limits**: Repository and rule limits per plan
- **Feature Gating**: Controls access to premium features
- **Event Processing**: Handles purchase, change, and cancellation events

### API Endpoints

- `GET /health` - Server health check
- `GET /api/config` - Available subscription plans
- `GET /api/billing/:accountId` - Account subscription info
- `POST /api/validate/:accountId/:operation` - Validate operations against limits

## Environment Variables

```bash
# Required
APP_ID=123456
PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
WEBHOOK_SECRET=your_webhook_secret

# Optional
PORT=3000
NODE_ENV=development
```

## Webhook Events Handled

- `pull_request` - Evaluates and potentially auto-merges PRs
- `marketplace_purchase` - Handles billing events
- `installation` - Manages app installations

## Extending the Server

To add custom automerge rules, edit `src/automerge.js`:

```javascript
// Add new rule in evaluateAutomergeRules function
if (isCustomCondition(files, pullRequest)) {
  return { shouldMerge: true, reason: 'custom-rule' };
}
```

To add billing features, edit `src/billing.js`:

```javascript
// Add new plan features
PLANS.CUSTOM = {
  name: 'Custom',
  features: ['custom_feature'],
  // ...
};
```

## Development

Use `npm run server:dev` for auto-reloading during development.

## Production Deployment

The server can be deployed to any Node.js hosting platform:
- Heroku
- Vercel
- Railway
- DigitalOcean App Platform
- AWS/GCP/Azure

Make sure to set the webhook URL in your GitHub App settings to match your deployed URL: `https://yourdomain.com/webhooks/github`