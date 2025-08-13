#!/bin/bash
# Deploy script to create Lambda deployment zip (functions.zip)

set -e

echo "🚀 Creating Lambda deployment package..."

# Create temporary directory for deployment package
DEPLOY_DIR="lambda-deployment"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

echo "📦 Copying essential files..."

# Copy core Lambda files
cp index.js $DEPLOY_DIR/
cp lambda.js $DEPLOY_DIR/
cp server.js $DEPLOY_DIR/
cp package.json $DEPLOY_DIR/

# Copy source directory
cp -r src $DEPLOY_DIR/

echo "🔍 Installing production dependencies..."

# Install only production dependencies in the deployment directory
cd $DEPLOY_DIR
npm install --production --ignore-scripts

# Remove unnecessary files from node_modules to reduce size
echo "🧹 Cleaning up unnecessary files..."
find node_modules -name "*.md" -delete
find node_modules -name "*.txt" -delete
find node_modules -name "test" -type d -exec rm -rf {} + 2>/dev/null || true
find node_modules -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true
find node_modules -name "example" -type d -exec rm -rf {} + 2>/dev/null || true
find node_modules -name "examples" -type d -exec rm -rf {} + 2>/dev/null || true
find node_modules -name "*.map" -delete
find node_modules -name "*.d.ts" -delete 2>/dev/null || true

cd ..

echo "🗜️ Creating functions.zip..."

# Create the deployment zip file
cd $DEPLOY_DIR
zip -r ../functions.zip . -x "*.git*" "*.DS_Store*" "*.env*" "*.log*"
cd ..

# Display zip contents for verification
echo ""
echo "📋 Deployment package contents:"
unzip -l functions.zip | head -20
echo "..."
echo "Total files: $(unzip -l functions.zip | grep -c "^  ")"
echo ""

# Show zip file size
ZIPSIZE=$(ls -lh functions.zip | awk '{print $5}')
echo "✅ functions.zip created successfully! Size: $ZIPSIZE"

# Clean up temporary directory
rm -rf $DEPLOY_DIR

echo ""
echo "🎉 Lambda deployment package ready for AWS deployment!"
echo "📁 File: functions.zip"
echo "📖 Contents: index.js, lambda.js, server.js, package.json, src/, node_modules/"
echo ""
echo "To deploy to AWS Lambda:"
echo "aws lambda update-function-code --function-name automerge-pro --zip-file fileb://functions.zip"