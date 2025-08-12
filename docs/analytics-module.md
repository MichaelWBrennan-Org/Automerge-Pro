# Analytics Module Documentation

## Overview

The Analytics module for Automerge-Pro provides comprehensive real-time event tracking, data pipeline integration, dashboard metrics, anomaly detection, and automated reporting capabilities.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Analytics     │    │   Data Pipeline │
│   (Events)      │───▶│   Service       │───▶│   (AWS/GCP)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                       ┌───────▼───────┐
                       │   Local DB    │
                       │  (Postgres)   │
                       └───────────────┘
                               │
                       ┌───────▼───────┐
                       │  Queue System │
                       │   (Redis)     │
                       └───────┬───────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼───────┐    ┌────────▼────────┐    ┌────────▼────────┐
│   Anomaly     │    │   Reporting     │    │  Dashboard      │
│  Detection    │    │   Service       │    │   Metrics       │
└───────────────┘    └─────────────────┘    └─────────────────┘
```

## Components

### 1. Analytics Service (`src/services/analytics.ts`)

Core service that handles:
- Event tracking and storage
- Metrics calculation
- Dashboard data generation
- Anomaly detection
- Data export functionality

### 2. Data Pipeline Service (`src/services/data-pipeline.ts`)

Handles external data ingestion to:
- **AWS Kinesis**: Real-time data streaming
- **Google BigQuery**: Data warehousing and analytics
- **Local Provider**: Development/testing fallback

### 3. Reporting Service (`src/services/reporting.ts`)

Generates comprehensive reports:
- Weekly/Monthly/Quarterly reports
- HTML and PDF formats
- Email distribution
- Automated scheduling

### 4. Analytics Worker (`src/services/analytics-worker.ts`)

Background job processor for:
- Processing analytics events
- Running anomaly detection
- Generating scheduled reports
- Data cleanup tasks

### 5. Analytics Routes (`src/routes/analytics.ts`)

REST API endpoints:
- `GET /analytics/dashboard/:organizationId` - Dashboard data
- `GET /analytics/metrics/:organizationId` - Detailed metrics
- `POST /analytics/events` - Track events
- `POST /analytics/reports` - Generate reports
- `POST /analytics/export` - Export data

## Event Types

The system tracks the following event categories:

### Installation & Setup Events
- `APP_INSTALLED` - Application installed on organization
- `APP_UNINSTALLED` - Application removed
- `REPOSITORY_ADDED` - Repository added to installation
- `REPOSITORY_REMOVED` - Repository removed

### User Onboarding Events
- `USER_ONBOARDED` - New user completed onboarding
- `ONBOARDING_STEP_COMPLETED` - Individual onboarding step
- `FIRST_RULE_CREATED` - User created their first automation rule
- `CONFIGURATION_COMPLETED` - Initial setup completed

### Pull Request Automation Events
- `PULL_REQUEST_CREATED` - New PR opened
- `PULL_REQUEST_ANALYZED` - AI analysis completed
- `PULL_REQUEST_AUTO_APPROVED` - PR automatically approved
- `PULL_REQUEST_AUTO_MERGED` - PR automatically merged
- `PULL_REQUEST_MANUAL_REVIEW` - PR requires manual review
- `PULL_REQUEST_RISK_DETECTED` - High-risk PR detected

### Rule & Configuration Events
- `RULE_CREATED` - New automation rule created
- `RULE_UPDATED` - Rule modified
- `RULE_TRIGGERED` - Rule applied to PR
- `CONFIGURATION_UPDATED` - Settings changed

### Billing & Subscription Events
- `SUBSCRIPTION_CREATED` - New subscription
- `PLAN_UPGRADED` - Plan tier increased
- `PLAN_DOWNGRADED` - Plan tier decreased
- `USAGE_LIMIT_REACHED` - Usage threshold exceeded

### Feature Usage Events
- `DASHBOARD_VIEWED` - User accessed dashboard
- `AI_ANALYSIS_REQUESTED` - AI analysis triggered
- `NOTIFICATION_SENT` - Alert/notification delivered
- `INTEGRATION_CONFIGURED` - Third-party integration setup

## Configuration

### Environment Variables

```bash
# Analytics Configuration
ANALYTICS_ENABLED=true
ANALYTICS_PROVIDER=local  # local, kinesis, or bigquery

