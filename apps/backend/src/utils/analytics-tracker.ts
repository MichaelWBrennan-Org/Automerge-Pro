import { AnalyticsService } from '../services/analytics.js';
import { AnalyticsEventType } from '../types/index.js';

/**
 * Analytics tracking helper - use this to easily add event tracking throughout the application
 */
export class AnalyticsTracker {
  private analyticsService: AnalyticsService;

  constructor(analyticsService: AnalyticsService) {
    this.analyticsService = analyticsService;
  }

  /**
   * Track user onboarding events
   */
  async trackUserOnboarding(organizationId: string, userId: string, step: string) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.ONBOARDING_STEP_COMPLETED,
      organizationId,
      userId,
      properties: {
        step,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track app installation
   */
  async trackAppInstallation(organizationId: string, installationId: string, repositoryCount: number) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.APP_INSTALLED,
      organizationId,
      properties: {
        installationId,
        repositoryCount,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track pull request events
   */
  async trackPullRequestCreated(organizationId: string, repositoryId: string, pullRequestId: string, userId: string) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.PULL_REQUEST_CREATED,
      organizationId,
      userId,
      repositoryId,
      pullRequestId,
      properties: {
        timestamp: new Date().toISOString()
      }
    });
  }

  async trackPullRequestAutoMerged(organizationId: string, repositoryId: string, pullRequestId: string, riskScore?: number) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.PULL_REQUEST_AUTO_MERGED,
      organizationId,
      repositoryId,
      pullRequestId,
      properties: {
        riskScore,
        timestamp: new Date().toISOString()
      }
    });
  }

  async trackPullRequestAnalyzed(organizationId: string, repositoryId: string, pullRequestId: string, riskScore: number) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.PULL_REQUEST_ANALYZED,
      organizationId,
      repositoryId,
      pullRequestId,
      properties: {
        riskScore,
        hasAiAnalysis: true,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track rule management events
   */
  async trackRuleCreated(organizationId: string, userId: string, ruleId: string, ruleName: string) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.RULE_CREATED,
      organizationId,
      userId,
      properties: {
        ruleId,
        ruleName,
        timestamp: new Date().toISOString()
      }
    });
  }

  async trackRuleTriggered(organizationId: string, repositoryId: string, pullRequestId: string, ruleId: string) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.RULE_TRIGGERED,
      organizationId,
      repositoryId,
      pullRequestId,
      properties: {
        ruleId,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track billing events
   */
  async trackSubscriptionCreated(organizationId: string, plan: string, subscriptionId: string) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.SUBSCRIPTION_CREATED,
      organizationId,
      properties: {
        plan,
        subscriptionId,
        timestamp: new Date().toISOString()
      }
    });
  }

  async trackPlanUpgraded(organizationId: string, fromPlan: string, toPlan: string, subscriptionId: string) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.PLAN_UPGRADED,
      organizationId,
      properties: {
        fromPlan,
        toPlan,
        subscriptionId,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track feature usage
   */
  async trackDashboardViewed(organizationId: string, userId: string, section?: string) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.DASHBOARD_VIEWED,
      organizationId,
      userId,
      properties: {
        section,
        timestamp: new Date().toISOString()
      }
    });
  }

  async trackAiAnalysisRequested(organizationId: string, repositoryId: string, pullRequestId: string, userId: string) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.AI_ANALYSIS_REQUESTED,
      organizationId,
      userId,
      repositoryId,
      pullRequestId,
      properties: {
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track user session events
   */
  async trackUserLogin(organizationId: string, userId: string, loginMethod: string = 'oauth') {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.USER_LOGIN,
      organizationId,
      userId,
      properties: {
        loginMethod,
        timestamp: new Date().toISOString()
      }
    });
  }

  async trackUserSessionStarted(organizationId: string, userId: string, sessionId: string) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.SESSION_STARTED,
      organizationId,
      userId,
      properties: {
        sessionId,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track API requests for performance monitoring
   */
  async trackApiRequest(method: string, endpoint: string, statusCode: number, responseTime: number, organizationId?: string) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.API_REQUEST_COMPLETED,
      organizationId: organizationId || 'system',
      properties: {
        method,
        endpoint,
        statusCode,
        responseTime,
        isError: statusCode >= 400,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track errors for monitoring
   */
  async trackError(error: Error, context: string, organizationId?: string, userId?: string) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.ERROR_OCCURRED,
      organizationId: organizationId || 'system',
      userId,
      properties: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        context,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track webhook processing
   */
  async trackWebhookProcessed(eventType: string, success: boolean, processingTime: number, organizationId?: string) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.WEBHOOK_PROCESSED,
      organizationId: organizationId || 'system',
      properties: {
        webhookEventType: eventType,
        success,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track notification events
   */
  async trackNotificationSent(organizationId: string, notificationType: string, channel: string, success: boolean) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.NOTIFICATION_SENT,
      organizationId,
      properties: {
        notificationType,
        channel,
        success,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track configuration updates
   */
  async trackConfigurationUpdated(organizationId: string, userId: string, configType: string, changes: Record<string, any>) {
    await this.analyticsService.trackEvent({
      eventType: AnalyticsEventType.CONFIGURATION_UPDATED,
      organizationId,
      userId,
      properties: {
        configType,
        changes,
        changeCount: Object.keys(changes).length,
        timestamp: new Date().toISOString()
      }
    });
  }
}

/**
 * Middleware to automatically track API requests
 */
export function createAnalyticsMiddleware(analyticsTracker: AnalyticsTracker) {
  return async (request: any, reply: any, next: () => void) => {
    const startTime = Date.now();

    reply.addHook('onSend', async () => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Extract organization ID from request if available
      const organizationId = request.params?.organizationId || request.body?.organizationId || request.query?.organizationId;
      
      await analyticsTracker.trackApiRequest(
        request.method,
        request.url,
        reply.statusCode,
        responseTime,
        organizationId
      );
    });

    next();
  };
}