# Lambda Deployment Package Documentation

## Overview
The `functions.zip` file contains a complete AWS Lambda deployment package for Automerge-Pro. This package includes all necessary files and dependencies required to run the application in AWS Lambda.

## Package Contents

### Core Files
- **`index.js`** - AWS Lambda entry point that exports the main handler function
- **`lambda.js`** - Serverless Express wrapper using @vendia/serverless-express
- **`server.js`** - Express.js application server with GitHub webhook handlers
- **`package.json`** - Node.js dependencies and project configuration
- **`package-lock.json`** - Locked dependency versions for reproducible builds

### Source Code
- **`src/`** - Application source code directory
  - `src/automerge.js` - Core automerge logic and rule evaluation
  - `src/billing.js` - GitHub Marketplace billing and subscription management
  - `src/config.js` - Configuration file parsing and validation
  - `src/lambda/validate-license.js` - License validation Lambda function

### Dependencies
- **`node_modules/`** - Production dependencies (379 packages)
  - `@vendia/serverless-express` - AWS Lambda Express wrapper
  - `express` - Web application framework
  - `probot` - GitHub App framework
  - `aws-sdk` - AWS services SDK
  - `js-yaml` - YAML parser for configuration files
  - And other necessary dependencies

## Deployment

### AWS Lambda Function Configuration
```bash
# Create or update Lambda function
aws lambda update-function-code \
  --function-name automerge-pro \
  --zip-file fileb://functions.zip

# Or deploy with AWS SAM
sam deploy --template-file template.yaml
```

### Environment Variables Required
```
APP_ID=<GitHub App ID>
PRIVATE_KEY=<GitHub App Private Key>
WEBHOOK_SECRET=<GitHub Webhook Secret>
AWS_REGION=us-east-1
STAGE=prod
JWT_SECRET=<JWT Secret>
OPENAI_API_KEY=<OpenAI API Key>
```

### Lambda Function Settings
- **Runtime**: Node.js 18.x or later
- **Handler**: `index.handler`
- **Memory**: 512MB (configurable)
- **Timeout**: 30 seconds (configurable)
- **Architecture**: x86_64 or arm64

## Package Generation

The deployment package is created using the `create-lambda-zip.sh` script:

```bash
./create-lambda-zip.sh
```

This script:
1. Creates a temporary deployment directory
2. Copies all necessary source files
3. Installs production dependencies
4. Optimizes package size by removing unnecessary files
5. Creates the final `functions.zip` file

## Testing

Verify the deployment package using the test script:

```bash
node test-lambda-package.js
```

This validates:
- Handler function is properly exported
- Dependencies can be imported
- Basic Lambda execution works

## Package Size Optimization

The script automatically optimizes package size by removing:
- Development dependencies
- Test files and directories
- Documentation files (*.md, *.txt)
- TypeScript definition files (*.d.ts)
- Source maps (*.map)
- Example directories

## Troubleshooting

### Common Issues
1. **Module not found** - Ensure all dependencies are included in package.json
2. **Handler not found** - Verify index.js exports `handler` function
3. **Timeout errors** - Increase Lambda timeout setting
4. **Memory errors** - Increase Lambda memory allocation

### Debug Mode
Set environment variable `DEBUG=true` for verbose logging.

## File Structure in ZIP
```
functions.zip
├── index.js                    # Lambda entry point
├── lambda.js                   # Serverless Express wrapper
├── server.js                   # Express application
├── package.json                # Dependencies
├── package-lock.json           # Locked versions
├── src/                        # Source code
│   ├── automerge.js
│   ├── billing.js
│   ├── config.js
│   └── lambda/
│       └── validate-license.js
└── node_modules/               # Dependencies (379 packages)
    ├── @vendia/
    ├── express/
    ├── probot/
    └── ... (other dependencies)
```

## Security Notes

- Package includes only production dependencies
- No sensitive credentials are embedded
- All configuration via environment variables
- Minimal file permissions in Lambda environment

## Version Information

- **Package Version**: 1.0.0
- **Node.js Version**: 18.x+
- **AWS SDK Version**: 2.x (with migration path to 3.x noted)
- **Package Size**: ~14MB compressed
- **File Count**: 7,260 files