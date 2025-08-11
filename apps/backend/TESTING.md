# Testing Guide for Automerge-Pro Backend

This guide covers the comprehensive test suite implemented for the Automerge-Pro GitHub App backend, including unit tests, integration tests, and instructions for running them.

## Test Overview

The test suite includes:
- **Unit Tests**: Test individual services and components in isolation
- **Integration Tests**: Test API routes and webhook handlers
- **Mock Framework**: Comprehensive mocking for external dependencies
- **AWS Lambda Environment**: Simulation for serverless deployment testing

## Test Coverage

### 1. Feature Gating Service (`feature-gating.test.ts`)
Tests the billing and plan limit enforcement:
- ✅ Plan limits validation (FREE, TEAM, GROWTH, ENTERPRISE)
- ✅ Repository count enforcement
- ✅ Feature access checking
- ✅ Usage statistics reporting
- ✅ Automatic rule disabling for excess repositories

### 2. Configuration Service (`configuration.test.ts`)
Tests .automerge-pro.yml parsing and validation:
- ✅ YAML config loading from GitHub repositories
- ✅ Schema validation with Zod
- ✅ Error handling for invalid configurations
- ✅ Merging config rules with database rules
- ✅ Example configuration generation

### 3. Billing Routes (`billing-routes.test.ts`)
Tests marketplace webhook handling:
- ✅ GitHub Marketplace purchase events
- ✅ Plan changes and cancellations
- ✅ Webhook signature verification
- ✅ Organization billing data retrieval
- ✅ Upgrade URL generation

### 4. AI Analyzer (`ai-analyzer.test.ts`)
Tests AI-powered PR analysis:
- ✅ OpenAI API integration with mocking
- ✅ Risk score calculation
- ✅ Fallback analysis for API errors
- ✅ File pattern-based risk assessment
- ✅ Different PR types (documentation, security, dependencies)

## Mock Framework

### GitHub Webhook Payloads (`mocks/webhook-payloads.ts`)
Comprehensive mock data for testing webhook handlers:
- `pullRequestPayloads`: Various PR events (opened, synchronize, dependabot)
- `checkRunPayloads`: CI/CD status events
- `marketplacePurchasePayloads`: Billing events (purchased, changed, cancelled)
- `pullRequestFiles`: Different file change types (docs, security, dependencies)

### Test Utilities (`utils/test-utils.ts`)
Helper functions for test setup:
- `mockLambdaEnvironment()`: AWS Lambda environment simulation
- `createMockPrismaClient()`: Database client mocking
- `createMockRedisClient()`: Cache client mocking
- `createMockOctokit()`: GitHub API client mocking
- `createMockFastify*()`: Web framework mocking

## Running Tests

### Prerequisites
```bash
cd apps/backend
npm install
```

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run tests in watch mode (for development)
npm test -- --watch

# Run specific test file
npm test -- feature-gating.test.ts

# Run tests matching a pattern
npm test -- --testPathPattern=billing

# Run tests with verbose output
npm test -- --verbose
```

### Advanced Test Commands

```bash
# Run tests and generate coverage report
npm test -- --coverage --coverageReporters=text-lcov

# Run only changed files (in git repos)
npm test -- --changedSince=origin/main

# Run tests with specific reporter
npm test -- --reporters=default --reporters=jest-junit

# Debug tests (run with Node debugger)
npm test -- --runInBand --no-cache
```

## Environment Variables for Testing

The test suite automatically sets up mock environment variables:

```bash
NODE_ENV=test
APP_ID=123456
PRIVATE_KEY=test-private-key
WEBHOOK_SECRET=test-webhook-secret
JWT_SECRET=test-jwt-secret
DATABASE_URL=postgresql://test:test@localhost:5432/test
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=test-openai-key
```

## Writing New Tests

### Test Structure
```typescript
import { ServiceToTest } from '../src/services/service-to-test';
import { createMockDependency } from './utils/test-utils';

describe('ServiceToTest', () => {
  let service: ServiceToTest;
  let mockDependency: any;

  beforeEach(() => {
    mockDependency = createMockDependency();
    service = new ServiceToTest(mockDependency);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodToTest', () => {
    it('should handle success case', async () => {
      // Arrange
      mockDependency.someMethod.mockResolvedValue('expected result');
      
      // Act
      const result = await service.methodToTest('input');
      
      // Assert
      expect(result).toBe('expected result');
      expect(mockDependency.someMethod).toHaveBeenCalledWith('input');
    });
  });
});
```

### Testing API Routes
```typescript
import { routeHandler } from '../src/routes/my-route';
import { createMockFastifyRequest, createMockFastifyReply } from './utils/test-utils';

describe('My Route', () => {
  it('should handle POST request', async () => {
    const request = createMockFastifyRequest({
      body: { key: 'value' },
      params: { id: 'test-id' }
    });
    const reply = createMockFastifyReply();

    await routeHandler(request, reply);

    expect(reply.send).toHaveBeenCalledWith({ success: true });
  });
});
```

## AWS Lambda Testing

The test suite includes utilities for testing AWS Lambda deployment:

```typescript
import { createLambdaEvent, createLambdaContext } from './utils/test-utils';

describe('Lambda Integration', () => {
  it('should handle Lambda event', async () => {
    const event = createLambdaEvent('POST', '/api/webhook');
    const context = createLambdaContext();
    
    // Test Lambda handler
    const response = await lambdaHandler(event, context);
    
    expect(response.statusCode).toBe(200);
  });
});
```

## Continuous Integration

The GitHub Actions workflow automatically runs tests on:
- Pull requests to main branch
- Pushes to main and develop branches

### Test Workflow Steps:
1. **Install Dependencies**: `npm ci`
2. **Run Tests**: `npm test -- --coverage --passWithNoTests`
3. **Upload Coverage**: Reports sent to Codecov
4. **Lint & Type Check**: Code quality validation

## Coverage Reports

Test coverage is tracked for:
- Statements
- Branches
- Functions
- Lines

Coverage reports are generated in `coverage/` directory and include:
- `coverage/lcov-report/index.html`: Interactive HTML report
- `coverage/coverage-final.json`: Machine-readable coverage data
- Terminal output with coverage summary

## Debugging Tests

### Common Issues:
1. **Async Operations**: Use `await` and proper async/await patterns
2. **Mock Cleanup**: Use `afterEach(() => jest.clearAllMocks())`
3. **Environment Variables**: Check test setup for required env vars
4. **External Dependencies**: Ensure all external calls are mocked

### Debug Commands:
```bash
# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Enable verbose logging
DEBUG=* npm test

# Run specific test with debugging
npm test -- --testNamePattern="specific test name" --verbose
```

## Contributing to Tests

When adding new features:

1. **Write tests first** (TDD approach)
2. **Mock external dependencies** (APIs, databases, etc.)
3. **Test both success and error cases**
4. **Add integration tests** for API endpoints
5. **Update this documentation** for new test patterns

### Test Checklist:
- [ ] Unit tests for business logic
- [ ] Integration tests for API routes
- [ ] Error handling tests
- [ ] Mock all external dependencies
- [ ] Test coverage > 80%
- [ ] Tests pass in CI/CD pipeline

## Performance Testing

For performance-critical code, consider adding:
- Benchmark tests using `performance.now()`
- Memory usage monitoring
- Load testing for API endpoints

```typescript
it('should perform within acceptable time', async () => {
  const start = performance.now();
  
  await service.performanceStrictMethod();
  
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(1000); // 1 second max
});
```

---

For questions or issues with the test suite, please check the existing test files for examples or create an issue in the repository.