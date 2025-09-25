#!/bin/bash

# AutoMerge Pro Deployment Script
# This script handles deployment to different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="staging"
REGION="us-east-1"
STACK_NAME=""
DRY_RUN=false
SKIP_TESTS=false

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Deployment environment (staging|production) [default: staging]"
    echo "  -r, --region REGION      AWS region [default: us-east-1]"
    echo "  -s, --stack-name NAME    CloudFormation stack name [default: automerge-pro-ENV]"
    echo "  -d, --dry-run           Show what would be deployed without actually deploying"
    echo "  --skip-tests            Skip running tests before deployment"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --environment staging"
    echo "  $0 --environment production --region us-west-2"
    echo "  $0 --dry-run --environment staging"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -s|--stack-name)
            STACK_NAME="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Set default stack name if not provided
if [ -z "$STACK_NAME" ]; then
    STACK_NAME="automerge-pro-${ENVIRONMENT}"
fi

print_status "Starting deployment to ${ENVIRONMENT} environment"
print_status "Region: ${REGION}"
print_status "Stack Name: ${STACK_NAME}"

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v sam &> /dev/null; then
        print_error "AWS SAM CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install it first."
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Run tests
run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        print_warning "Skipping tests as requested"
        return
    fi
    
    print_status "Running tests..."
    
    # Install dependencies
    npm ci
    
    # Run linting
    print_status "Running ESLint..."
    npm run lint
    
    # Run type checking
    print_status "Running TypeScript type checking..."
    npm run type-check
    
    # Run unit tests
    print_status "Running unit tests..."
    npm test
    
    print_success "All tests passed"
}

# Build the application
build_application() {
    print_status "Building application..."
    
    # Build backend
    print_status "Building backend..."
    cd apps/backend
    npm ci
    npm run build
    cd ../..
    
    # Build frontend
    print_status "Building frontend..."
    cd apps/frontend
    npm ci
    npm run build
    cd ../..
    
    # Build root package
    print_status "Building root package..."
    npm run build
    
    print_success "Application built successfully"
}

# Validate CloudFormation template
validate_template() {
    print_status "Validating CloudFormation template..."
    
    sam validate --template template.yaml
    
    print_success "Template validation passed"
}

