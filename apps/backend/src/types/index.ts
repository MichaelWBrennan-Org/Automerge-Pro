export interface User {
  id: string;
  githubId: string;
  login: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  githubId: string;
  login: string;
  name?: string;
  plan: 'FREE' | 'TEAM' | 'GROWTH' | 'ENTERPRISE';
}

export interface MergeRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  conditions: {
    filePatterns?: string[];
    authorPatterns?: string[];
    branchPatterns?: string[];
    maxRiskScore?: number;
    requireTests?: boolean;
    blockPatterns?: string[];
  };
  actions: {
    autoApprove: boolean;
    autoMerge: boolean;
    requireReviews?: number;
    notify: boolean;
  };
}

export interface PullRequest {
  id: string;
  githubId: string;
  number: number;
  title: string;
  body?: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  riskScore?: number;
  aiAnalysis?: {
    summary: string;
    concerns: string[];
    recommendations: string[];
    categories: {
      security: number;
      breaking: number;
      complexity: number;
      testing: number;
      documentation: number;
    };
  };
}

// Analytics types
export interface AnalyticsEvent {
  id: string;
  timestamp: Date;
  eventType: AnalyticsEventType;
  organizationId: string;
  userId?: string;
  repositoryId?: string;
  pullRequestId?: string;
  properties: Record<string, any>;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
    version?: string;
  };
}

export enum AnalyticsEventType {
  // Installation and setup events
  APP_INSTALLED = 'app.installed',
  APP_UNINSTALLED = 'app.uninstalled',
  REPOSITORY_ADDED = 'repository.added',
  REPOSITORY_REMOVED = 'repository.removed',
  
  // User onboarding events
  USER_ONBOARDED = 'user.onboarded',
  ONBOARDING_STEP_COMPLETED = 'onboarding.step_completed',
  FIRST_RULE_CREATED = 'onboarding.first_rule_created',
  CONFIGURATION_COMPLETED = 'onboarding.configuration_completed',
  
  // Pull request automation events
  PULL_REQUEST_CREATED = 'pull_request.created',
  PULL_REQUEST_ANALYZED = 'pull_request.analyzed',
  PULL_REQUEST_AUTO_APPROVED = 'pull_request.auto_approved',
  PULL_REQUEST_AUTO_MERGED = 'pull_request.auto_merged',
  PULL_REQUEST_MANUAL_REVIEW = 'pull_request.manual_review',
  PULL_REQUEST_RISK_DETECTED = 'pull_request.risk_detected',
  
  // Rule and configuration events
  RULE_CREATED = 'rule.created',
  RULE_UPDATED = 'rule.updated',
  RULE_DELETED = 'rule.deleted',
  RULE_TRIGGERED = 'rule.triggered',
  CONFIGURATION_UPDATED = 'configuration.updated',
  
  // Billing and subscription events
  SUBSCRIPTION_CREATED = 'billing.subscription_created',
  SUBSCRIPTION_UPDATED = 'billing.subscription_updated',
  SUBSCRIPTION_CANCELLED = 'billing.subscription_cancelled',
  PLAN_UPGRADED = 'billing.plan_upgraded',
  PLAN_DOWNGRADED = 'billing.plan_downgraded',
  USAGE_LIMIT_REACHED = 'billing.usage_limit_reached',
  
  // Feature usage events
  DASHBOARD_VIEWED = 'feature.dashboard_viewed',
  AI_ANALYSIS_REQUESTED = 'feature.ai_analysis_requested',
  NOTIFICATION_SENT = 'feature.notification_sent',
  INTEGRATION_CONFIGURED = 'feature.integration_configured',
  
  // Error and performance events
  ERROR_OCCURRED = 'system.error_occurred',
  API_REQUEST_COMPLETED = 'system.api_request_completed',
  WEBHOOK_PROCESSED = 'system.webhook_processed',
  
  // User engagement events
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  SESSION_STARTED = 'user.session_started',
  SESSION_ENDED = 'user.session_ended'
}

export interface AnalyticsMetrics {
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

export interface AnomalyAlert {
  id: string;
  timestamp: Date;
  metricName: string;
  currentValue: number;
  expectedValue: number;
  threshold: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  organizationId?: string;
}

export interface DashboardData {
  metrics: AnalyticsMetrics;
  charts: {
    userGrowth: ChartData[];
    revenue: ChartData[];
    featureUsage: ChartData[];
    pullRequestStats: ChartData[];
  };
  alerts: AnomalyAlert[];
}

export interface ChartData {
  date: string;
  value: number;
  category?: string;
}

export interface ReportConfig {
  id: string;
  name: string;
  description?: string;
  schedule: string; // cron expression
  recipients: string[];
  includeMetrics: string[];
  format: 'PDF' | 'CSV' | 'JSON';
  template: string;
}