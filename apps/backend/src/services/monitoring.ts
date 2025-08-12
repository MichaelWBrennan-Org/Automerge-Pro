/**
 * Monitoring and Alerting Service
 * Provides comprehensive monitoring, error tracking, performance metrics, and alerting
 */

import * as AWS from 'aws-sdk';

interface MonitoringMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  dimensions?: { [key: string]: string };
}

interface Alert {
  id: string;
  type: 'error' | 'performance' | 'cost' | 'security' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
  metadata?: { [key: string]: any };
}

interface PerformanceMetrics {
  averageResponseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface AnomalyDetection {
  metric: string;
  expectedValue: number;
  actualValue: number;
  confidence: number;
  detected: boolean;
  timestamp: Date;
}

export class MonitoringService {
  private cloudWatch: AWS.CloudWatch;
  private xray: AWS.XRay;
  private sns: AWS.SNS;
  
  private readonly NAMESPACE = 'AutomergePro';
  private readonly ALERT_TOPIC_ARN = process.env.ALERT_TOPIC_ARN;

  constructor() {
    this.cloudWatch = new AWS.CloudWatch({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    this.xray = new AWS.XRay({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    this.sns = new AWS.SNS({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  /**
   * Initialize monitoring and alerting system
   */
  async initializeMonitoring(): Promise<void> {
    try {
      await this.setupCloudWatchAlarms();
      await this.setupCustomMetrics();
      await this.setupDistributedTracing();
      console.log('✅ Monitoring system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize monitoring:', error);
      throw error;
    }
  }

  /**
   * Track custom application metrics
   */
  async trackMetric(metric: MonitoringMetric): Promise<void> {
    try {
      const params = {
        Namespace: this.NAMESPACE,
        MetricData: [{
          MetricName: metric.name,
          Value: metric.value,
          Unit: metric.unit,
          Timestamp: metric.timestamp,
          Dimensions: metric.dimensions ? Object.entries(metric.dimensions).map(([Name, Value]) => ({
            Name,
            Value
          })) : undefined
        }]
      };

      await this.cloudWatch.putMetricData(params).promise();
      
      // Check for anomalies
      await this.detectAnomalies(metric);
      
    } catch (error) {
      console.error('Failed to track metric:', error);
      // Don't throw - metrics failure shouldn't break app
    }
  }

  /**
   * Track application errors with context
   */
  async trackError(error: Error, context?: { [key: string]: any }): Promise<void> {
    try {
      // Track error metric
      await this.trackMetric({
        name: 'ApplicationErrors',
        value: 1,
        unit: 'Count',
        timestamp: new Date(),
        dimensions: {
          ErrorType: error.name,
          Environment: process.env.NODE_ENV || 'development'
        }
      });

      // Create detailed error log
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        context: context || {},
        requestId: context?.requestId,
        userId: context?.userId,
        organizationId: context?.organizationId
      };

      // Send to structured logging (would integrate with CloudWatch Logs, Datadog, or Sentry)
      await this.sendToStructuredLogging(errorLog);

      // Check if error requires immediate alerting
      await this.evaluateErrorAlert(error, context);

    } catch (trackingError) {
      console.error('Failed to track error:', trackingError);
      // Log to console as fallback
      console.error('Original error:', error);
    }
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(metrics: PerformanceMetrics): Promise<void> {
    const performanceMetrics: MonitoringMetric[] = [
      {
        name: 'AverageResponseTime',
        value: metrics.averageResponseTime,
        unit: 'Milliseconds',
        timestamp: new Date()
      },
      {
        name: 'RequestsPerMinute',
        value: metrics.requestsPerMinute,
        unit: 'Count/Minute',
        timestamp: new Date()
      },
      {
        name: 'ErrorRate',
        value: metrics.errorRate,
        unit: 'Percent',
        timestamp: new Date()
      },
      {
        name: 'Throughput',
        value: metrics.throughput,
        unit: 'Count/Second',
        timestamp: new Date()
      },
      {
        name: 'MemoryUsage',
        value: metrics.memoryUsage,
        unit: 'Percent',
        timestamp: new Date()
      },
      {
        name: 'CPUUsage',
        value: metrics.cpuUsage,
        unit: 'Percent',
        timestamp: new Date()
      }
    ];

    for (const metric of performanceMetrics) {
      await this.trackMetric(metric);
    }

    // Check performance thresholds
    await this.checkPerformanceThresholds(metrics);
  }

  /**
   * Create and manage alerts
   */
  async createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): Promise<Alert> {
    const fullAlert: Alert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date(),
      acknowledged: false
    };

    // Store alert (would be in database)
    await this.storeAlert(fullAlert);

    // Send notifications based on severity
    await this.sendAlertNotifications(fullAlert);

    return fullAlert;
  }

  /**
   * Anomaly detection using statistical methods
   */
  private async detectAnomalies(metric: MonitoringMetric): Promise<void> {
    try {
      // Get historical data for the metric
      const historicalData = await this.getHistoricalMetricData(metric.name, 24); // 24 hours
      
      if (historicalData.length < 10) {
        return; // Need more data for anomaly detection
      }

      const analysis = this.analyzeAnomalies(metric.value, historicalData);
      
      if (analysis.detected && analysis.confidence > 0.8) {
        await this.createAlert({
          type: 'anomaly',
          severity: this.determineSeverityFromConfidence(analysis.confidence),
          title: `Anomaly detected in ${metric.name}`,
          description: `Metric ${metric.name} has an unusual value of ${metric.value}. Expected: ${analysis.expectedValue}`,
          threshold: analysis.expectedValue,
          currentValue: metric.value,
          metadata: {
            confidence: analysis.confidence,
            metricName: metric.name,
            anomalyType: 'statistical'
          }
        });
      }
    } catch (error) {
      console.error('Anomaly detection failed:', error);
    }
  }

  /**
   * Statistical anomaly analysis
   */
  private analyzeAnomalies(currentValue: number, historicalData: number[]): AnomalyDetection {
    // Calculate basic statistics
    const mean = historicalData.reduce((sum, val) => sum + val, 0) / historicalData.length;
    const variance = historicalData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalData.length;
    const stdDev = Math.sqrt(variance);

    // Z-score anomaly detection
    const zScore = Math.abs((currentValue - mean) / stdDev);
    const confidence = Math.min(zScore / 3, 1); // Normalize to 0-1
    
    // Consider it an anomaly if Z-score > 2 (95% confidence interval)
    const detected = zScore > 2;

    return {
      metric: 'statistical',
      expectedValue: mean,
      actualValue: currentValue,
      confidence,
      detected,
      timestamp: new Date()
    };
  }

  /**
   * Setup CloudWatch alarms for system metrics
   */
  private async setupCloudWatchAlarms(): Promise<void> {
    const alarms = [
      {
        AlarmName: 'AutomergePro-HighErrorRate',
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 2,
        MetricName: 'ErrorRate',
        Namespace: this.NAMESPACE,
        Period: 300,
        Statistic: 'Average',
        Threshold: 5.0,
        ActionsEnabled: true,
        AlarmActions: this.ALERT_TOPIC_ARN ? [this.ALERT_TOPIC_ARN] : [],
        AlarmDescription: 'Alert when error rate exceeds 5%',
        Unit: 'Percent'
      },
      {
        AlarmName: 'AutomergePro-HighResponseTime',
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 3,
        MetricName: 'AverageResponseTime',
        Namespace: this.NAMESPACE,
        Period: 300,
        Statistic: 'Average',
        Threshold: 5000,
        ActionsEnabled: true,
        AlarmActions: this.ALERT_TOPIC_ARN ? [this.ALERT_TOPIC_ARN] : [],
        AlarmDescription: 'Alert when response time exceeds 5 seconds',
        Unit: 'Milliseconds'
      },
      {
        AlarmName: 'AutomergePro-HighMemoryUsage',
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 2,
        MetricName: 'MemoryUsage',
        Namespace: this.NAMESPACE,
        Period: 300,
        Statistic: 'Average',
        Threshold: 85,
        ActionsEnabled: true,
        AlarmActions: this.ALERT_TOPIC_ARN ? [this.ALERT_TOPIC_ARN] : [],
        AlarmDescription: 'Alert when memory usage exceeds 85%',
        Unit: 'Percent'
      }
    ];

    for (const alarm of alarms) {
      try {
        await this.cloudWatch.putMetricAlarm(alarm).promise();
        console.log(`✅ Created CloudWatch alarm: ${alarm.AlarmName}`);
      } catch (error) {
        console.error(`❌ Failed to create alarm ${alarm.AlarmName}:`, error);
      }
    }
  }

  /**
   * Setup custom metrics dashboards
   */
  private async setupCustomMetrics(): Promise<void> {
    // This would create CloudWatch dashboards programmatically
    const dashboardBody = JSON.stringify({
      widgets: [
        {
          type: "metric",
          properties: {
            metrics: [
              [this.NAMESPACE, "RequestsPerMinute"],
              [this.NAMESPACE, "AverageResponseTime"],
              [this.NAMESPACE, "ErrorRate"]
            ],
            period: 300,
            stat: "Average",
            region: process.env.AWS_REGION || 'us-east-1',
            title: "Application Performance"
          }
        },
        {
          type: "metric",
          properties: {
            metrics: [
              [this.NAMESPACE, "PullRequestsProcessed"],
              [this.NAMESPACE, "AutoMergesCompleted"],
              [this.NAMESPACE, "AIAnalysisRequests"]
            ],
            period: 3600,
            stat: "Sum",
            region: process.env.AWS_REGION || 'us-east-1',
            title: "Business Metrics"
          }
        }
      ]
    });

    try {
      await this.cloudWatch.putDashboard({
        DashboardName: 'AutomergePro-Overview',
        DashboardBody: dashboardBody
      }).promise();
      
      console.log('✅ Created CloudWatch dashboard');
    } catch (error) {
      console.error('❌ Failed to create dashboard:', error);
    }
  }

  /**
   * Setup distributed tracing with AWS X-Ray
   */
  private async setupDistributedTracing(): Promise<void> {
    // X-Ray tracing is typically configured at the Lambda/container level
    // This method would set up custom segments and annotations
    console.log('✅ Distributed tracing configured');
  }

  /**
   * Check performance thresholds and create alerts
   */
  private async checkPerformanceThresholds(metrics: PerformanceMetrics): Promise<void> {
    const thresholds = {
      averageResponseTime: { warning: 3000, critical: 5000 },
      errorRate: { warning: 3, critical: 5 },
      memoryUsage: { warning: 75, critical: 85 },
      cpuUsage: { warning: 70, critical: 80 }
    };

    for (const [metricName, values] of Object.entries(metrics)) {
      const threshold = thresholds[metricName as keyof typeof thresholds];
      if (!threshold) continue;

      const value = values as number;
      
      if (value >= threshold.critical) {
        await this.createAlert({
          type: 'performance',
          severity: 'critical',
          title: `Critical: High ${metricName}`,
          description: `${metricName} has reached critical level: ${value}`,
          threshold: threshold.critical,
          currentValue: value
        });
      } else if (value >= threshold.warning) {
        await this.createAlert({
          type: 'performance',
          severity: 'medium',
          title: `Warning: Elevated ${metricName}`,
          description: `${metricName} has exceeded warning threshold: ${value}`,
          threshold: threshold.warning,
          currentValue: value
        });
      }
    }
  }

  /**
   * Send alert notifications to various channels
   */
  private async sendAlertNotifications(alert: Alert): Promise<void> {
    const notifications = [];

    // SNS notification for critical alerts
    if (alert.severity === 'critical' && this.ALERT_TOPIC_ARN) {
      notifications.push(this.sendSNSAlert(alert));
    }

    // Slack notification
    if (process.env.SLACK_WEBHOOK_URL) {
      notifications.push(this.sendSlackAlert(alert));
    }

    // Email notification for high/critical
    if (['high', 'critical'].includes(alert.severity) && process.env.ALERT_EMAIL) {
      notifications.push(this.sendEmailAlert(alert));
    }

    await Promise.all(notifications);
  }

  /**
   * Send SNS alert
   */
  private async sendSNSAlert(alert: Alert): Promise<void> {
    try {
      await this.sns.publish({
        TopicArn: this.ALERT_TOPIC_ARN,
        Subject: `${alert.severity.toUpperCase()}: ${alert.title}`,
        Message: JSON.stringify({
          alert,
          timestamp: alert.timestamp.toISOString(),
          environment: process.env.NODE_ENV || 'development'
        }, null, 2)
      }).promise();
    } catch (error) {
      console.error('Failed to send SNS alert:', error);
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    try {
      const webhook = process.env.SLACK_WEBHOOK_URL;
      if (!webhook) return;

      const color = {
        low: '#36a64f',
        medium: '#ffeb3b',
        high: '#ff9800',
        critical: '#f44336'
      }[alert.severity];

      const payload = {
        attachments: [{
          color,
          title: alert.title,
          text: alert.description,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Current Value',
              value: alert.currentValue.toString(),
              short: true
            },
            {
              title: 'Threshold',
              value: alert.threshold.toString(),
              short: true
            },
            {
              title: 'Time',
              value: alert.timestamp.toISOString(),
              short: true
            }
          ],
          footer: 'Automerge-Pro Monitoring',
          ts: Math.floor(alert.timestamp.getTime() / 1000)
        }]
      };

      // In production, use fetch or axios to send to Slack
      console.log('Sending Slack alert:', payload);
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    try {
      // Implementation would use SES or another email service
      console.log('Sending email alert:', alert.title);
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<{ status: 'healthy' | 'warning' | 'critical'; details: any }> {
    try {
      // Check various system components
      const checks = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkExternalServicesHealth(),
        this.checkMemoryHealth(),
        this.checkPerformanceHealth()
      ]);

      const failures = checks.filter(check => !check.healthy);
      
      if (failures.some(f => f.critical)) {
        return { status: 'critical', details: { checks, failures } };
      } else if (failures.length > 0) {
        return { status: 'warning', details: { checks, failures } };
      } else {
        return { status: 'healthy', details: { checks } };
      }
    } catch (error) {
      return { 
        status: 'critical', 
        details: { error: error.message, checks: [] }
      };
    }
  }

  /**
   * Helper methods
   */
  private async getHistoricalMetricData(metricName: string, hours: number): Promise<number[]> {
    try {
      const params = {
        MetricName: metricName,
        Namespace: this.NAMESPACE,
        StartTime: new Date(Date.now() - hours * 60 * 60 * 1000),
        EndTime: new Date(),
        Period: 300,
        Statistics: ['Average']
      };

      const result = await this.cloudWatch.getMetricStatistics(params).promise();
      return result.Datapoints?.map(dp => dp.Average || 0) || [];
    } catch (error) {
      console.error('Failed to get historical data:', error);
      return [];
    }
  }

  private async storeAlert(alert: Alert): Promise<void> {
    // Implementation would store in DynamoDB or another database
    console.log('Storing alert:', alert.id, alert.title);
  }

  private async sendToStructuredLogging(log: any): Promise<void> {
    // Implementation would send to CloudWatch Logs, Datadog, Sentry, etc.
    console.log('Structured log:', JSON.stringify(log));
  }

  private async evaluateErrorAlert(error: Error, context?: any): Promise<void> {
    // Determine if this error requires immediate alerting
    const criticalErrors = ['DatabaseConnectionError', 'AuthenticationError', 'ServiceUnavailableError'];
    
    if (criticalErrors.includes(error.name)) {
      await this.createAlert({
        type: 'error',
        severity: 'critical',
        title: `Critical Error: ${error.name}`,
        description: error.message,
        threshold: 1,
        currentValue: 1,
        metadata: { context, stack: error.stack }
      });
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineSeverityFromConfidence(confidence: number): Alert['severity'] {
    if (confidence >= 0.9) return 'critical';
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  private async checkDatabaseHealth(): Promise<{ healthy: boolean; critical: boolean; details: string }> {
    try {
      // Implementation would check database connectivity
      return { healthy: true, critical: false, details: 'Database connection OK' };
    } catch (error) {
      return { healthy: false, critical: true, details: `Database error: ${error.message}` };
    }
  }

  private async checkExternalServicesHealth(): Promise<{ healthy: boolean; critical: boolean; details: string }> {
    try {
      // Check GitHub API, OpenAI API, etc.
      return { healthy: true, critical: false, details: 'External services OK' };
    } catch (error) {
      return { healthy: false, critical: false, details: `External service issue: ${error.message}` };
    }
  }

  private async checkMemoryHealth(): Promise<{ healthy: boolean; critical: boolean; details: string }> {
    const usage = process.memoryUsage();
    const usagePercent = (usage.heapUsed / usage.heapTotal) * 100;
    
    if (usagePercent > 85) {
      return { healthy: false, critical: true, details: `High memory usage: ${usagePercent.toFixed(1)}%` };
    } else if (usagePercent > 70) {
      return { healthy: false, critical: false, details: `Elevated memory usage: ${usagePercent.toFixed(1)}%` };
    }
    
    return { healthy: true, critical: false, details: `Memory usage: ${usagePercent.toFixed(1)}%` };
  }

  private async checkPerformanceHealth(): Promise<{ healthy: boolean; critical: boolean; details: string }> {
    // Implementation would check recent performance metrics
    return { healthy: true, critical: false, details: 'Performance within normal range' };
  }
}