# AWS Configuration (for Kinesis)
AWS_REGION=us-east-1
AWS_KINESIS_STREAM_NAME=automerge-pro-events
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Google BigQuery Configuration
BIGQUERY_PROJECT_ID=your_project_id
BIGQUERY_DATASET_ID=automerge_pro
BIGQUERY_TABLE_ID=events
BIGQUERY_KEY_FILENAME=/path/to/service-account-key.json

# Anomaly Detection Configuration
ANOMALY_DETECTION_ENABLED=true
ALERT_ERROR_RATE_THRESHOLD=0.05
ALERT_RESPONSE_TIME_THRESHOLD=5000
ALERT_USER_DROPOFF_THRESHOLD=0.3

# Scheduled Reporting Configuration
SCHEDULED_REPORTING_ENABLED=true
REPORT_SCHEDULE=0 9 * * MON  # Every Monday at 9 AM
REPORT_RECIPIENTS=admin@automerge-pro.com,analytics@automerge-pro.com
```

## Data Schema

### Analytics Event Schema

```typescript
interface AnalyticsEvent {
  id: string;                    // Unique event identifier
  timestamp: Date;               // When the event occurred
  eventType: AnalyticsEventType; // Type of event (enum)
  organizationId: string;        // Organization context
  userId?: string;               // User who triggered event
  repositoryId?: string;         // Repository context
  pullRequestId?: string;        // PR context
  properties: Record<string, any>; // Event-specific data
  metadata?: {                   // Request metadata
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
    version?: string;
  };
}
```

### Metrics Schema

```typescript
interface AnalyticsMetrics {
  // User growth metrics
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  
  // Revenue metrics
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
  churnRate: number;
  conversionRate: number;
  
  // Feature usage metrics
  totalPullRequests: number;
  autoMergedPullRequests: number;
  aiAnalysisRequests: number;
  averageRiskScore: number;
  
  // Performance metrics
  averageResponseTime: number;
  errorRate: number;
  uptime: number;
  
  // Time range
  periodStart: Date;
  periodEnd: Date;
}
```

## External Data Pipeline Setup

### AWS Kinesis Setup

1. Create a Kinesis Data Stream:
```bash
aws kinesis create-stream \
  --stream-name automerge-pro-events \
  --shard-count 1
```

2. Create IAM policy for Kinesis access:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kinesis:PutRecord",
        "kinesis:PutRecords"
      ],
      "Resource": "arn:aws:kinesis:region:account:stream/automerge-pro-events"
    }
  ]
}
```

### Google BigQuery Setup

1. Create dataset:
```sql
CREATE SCHEMA `automerge_pro`
OPTIONS(
  location="US"
);
```

2. Events table will be created automatically by the service, or manually:
```sql
CREATE TABLE `automerge_pro.events` (
  id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  event_type STRING NOT NULL,
  organization_id STRING NOT NULL,
  user_id STRING,
  repository_id STRING,
  pull_request_id STRING,
  properties JSON,
  metadata JSON,
  created_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(timestamp)
OPTIONS(
  partition_expiration_days=365
);
```

## Dashboard Metrics

The analytics dashboard provides the following key metrics:

### User Growth
- Total registered users
- New user signups (daily/weekly/monthly)
- Active users (DAU/WAU/MAU)
- User retention rates
- Geographic distribution

### Revenue Analytics
- Monthly Recurring Revenue (MRR)
- Average Revenue Per User (ARPU)
- Customer Lifetime Value (CLV)
- Churn rate and reasons
- Conversion funnel metrics

### Feature Usage
- Pull requests processed
- Auto-merge success rate
- AI analysis utilization
- Rule effectiveness
- Feature adoption rates

### Performance Metrics
- API response times
- Error rates by endpoint
- System uptime
- Queue processing times
- Resource utilization

## Anomaly Detection

The system automatically detects anomalies in:

### Error Rate Monitoring
- Threshold: 5% error rate
- Detection window: 1 hour
- Alert channels: Slack, Email

### Response Time Monitoring
- Threshold: 5 seconds average response time
- Detection window: 15 minutes
- Alert channels: Slack

### User Behavior Anomalies
- Sudden drops in user activity (>30%)
- Unusual error patterns
- Performance degradation

### Alert Configuration

Alerts are sent via:
- **Slack**: Real-time notifications to #alerts channel
- **Email**: High/critical alerts to configured recipients
- **Webhook**: Custom integrations (optional)

