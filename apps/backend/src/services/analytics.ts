import { PrismaClient } from '@prisma/client';
import { Queue, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config.js';
import { 
  AnalyticsEvent, 
  AnalyticsEventType, 
  AnalyticsMetrics, 
  AnomalyAlert, 
  DashboardData,
  ChartData
} from '../types/index.js';

export class AnalyticsService {
  private prisma: PrismaClient;
  private redis: Redis;
  private analyticsQueue: Queue;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
    this.analyticsQueue = new Queue('analytics', { 
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50
      }
    });
  }

  /**
   * Track an analytics event
   */
  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      const analyticsEvent: AnalyticsEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        ...event
      };

      // Store locally for immediate queries
      await this.storeEventLocally(analyticsEvent);

      // Queue for external processing if enabled
      if (config.analytics.enabled) {
        await this.analyticsQueue.add('processEvent', analyticsEvent, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        });
      }
    } catch (error) {
      console.error('Failed to track analytics event:', error);
      // Don't throw - analytics failures shouldn't break app functionality
    }
  }

  /**
   * Store event in local database
   */
  private async storeEventLocally(event: AnalyticsEvent): Promise<void> {
    try {
      // For now, we'll store in a simple JSON format in the webhook_events table
      // In production, you'd want a dedicated analytics_events table
      await this.prisma.webhookEvent.create({
        data: {
          githubId: event.id,
          event: event.eventType,
          payload: {
            organizationId: event.organizationId,
            userId: event.userId,
            repositoryId: event.repositoryId,
            pullRequestId: event.pullRequestId,
            properties: event.properties,
            metadata: event.metadata,
            timestamp: event.timestamp.toISOString()
          },
          processed: false
        }
      });
    } catch (error) {
      console.error('Failed to store event locally:', error);
    }
  }

  /**
   * Get analytics metrics for a time period
   */
  async getMetrics(organizationId: string, startDate: Date, endDate: Date): Promise<AnalyticsMetrics> {
    try {
      const [
        userStats,
        prStats,
        billingStats
      ] = await Promise.all([
        this.getUserMetrics(organizationId, startDate, endDate),
        this.getPullRequestMetrics(organizationId, startDate, endDate),
        this.getBillingMetrics(organizationId, startDate, endDate)
      ]);

      return {
        ...userStats,
        ...prStats,
        ...billingStats,
        periodStart: startDate,
        periodEnd: endDate
      };
    } catch (error) {
      console.error('Failed to get analytics metrics:', error);
      throw error;
    }
  }

  /**
   * Get user growth and engagement metrics
   */
  private async getUserMetrics(organizationId: string, startDate: Date, endDate: Date) {
    const totalUsers = await this.prisma.organizationUser.count({
      where: { organizationId }
    });

    const newUsers = await this.prisma.organizationUser.count({
      where: {
        organizationId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Get active users from webhook events (simplified)
    const activeUsersResult = await this.prisma.webhookEvent.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        event: 'user.login'
      },
      select: {
        payload: true
      }
    });

    const activeUsers = new Set(
      activeUsersResult
        .map((event: any) => (event.payload as any)?.userId)
        .filter(Boolean)
    ).size;

    return {
      totalUsers,
      activeUsers,
      newUsers
    };
  }

  /**
   * Get pull request automation metrics
   */
  private async getPullRequestMetrics(organizationId: string, startDate: Date, endDate: Date) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        installations: {
          include: {
            repositories: {
              include: {
                pullRequests: {
                  where: {
                    createdAt: {
                      gte: startDate,
                      lte: endDate
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!org) {
      return {
        totalPullRequests: 0,
        autoMergedPullRequests: 0,
        aiAnalysisRequests: 0,
        averageRiskScore: 0,
        averageResponseTime: 1000,
        errorRate: 0.01,
        uptime: 99.9
      };
    }

    const allPullRequests = org.installations.flatMap(
      (inst: any) => inst.repositories.flatMap((repo: any) => repo.pullRequests)
    );

    const totalPullRequests = allPullRequests.length;
    const autoMergedPullRequests = allPullRequests.filter((pr: any) => pr.state === 'MERGED').length;
    const aiAnalysisRequests = allPullRequests.filter((pr: any) => pr.aiAnalysis !== null).length;
    const averageRiskScore = allPullRequests
      .filter((pr: any) => pr.riskScore !== null)
      .reduce((sum: number, pr: any) => sum + (pr.riskScore || 0), 0) / (allPullRequests.length || 1);

    return {
      totalPullRequests,
      autoMergedPullRequests,
      aiAnalysisRequests,
      averageRiskScore,
      averageResponseTime: 1000, // TODO: Calculate from actual request times
      errorRate: 0.01, // TODO: Calculate from error events
      uptime: 99.9 // TODO: Calculate from monitoring data
    };
  }

  /**
   * Get billing and revenue metrics
   */
  private async getBillingMetrics(organizationId: string, startDate: Date, endDate: Date) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!org) {
      return {
        monthlyRecurringRevenue: 0,
        averageRevenuePerUser: 0,
        churnRate: 0,
        conversionRate: 0
      };
    }

    // Simplified billing metrics - in production you'd integrate with actual billing data
    const planRevenue: Record<string, number> = {
      'FREE': 0,
      'TEAM': 99,
      'GROWTH': 299,
      'ENTERPRISE': 999
    };

    return {
      monthlyRecurringRevenue: planRevenue[org.plan as keyof typeof planRevenue] || 0,
      averageRevenuePerUser: planRevenue[org.plan as keyof typeof planRevenue] || 0,
      churnRate: 0.05, // TODO: Calculate from actual churn data
      conversionRate: 0.12 // TODO: Calculate from actual conversion data
    };
  }

  /**
   * Get dashboard data with charts and metrics
   */
  async getDashboardData(organizationId: string, days: number = 30): Promise<DashboardData> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await this.getMetrics(organizationId, startDate, endDate);
    const charts = await this.getChartData(organizationId, startDate, endDate);
    const alerts = await this.getActiveAlerts(organizationId);

    return {
      metrics,
      charts,
      alerts
    };
  }

  /**
   * Get chart data for visualizations
   */
  private async getChartData(organizationId: string, startDate: Date, endDate: Date) {
    // Generate daily data points for the date range
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const chartData = {
      userGrowth: [] as ChartData[],
      revenue: [] as ChartData[],
      featureUsage: [] as ChartData[],
      pullRequestStats: [] as ChartData[]
    };

    // Generate sample chart data (in production, this would query actual data)
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      chartData.userGrowth.push({
        date: dateStr,
        value: Math.floor(Math.random() * 10) + i * 2
      });

      chartData.revenue.push({
        date: dateStr,
        value: Math.floor(Math.random() * 1000) + 500
      });

      chartData.featureUsage.push({
        date: dateStr,
        value: Math.floor(Math.random() * 50) + 20,
        category: 'AI Analysis'
      });

      chartData.pullRequestStats.push({
        date: dateStr,
        value: Math.floor(Math.random() * 20) + 5
      });
    }

    return chartData;
  }

  /**
   * Get active anomaly alerts
   */
  private async getActiveAlerts(organizationId: string): Promise<AnomalyAlert[]> {
    // This would integrate with your anomaly detection system
    // For now, return empty array
    return [];
  }

  /**
   * Detect anomalies in metrics
   */
  async detectAnomalies(): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];
    
    if (!config.analytics.anomalyDetection.enabled) {
      return alerts;
    }

    // Get recent metrics for all organizations
    const organizations = await this.prisma.organization.findMany({
      where: { plan: { not: 'FREE' } } // Only monitor paid plans
    });

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (const org of organizations) {
      try {
        const metrics = await this.getMetrics(org.id, hourAgo, now);
        
        // Check error rate threshold
        if (metrics.errorRate > config.analytics.anomalyDetection.alertThresholds.errorRate) {
          alerts.push({
            id: `alert_${Date.now()}_${org.id}`,
            timestamp: now,
            metricName: 'error_rate',
            currentValue: metrics.errorRate,
            expectedValue: 0.01,
            threshold: config.analytics.anomalyDetection.alertThresholds.errorRate,
            severity: 'HIGH',
            description: `Error rate of ${(metrics.errorRate * 100).toFixed(2)}% exceeds threshold of ${(config.analytics.anomalyDetection.alertThresholds.errorRate * 100).toFixed(2)}%`,
            organizationId: org.id
          });
        }

        // Check response time threshold
        if (metrics.averageResponseTime > config.analytics.anomalyDetection.alertThresholds.responseTime) {
          alerts.push({
            id: `alert_${Date.now()}_${org.id}`,
            timestamp: now,
            metricName: 'response_time',
            currentValue: metrics.averageResponseTime,
            expectedValue: 1000,
            threshold: config.analytics.anomalyDetection.alertThresholds.responseTime,
            severity: 'MEDIUM',
            description: `Average response time of ${metrics.averageResponseTime}ms exceeds threshold of ${config.analytics.anomalyDetection.alertThresholds.responseTime}ms`,
            organizationId: org.id
          });
        }
      } catch (error) {
        console.error(`Failed to check metrics for organization ${org.id}:`, error);
      }
    }

    // Send alerts if any found
    if (alerts.length > 0) {
      await this.analyticsQueue.add('processAlerts', alerts, {
        attempts: 3
      });
    }

    return alerts;
  }

  /**
   * Generate and send scheduled reports
   */
  async generateScheduledReports(): Promise<void> {
    if (!config.analytics.reporting.enabled) {
      return;
    }

    const organizations = await this.prisma.organization.findMany({
      where: { plan: { not: 'FREE' } }
    });

    for (const org of organizations) {
      try {
        await this.analyticsQueue.add('generateReport', {
          organizationId: org.id,
          reportType: 'weekly',
          recipients: config.analytics.reporting.recipients
        }, {
          attempts: 2
        });
      } catch (error) {
        console.error(`Failed to queue report for organization ${org.id}:`, error);
      }
    }
  }

  /**
   * Export analytics data
   */
  async exportData(organizationId: string, format: 'JSON' | 'CSV', startDate: Date, endDate: Date): Promise<string> {
    const metrics = await this.getMetrics(organizationId, startDate, endDate);
    const chartData = await this.getChartData(organizationId, startDate, endDate);

    const exportData = {
      metrics,
      charts: chartData,
      exportedAt: new Date().toISOString(),
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    };

    if (format === 'JSON') {
      return JSON.stringify(exportData, null, 2);
    } else {
      // Convert to CSV format (simplified)
      const csvRows = [
        ['Metric', 'Value'],
        ['Total Users', metrics.totalUsers.toString()],
        ['Active Users', metrics.activeUsers.toString()],
        ['New Users', metrics.newUsers.toString()],
        ['Total Pull Requests', metrics.totalPullRequests.toString()],
        ['Auto Merged PRs', metrics.autoMergedPullRequests.toString()],
        ['AI Analysis Requests', metrics.aiAnalysisRequests.toString()],
        ['Average Risk Score', metrics.averageRiskScore.toString()],
        ['Monthly Recurring Revenue', metrics.monthlyRecurringRevenue.toString()],
        ['Churn Rate', (metrics.churnRate * 100).toFixed(2) + '%'],
        ['Conversion Rate', (metrics.conversionRate * 100).toFixed(2) + '%']
      ];

      return csvRows.map(row => row.join(',')).join('\n');
    }
  }
}