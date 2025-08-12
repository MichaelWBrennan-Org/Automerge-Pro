import { Worker, Job, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { config } from '../config.js';
import { DataPipelineService } from '../services/data-pipeline.js';
import { NotificationService } from '../services/notification.js';
import { ReportingService } from '../services/reporting.js';
import { AnalyticsService } from '../services/analytics.js';
import { AnalyticsEvent, AnomalyAlert } from '../types/index.js';

export class AnalyticsWorker {
  private analyticsWorker: Worker;
  private reportWorker: Worker;
  private analyticsQueue: Queue;
  private reportQueue: Queue;
  private dataPipelineService: DataPipelineService;
  private notificationService: NotificationService;
  private reportingService: ReportingService;
  private analyticsService: AnalyticsService;
  private prisma: PrismaClient;

  constructor(
    redis: Redis,
    prisma: PrismaClient,
    dataPipelineService: DataPipelineService,
    notificationService: NotificationService,
    reportingService: ReportingService,
    analyticsService: AnalyticsService
  ) {
    this.prisma = prisma;
    this.dataPipelineService = dataPipelineService;
    this.notificationService = notificationService;
    this.reportingService = reportingService;
    this.analyticsService = analyticsService;

    // Create queues
    this.analyticsQueue = new Queue('analytics', { connection: redis });
    this.reportQueue = new Queue('reports', { connection: redis });

    // Analytics events worker
    this.analyticsWorker = new Worker('analytics', this.processAnalyticsJob.bind(this), {
      connection: redis,
      concurrency: 5
    });

    // Reports worker
    this.reportWorker = new Worker('reports', this.processReportJob.bind(this), {
      connection: redis,
      concurrency: 2
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.analyticsWorker.on('completed', (job) => {
      console.log(`Analytics job ${job.id} completed`);
    });

    this.analyticsWorker.on('failed', (job, err) => {
      console.error(`Analytics job ${job?.id} failed:`, err);
    });

    this.reportWorker.on('completed', (job) => {
      console.log(`Report job ${job.id} completed`);
    });

    this.reportWorker.on('failed', (job, err) => {
      console.error(`Report job ${job?.id} failed:`, err);
    });
  }

  private async processAnalyticsJob(job: Job): Promise<void> {
    const { name, data } = job;

    try {
      switch (name) {
        case 'processEvent':
          await this.processEvent(data as AnalyticsEvent);
          break;
        case 'processAlerts':
          await this.processAlerts(data as AnomalyAlert[]);
          break;
        case 'detectAnomalies':
          await this.runAnomalyDetection();
          break;
        case 'cleanupOldEvents':
          await this.cleanupOldEvents();
          break;
        default:
          console.warn(`Unknown analytics job type: ${name}`);
      }
    } catch (error) {
      console.error(`Failed to process analytics job ${name}:`, error);
      throw error;
    }
  }

  private async processReportJob(job: Job): Promise<void> {
    const { name, data } = job;

    try {
      switch (name) {
        case 'generateReport':
          await this.generateReport(data);
          break;
        case 'scheduledReport':
          await this.reportingService.processScheduledReport(job);
          break;
        case 'emailReport':
          await this.emailReport(data);
          break;
        default:
          console.warn(`Unknown report job type: ${name}`);
      }
    } catch (error) {
      console.error(`Failed to process report job ${name}:`, error);
      throw error;
    }
  }

  /**
   * Process individual analytics event
   */
  private async processEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Send to external data pipeline
      await this.dataPipelineService.sendEvent(event);

      // Mark as processed in local storage
      await this.prisma.webhookEvent.updateMany({
        where: { githubId: event.id },
        data: { processed: true, processedAt: new Date() }
      });

      console.log(`Processed analytics event: ${event.eventType} for org ${event.organizationId}`);
    } catch (error) {
      console.error('Failed to process analytics event:', error);
      throw error;
    }
  }

  /**
   * Process anomaly alerts
   */
  private async processAlerts(alerts: AnomalyAlert[]): Promise<void> {
    for (const alert of alerts) {
      try {
        // Send alert to data pipeline
        await this.dataPipelineService.sendAlert(alert);

        // Send notification based on severity
        await this.sendAlertNotification(alert);

        console.log(`Processed anomaly alert: ${alert.metricName} (${alert.severity})`);
      } catch (error) {
        console.error('Failed to process alert:', error);
        // Continue processing other alerts
      }
    }
  }

  /**
   * Send alert notification via configured channels
   */
  private async sendAlertNotification(alert: AnomalyAlert): Promise<void> {
    try {
      const severity = alert.severity.toLowerCase();
      const emoji = {
        low: '🟡',
        medium: '🟠',
        high: '🔴',
        critical: '🚨'
      }[severity] || '⚠️';

      // Get organization details for notification
      let orgName = 'Unknown Organization';
      if (alert.organizationId) {
        const org = await this.prisma.organization.findUnique({
          where: { id: alert.organizationId }
        });
        orgName = org?.name || org?.login || 'Unknown Organization';
      }

      const message = `${emoji} **Analytics Alert - ${alert.severity}**\n\n` +
                     `**Organization:** ${orgName}\n` +
                     `**Metric:** ${alert.metricName}\n` +
                     `**Current Value:** ${alert.currentValue}\n` +
                     `**Threshold:** ${alert.threshold}\n` +
                     `**Description:** ${alert.description}\n\n` +
                     `**Time:** ${alert.timestamp.toISOString()}`;

      // Send Slack notification if severity is medium or higher
      if (['MEDIUM', 'HIGH', 'CRITICAL'].includes(alert.severity)) {
        try {
          await this.notificationService.sendSlackMessage({
            message,
            channel: '#alerts',
            organizationId: alert.organizationId
          });
        } catch (error) {
          console.error('Failed to send Slack alert:', error);
        }
      }

      // Send email notification if severity is high or critical
      if (['HIGH', 'CRITICAL'].includes(alert.severity)) {
        try {
          const recipients = config.analytics.reporting.recipients;
          if (recipients.length > 0) {
            await this.notificationService.sendEmail({
              to: recipients[0], // Send to primary recipient
              subject: `${emoji} Analytics Alert: ${alert.metricName} - ${alert.severity}`,
              text: message,
              html: `<pre style="font-family: monospace; white-space: pre-wrap;">${message}</pre>`
            });
          }
        } catch (error) {
          console.error('Failed to send email alert:', error);
        }
      }
    } catch (error) {
      console.error('Failed to send alert notification:', error);
      throw error;
    }
  }

  /**
   * Run scheduled anomaly detection
   */
  private async runAnomalyDetection(): Promise<void> {
    try {
      console.log('Running anomaly detection...');
      const alerts = await this.analyticsService.detectAnomalies();
      console.log(`Detected ${alerts.length} anomalies`);

      if (alerts.length > 0) {
        await this.processAlerts(alerts);
      }
    } catch (error) {
      console.error('Failed to run anomaly detection:', error);
      throw error;
    }
  }

  /**
   * Generate report
   */
  private async generateReport(data: {
    organizationId: string;
    reportType: 'weekly' | 'monthly' | 'quarterly';
    recipients?: string[];
  }): Promise<void> {
    try {
      const { organizationId, reportType, recipients = [] } = data;
      
      console.log(`Generating ${reportType} report for organization ${organizationId}`);
      
      const reportContent = await this.reportingService.generateReport(
        organizationId,
        reportType,
        'HTML'
      );

      if (recipients.length > 0) {
        await this.reportingService.emailReport(
          organizationId,
          reportContent,
          recipients,
          reportType
        );
        console.log(`Report emailed to ${recipients.length} recipients`);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }

  /**
   * Email report to recipients
   */
  private async emailReport(data: {
    organizationId: string;
    reportContent: string;
    recipients: string[];
    reportType: string;
  }): Promise<void> {
    try {
      const { organizationId, reportContent, recipients, reportType } = data;
      
      await this.reportingService.emailReport(
        organizationId,
        reportContent,
        recipients,
        reportType
      );
      
      console.log(`Report emailed successfully to ${recipients.length} recipients`);
    } catch (error) {
      console.error('Failed to email report:', error);
      throw error;
    }
  }

  /**
   * Clean up old analytics events to manage storage
   */
  private async cleanupOldEvents(): Promise<void> {
    try {
      // Keep events for 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const deletedCount = await this.prisma.webhookEvent.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          processed: true,
          // Only clean up analytics events (not actual webhook events)
          event: { startsWith: 'analytics.' }
        }
      });

      console.log(`Cleaned up ${deletedCount.count} old analytics events`);
    } catch (error) {
      console.error('Failed to cleanup old events:', error);
      throw error;
    }
  }

  /**
   * Schedule recurring jobs
   */
  async scheduleRecurringJobs(): Promise<void> {
    // Schedule anomaly detection every 15 minutes
    await this.analyticsQueue.add(
      'detectAnomalies',
      {},
      {
        repeat: { pattern: '*/15 * * * *' }, // Every 15 minutes
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      }
    );

    // Schedule report generation based on config
    if (config.analytics.reporting.enabled) {
      await this.reportQueue.add(
        'scheduledReport',
        {
          reportConfig: {
            schedule: config.analytics.reporting.schedule,
            recipients: config.analytics.reporting.recipients
          }
        },
        {
          repeat: { pattern: config.analytics.reporting.schedule },
          attempts: 2
        }
      );
    }

    // Schedule cleanup job weekly
    await this.analyticsQueue.add(
      'cleanupOldEvents',
      {},
      {
        repeat: { pattern: '0 2 * * 0' }, // Every Sunday at 2 AM
        attempts: 1
      }
    );

    console.log('Scheduled recurring analytics jobs');
  }

  /**
   * Shutdown workers gracefully
   */
  async shutdown(): Promise<void> {
    await this.analyticsWorker.close();
    await this.reportWorker.close();
    console.log('Analytics workers shut down gracefully');
  }
}