## Scheduled Reports

### Report Types

1. **Weekly Summary**
   - Key metrics overview
   - Week-over-week changes
   - Top performing features
   - User engagement summary

2. **Monthly Business Review**
   - Revenue and growth metrics
   - Customer acquisition/retention
   - Feature usage analysis
   - Competitive insights

3. **Quarterly Strategic Report**
   - Long-term trends
   - Market analysis
   - Product roadmap insights
   - Stakeholder summary

### Report Formats

- **HTML**: Rich, interactive reports with charts
- **PDF**: Printable executive summaries
- **CSV**: Raw data for further analysis
- **JSON**: Programmatic access to metrics

## API Usage Examples

### Track a Custom Event

```typescript
// Track user onboarding completion
await fetch('/api/analytics/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventType: 'USER_ONBOARDED',
    organizationId: 'org_123',
    userId: 'user_456',
    properties: {
      onboardingDuration: 300, // seconds
      stepsCompleted: 5,
      source: 'dashboard'
    }
  })
});
```

### Get Dashboard Data

```typescript
const response = await fetch('/api/analytics/dashboard/org_123?days=30');
const data = await response.json();

console.log('Active Users:', data.data.metrics.activeUsers);
console.log('Auto-merge Rate:', data.data.metrics.autoMergedPullRequests / data.data.metrics.totalPullRequests);
```

### Generate Report

```typescript
const report = await fetch('/api/analytics/reports', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationId: 'org_123',
    reportType: 'weekly',
    format: 'HTML',
    email: true,
    recipients: ['team@company.com']
  })
});
```

### Export Data

```typescript
const exportData = await fetch('/api/analytics/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationId: 'org_123',
    format: 'CSV',
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  })
});
```

## Integration with Existing Services

### Adding Event Tracking to New Features

1. Import the analytics tracker:
```typescript
import { AnalyticsTracker } from '../utils/analytics-tracker.js';
```

2. Track relevant events:
```typescript
// In your service method
await analyticsTracker.trackPullRequestCreated(
  organizationId,
  repositoryId,
  pullRequestId,
  userId
);
```

### Middleware Integration

Add automatic API request tracking:

```typescript
import { createAnalyticsMiddleware } from '../utils/analytics-tracker.js';

// In your route setup
app.addHook('onRequest', createAnalyticsMiddleware(analyticsTracker));
```

## Best Practices

### Event Tracking
- Track user intent, not just system events
- Include relevant context in event properties
- Use consistent naming conventions
- Avoid tracking sensitive information

### Performance
- Events are processed asynchronously
- Local storage provides immediate queryability
- External pipelines handle long-term storage
- Batch processing reduces API overhead

### Privacy & Compliance
- No PII in event properties
- Configurable data retention periods
- GDPR-compliant data export/deletion
- Anonymized metrics aggregation

## Troubleshooting

### Common Issues

1. **Events not appearing in external pipeline**
   - Check provider configuration
   - Verify credentials and permissions
   - Check worker logs for errors

2. **High memory usage**
   - Adjust batch sizes in worker configuration
   - Increase cleanup job frequency
   - Monitor queue depths

3. **Missing metrics**
   - Verify event tracking is enabled
   - Check database connectivity
   - Ensure proper time range queries

### Monitoring Commands

```bash
# Check analytics service health
curl http://localhost:3001/api/analytics/health

# View recent events in Redis queue
redis-cli LRANGE bull:analytics:waiting 0 10

# Check PostgreSQL for stored events
psql -d automerge_pro -c "SELECT event, COUNT(*) FROM webhook_events GROUP BY event;"
```

## Future Enhancements

### Planned Features
- Real-time dashboard updates via WebSocket
- Custom metric definitions and tracking
- A/B testing framework integration
- Advanced ML-based anomaly detection
- Multi-tenant analytics isolation
- Custom dashboard builder

### Integration Opportunities
- Salesforce CRM data sync
- HubSpot marketing automation
- Google Analytics Enhanced Ecommerce
- Segment.io customer data platform
- Mixpanel advanced analytics

## Support

For questions or issues with the analytics module:

1. Check the application logs for error details
2. Verify configuration in `.env` file
3. Test with the health endpoint
4. Contact the development team with specific error messages

The analytics module is designed to be robust and fail gracefully - analytics failures should never impact core application functionality.