# Deploy to AWS
deploy_to_aws() {
    print_status "Deploying to AWS..."
    
    # Set environment variables
    export AWS_DEFAULT_REGION=$REGION
    
    # Prepare parameters
    PARAMETERS=""
    
    # Add required parameters based on environment
    if [ "$ENVIRONMENT" = "production" ]; then
        if [ -z "$GITHUB_APP_ID_PROD" ]; then
            print_error "GITHUB_APP_ID_PROD environment variable is required for production deployment"
            exit 1
        fi
        if [ -z "$GITHUB_PRIVATE_KEY_PROD" ]; then
            print_error "GITHUB_PRIVATE_KEY_PROD environment variable is required for production deployment"
            exit 1
        fi
        if [ -z "$GITHUB_WEBHOOK_SECRET_PROD" ]; then
            print_error "GITHUB_WEBHOOK_SECRET_PROD environment variable is required for production deployment"
            exit 1
        fi
        
        PARAMETERS="--parameter-overrides \
            Stage=prod \
            AppId=$GITHUB_APP_ID_PROD \
            PrivateKey=$GITHUB_PRIVATE_KEY_PROD \
            WebhookSecret=$GITHUB_WEBHOOK_SECRET_PROD \
            OpenAIAPIKey=$OPENAI_API_KEY \
            AlertEmail=$ALERT_EMAIL_PROD"
    else
        if [ -z "$GITHUB_APP_ID_STAGING" ]; then
            print_error "GITHUB_APP_ID_STAGING environment variable is required for staging deployment"
            exit 1
        fi
        if [ -z "$GITHUB_PRIVATE_KEY_STAGING" ]; then
            print_error "GITHUB_PRIVATE_KEY_STAGING environment variable is required for staging deployment"
            exit 1
        fi
        if [ -z "$GITHUB_WEBHOOK_SECRET_STAGING" ]; then
            print_error "GITHUB_WEBHOOK_SECRET_STAGING environment variable is required for staging deployment"
            exit 1
        fi
        
        PARAMETERS="--parameter-overrides \
            Stage=staging \
            AppId=$GITHUB_APP_ID_STAGING \
            PrivateKey=$GITHUB_PRIVATE_KEY_STAGING \
            WebhookSecret=$GITHUB_WEBHOOK_SECRET_STAGING \
            OpenAIAPIKey=$OPENAI_API_KEY \
            AlertEmail=$ALERT_EMAIL"
    fi
    
    # Add optional parameters
    if [ ! -z "$MAILCHIMP_API_KEY" ]; then
        PARAMETERS="$PARAMETERS MailchimpAPIKey=$MAILCHIMP_API_KEY"
    fi
    
    if [ ! -z "$TWITTER_API_KEY" ]; then
        PARAMETERS="$PARAMETERS TwitterAPIKey=$TWITTER_API_KEY"
    fi
    
    if [ ! -z "$LINKEDIN_API_KEY" ]; then
        PARAMETERS="$PARAMETERS LinkedInAPIKey=$LINKEDIN_API_KEY"
    fi
    
    if [ ! -z "$SNYK_TOKEN" ]; then
        PARAMETERS="$PARAMETERS SnykToken=$SNYK_TOKEN"
    fi
    
    if [ ! -z "$BIGQUERY_PROJECT_ID" ]; then
        PARAMETERS="$PARAMETERS BigQueryProjectID=$BIGQUERY_PROJECT_ID"
    fi
    
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        PARAMETERS="$PARAMETERS SlackWebhookURL=$SLACK_WEBHOOK_URL"
    fi
    
    # Create S3 bucket for deployment artifacts if it doesn't exist
    BUCKET_NAME="automerge-pro-deployments-${ENVIRONMENT}"
    print_status "Creating S3 bucket for deployment artifacts..."
    
    if ! aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
        print_status "S3 bucket $BUCKET_NAME already exists"
    else
        aws s3 mb "s3://$BUCKET_NAME" --region $REGION
        print_success "Created S3 bucket: $BUCKET_NAME"
    fi
    
    # Deploy with SAM
    if [ "$DRY_RUN" = true ]; then
        print_status "DRY RUN: Would deploy with the following command:"
        echo "sam deploy --template-file template.yaml --stack-name $STACK_NAME $PARAMETERS --capabilities CAPABILITY_IAM --s3-bucket $BUCKET_NAME"
    else
        sam deploy \
            --template-file template.yaml \
            --stack-name $STACK_NAME \
            $PARAMETERS \
            --capabilities CAPABILITY_IAM \
            --s3-bucket $BUCKET_NAME \
            --no-confirm-changeset \
            --no-fail-on-empty-changeset
        
        print_success "Deployment completed successfully"
    fi
}

# Get deployment outputs
get_outputs() {
    if [ "$DRY_RUN" = true ]; then
        print_status "DRY RUN: Would get deployment outputs"
        return
    fi
    
    print_status "Getting deployment outputs..."
    
    # Get API Gateway URL
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`AutomergeProApi`].OutputValue' \
        --output text)
    
    # Get Webhook URL
    WEBHOOK_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`WebhookUrl`].OutputValue' \
        --output text)
    
    print_success "Deployment outputs:"
    echo "  API URL: $API_URL"
    echo "  Webhook URL: $WEBHOOK_URL"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        print_warning "Don't forget to update your GitHub App webhook URL to: $WEBHOOK_URL"
    fi
}

# Run health check
health_check() {
    if [ "$DRY_RUN" = true ]; then
        print_status "DRY RUN: Would run health check"
        return
    fi
    
    print_status "Running health check..."
    
    # Get API URL
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`AutomergeProApi`].OutputValue' \
        --output text)
    
    if [ -z "$API_URL" ]; then
        print_error "Could not get API URL from CloudFormation stack"
        return
    fi
    
    # Wait for deployment to be ready
    print_status "Waiting for deployment to be ready..."
    sleep 30
    
    # Test health endpoint
    if curl -f "${API_URL}health" > /dev/null 2>&1; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        exit 1
    fi
}

# Main deployment flow
main() {
    print_status "Starting AutoMerge Pro deployment process..."
    
    check_dependencies
    run_tests
    build_application
    validate_template
    deploy_to_aws
    get_outputs
    health_check
    
    print_success "Deployment completed successfully!"
    print_status "Next steps:"
    echo "  1. Update your GitHub App webhook URL"
    echo "  2. Test the installation with a sample repository"
    echo "  3. Monitor CloudWatch logs for any issues"
    echo "  4. Set up monitoring and alerting"
}

# Run main function
main