import { PrismaClient } from '@prisma/client';
import { Queue, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config';
import { AnalyticsService } from './analytics';
import { NotificationService } from './notification';
import { AnalyticsMetrics, ChartData, ReportConfig } from '../types/index';

export interface ReportData {
  title: string;
  organizationName: string;
  reportPeriod: {
    start: string;
    end: string;
  };
  metrics: AnalyticsMetrics;
  charts: {
    userGrowth: ChartData[];
    revenue: ChartData[];
    featureUsage: ChartData[];
    pullRequestStats: ChartData[];
  };
  insights: {
    keyFindings: string[];
    recommendations: string[];
    alerts: string[];
  };
  generatedAt: string;
}

export class ReportingService {
  private prisma: PrismaClient;
  private redis: Redis;
  private analyticsService: AnalyticsService;
  private notificationService: NotificationService;
  private reportQueue: Queue;

  constructor(
    prisma: PrismaClient, 
    redis: Redis, 
    analyticsService: AnalyticsService,
    notificationService: NotificationService
  ) {
    this.prisma = prisma;
    this.redis = redis;
    this.analyticsService = analyticsService;
    this.notificationService = notificationService;
    this.reportQueue = new Queue('reports', { 
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 20
      }
    });
  }

  /**
   * Generate a comprehensive analytics report
   */
  async generateReport(
    organizationId: string, 
    reportType: 'weekly' | 'monthly' | 'quarterly',
    format: 'HTML' | 'PDF' | 'JSON' = 'HTML'
  ): Promise<string> {
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId }
      });

      if (!organization) {
        throw new Error(`Organization ${organizationId} not found`);
      }

      const { startDate, endDate } = this.getReportPeriod(reportType);
      const dashboardData = await this.analyticsService.getDashboardData(organizationId, 
        Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      const reportData: ReportData = {
        title: `${this.capitalizeFirst(reportType)} Analytics Report`,
        organizationName: organization.name || organization.login,
        reportPeriod: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        metrics: dashboardData.metrics,
        charts: dashboardData.charts,
        insights: await this.generateInsights(dashboardData.metrics, dashboardData.charts),
        generatedAt: new Date().toISOString()
      };

      switch (format) {
        case 'JSON':
          return JSON.stringify(reportData, null, 2);
        case 'HTML':
          return this.generateHTMLReport(reportData);
        case 'PDF':
          const htmlContent = this.generateHTMLReport(reportData);
          return await this.convertToPDF(htmlContent);
        default:
          return this.generateHTMLReport(reportData);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic report generation
   */
  async scheduleReport(config: ReportConfig): Promise<void> {
    await this.reportQueue.add(
      'scheduledReport',
      {
        reportConfig: config,
        scheduledAt: new Date().toISOString()
      },
      {
        repeat: { pattern: config.schedule },
        attempts: 3
      }
    );
  }

  /**
   * Generate insights from metrics and chart data
   */
  private async generateInsights(
    metrics: AnalyticsMetrics, 
    charts: { userGrowth: ChartData[]; revenue: ChartData[]; featureUsage: ChartData[]; pullRequestStats: ChartData[]; }
  ): Promise<{ keyFindings: string[]; recommendations: string[]; alerts: string[]; }> {
    const keyFindings: string[] = [];
    const recommendations: string[] = [];
    const alerts: string[] = [];

    // Analyze user growth
    if (metrics.newUsers > 0) {
      const growthRate = (metrics.newUsers / metrics.totalUsers) * 100;
      keyFindings.push(`User base grew by ${growthRate.toFixed(1)}% with ${metrics.newUsers} new users`);
      
      if (growthRate > 20) {
        keyFindings.push('Experiencing strong user growth this period');
      } else if (growthRate < 5) {
        recommendations.push('Consider implementing user acquisition campaigns to boost growth');
      }
    }

    // Analyze engagement
    const engagementRate = (metrics.activeUsers / metrics.totalUsers) * 100;
    keyFindings.push(`User engagement rate: ${engagementRate.toFixed(1)}%`);
    
    if (engagementRate < 30) {
      alerts.push('Low user engagement detected - users may need more onboarding or feature education');
      recommendations.push('Implement user engagement campaigns and improve onboarding flow');
    }

    // Analyze automation effectiveness
    if (metrics.totalPullRequests > 0) {
      const automationRate = (metrics.autoMergedPullRequests / metrics.totalPullRequests) * 100;
      keyFindings.push(`${automationRate.toFixed(1)}% of pull requests were automatically merged`);
      
      if (automationRate < 40) {
        recommendations.push('Review automation rules to increase safe auto-merge rate');
      } else if (automationRate > 80) {
        keyFindings.push('High automation rate indicates excellent rule configuration');
      }
    }

    // Analyze AI usage
    if (metrics.aiAnalysisRequests > 0) {
      const aiUsageRate = (metrics.aiAnalysisRequests / metrics.totalPullRequests) * 100;
      keyFindings.push(`AI analysis used on ${aiUsageRate.toFixed(1)}% of pull requests`);
      
      if (metrics.averageRiskScore > 0.7) {
        alerts.push('High average risk score detected - review code quality practices');
      }
    }

    // Analyze revenue metrics
    if (metrics.monthlyRecurringRevenue > 0) {
      keyFindings.push(`Monthly recurring revenue: $${metrics.monthlyRecurringRevenue.toLocaleString()}`);
      
      if (metrics.churnRate > 0.1) {
        alerts.push(`High churn rate of ${(metrics.churnRate * 100).toFixed(1)}% detected`);
        recommendations.push('Implement customer retention strategies and analyze churn reasons');
      }
      
      if (metrics.conversionRate < 0.1) {
        recommendations.push('Focus on improving trial-to-paid conversion through better onboarding');
      }
    }

    // Performance analysis
    if (metrics.errorRate > 0.02) {
      alerts.push(`Error rate of ${(metrics.errorRate * 100).toFixed(2)}% exceeds recommended threshold`);
      recommendations.push('Investigate and resolve system errors to improve user experience');
    }

    if (metrics.averageResponseTime > 3000) {
      alerts.push(`Average response time of ${metrics.averageResponseTime}ms is higher than optimal`);
      recommendations.push('Optimize system performance to improve response times');
    }

    return {
      keyFindings,
      recommendations,
      alerts
    };
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(data: ReportData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title} - ${data.organizationName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
            color: #334155;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5rem;
            font-weight: 700;
        }
        .header p {
            margin: 0;
            opacity: 0.9;
            font-size: 1.1rem;
        }
        .content {
            padding: 30px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .metric-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
        }
        .metric-label {
            font-size: 0.9rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            font-size: 1.5rem;
            margin-bottom: 20px;
            color: #1e293b;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
        }
        .insights {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .insight-card {
            border-left: 4px solid #10b981;
            background: #f0fdf4;
            padding: 20px;
            border-radius: 0 8px 8px 0;
        }
        .insight-card.recommendations {
            border-left-color: #3b82f6;
            background: #eff6ff;
        }
        .insight-card.alerts {
            border-left-color: #ef4444;
            background: #fef2f2;
        }
        .insight-card h3 {
            margin: 0 0 15px 0;
            font-size: 1.1rem;
            color: #1e293b;
        }
        .insight-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .insight-list li {
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
        }
        .insight-list li::before {
            content: "•";
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: bold;
        }
        .insight-card.recommendations .insight-list li::before {
            color: #3b82f6;
        }
        .insight-card.alerts .insight-list li::before {
            color: #ef4444;
        }
        .footer {
            background: #f8fafc;
            padding: 20px 30px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 0.9rem;
        }
        .period-badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${data.title}</h1>
            <p>${data.organizationName}</p>
            <div class="period-badge">
                ${data.reportPeriod.start} to ${data.reportPeriod.end}
            </div>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>Key Metrics</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${data.metrics.totalUsers.toLocaleString()}</div>
                        <div class="metric-label">Total Users</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.metrics.activeUsers.toLocaleString()}</div>
                        <div class="metric-label">Active Users</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.metrics.newUsers.toLocaleString()}</div>
                        <div class="metric-label">New Users</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.metrics.totalPullRequests.toLocaleString()}</div>
                        <div class="metric-label">Pull Requests</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.metrics.autoMergedPullRequests.toLocaleString()}</div>
                        <div class="metric-label">Auto-Merged PRs</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.metrics.aiAnalysisRequests.toLocaleString()}</div>
                        <div class="metric-label">AI Analysis Requests</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">$${data.metrics.monthlyRecurringRevenue.toLocaleString()}</div>
                        <div class="metric-label">Monthly Revenue</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${(data.metrics.churnRate * 100).toFixed(1)}%</div>
                        <div class="metric-label">Churn Rate</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Insights & Recommendations</h2>
                <div class="insights">
                    <div class="insight-card">
                        <h3>Key Findings</h3>
                        <ul class="insight-list">
                            ${data.insights.keyFindings.map(finding => `<li>${finding}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="insight-card recommendations">
                        <h3>Recommendations</h3>
                        <ul class="insight-list">
                            ${data.insights.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                    ${data.insights.alerts.length > 0 ? `
                    <div class="insight-card alerts">
                        <h3>Alerts</h3>
                        <ul class="insight-list">
                            ${data.insights.alerts.map(alert => `<li>${alert}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <div class="footer">
            Generated on ${new Date(data.generatedAt).toLocaleDateString()} at ${new Date(data.generatedAt).toLocaleTimeString()}
            <br>
            AutoMerge Pro Analytics Report
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Convert HTML to PDF (simplified implementation)
   */
  private async convertToPDF(htmlContent: string): Promise<string> {
    // In a production environment, you would use a proper HTML to PDF converter
    // like puppeteer, html-pdf, or a service like Prince XML
    // For now, we'll return the HTML content as a fallback
    console.warn('PDF conversion not implemented - returning HTML content');
    return htmlContent;
  }

  /**
   * Email report to recipients
   */
  async emailReport(
    organizationId: string, 
    reportContent: string, 
    recipients: string[], 
    reportType: string
  ): Promise<void> {
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId }
      });

      if (!organization) {
        throw new Error(`Organization ${organizationId} not found`);
      }

      const subject = `${this.capitalizeFirst(reportType)} Analytics Report - ${organization.name || organization.login}`;
      
      for (const recipient of recipients) {
        await this.notificationService.sendEmail({
          to: recipient,
          subject,
          html: reportContent,
          text: `Your ${reportType} analytics report is ready. Please view the HTML version for full details.`
        });
      }
    } catch (error) {
      console.error('Failed to email report:', error);
      throw error;
    }
  }

  /**
   * Get report period dates based on report type
   */
  private getReportPeriod(reportType: 'weekly' | 'monthly' | 'quarterly'): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (reportType) {
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarterly':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Capitalize first letter of a string
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get available report templates
   */
  getReportTemplates(): { id: string; name: string; description: string }[] {
    return [
      {
        id: 'standard',
        name: 'Standard Analytics Report',
        description: 'Comprehensive overview of key metrics and insights'
      },
      {
        id: 'executive',
        name: 'Executive Summary',
        description: 'High-level summary for stakeholders and executives'
      },
      {
        id: 'technical',
        name: 'Technical Performance Report',
        description: 'Detailed technical metrics and system performance'
      },
      {
        id: 'growth',
        name: 'Growth Analysis',
        description: 'Focus on user growth, engagement, and conversion metrics'
      }
    ];
  }

  /**
   * Process scheduled report generation
   */
  async processScheduledReport(job: Job): Promise<void> {
    const { reportConfig } = job.data;
    
    try {
      // Get all organizations that should receive this report
      const organizations = await this.prisma.organization.findMany({
        where: { plan: { not: 'FREE' } }
      });

      for (const org of organizations) {
        const reportContent = await this.generateReport(org.id, 'weekly', 'HTML');
        
        if (reportConfig.recipients.length > 0) {
          await this.emailReport(org.id, reportContent, reportConfig.recipients, 'weekly');
        }
      }
    } catch (error) {
      console.error('Failed to process scheduled report:', error);
      throw error;
    }
  }
}