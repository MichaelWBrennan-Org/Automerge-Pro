#!/usr/bin/env tsx
/**
 * Analytics Demo Script
 * 
 * This script demonstrates the basic usage of the Analytics module
 * Run with: npm run analytics:demo
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { AnalyticsService } from '../src/services/analytics';
import { DataPipelineService } from '../src/services/data-pipeline';
import { ReportingService } from '../src/services/reporting';
import { NotificationService } from '../src/services/notification';
import { AnalyticsTracker } from '../src/utils/analytics-tracker';
import { AnalyticsEventType } from '../src/types';

async function runAnalyticsDemo() {
  console.log('🚀 Starting Analytics Module Demo...\n');

  // Initialize services
  const prisma = new PrismaClient();
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  
  console.log('✅ Connected to database and Redis');

  const analyticsService = new AnalyticsService(prisma, redis);
  const dataPipelineService = new DataPipelineService();
  const notificationService = new NotificationService();
  const reportingService = new ReportingService(prisma, redis, analyticsService, notificationService);
  const analyticsTracker = new AnalyticsTracker(analyticsService);

  console.log('✅ Analytics services initialized\n');

  // Demo 1: Track some sample events
  console.log('📊 Demo 1: Tracking Sample Events');
  console.log('=====================================');

  const organizationId = 'demo-org-' + Date.now();
  const userId = 'demo-user-' + Date.now();
  const repositoryId = 'demo-repo-' + Date.now();
  const pullRequestId = 'demo-pr-' + Date.now();

  try {
    // Track app installation
    await analyticsTracker.trackAppInstallation(organizationId, 'demo-installation', 5);
    console.log('✅ Tracked app installation');

    // Track user onboarding
    await analyticsTracker.trackUserOnboarding(organizationId, userId, 'account_setup');
    await analyticsTracker.trackUserOnboarding(organizationId, userId, 'first_rule_created');
    console.log('✅ Tracked user onboarding steps');

    // Track pull request events
    await analyticsTracker.trackPullRequestCreated(organizationId, repositoryId, pullRequestId, userId);
    await analyticsTracker.trackPullRequestAnalyzed(organizationId, repositoryId, pullRequestId, 0.3);
    await analyticsTracker.trackPullRequestAutoMerged(organizationId, repositoryId, pullRequestId, 0.3);
    console.log('✅ Tracked pull request lifecycle');

    // Track feature usage
    await analyticsTracker.trackDashboardViewed(organizationId, userId, 'overview');
    await analyticsTracker.trackAiAnalysisRequested(organizationId, repositoryId, pullRequestId, userId);
    console.log('✅ Tracked feature usage');

    // Track some API requests for performance monitoring
    await analyticsTracker.trackApiRequest('GET', '/api/dashboard', 200, 150, organizationId);
    await analyticsTracker.trackApiRequest('POST', '/api/events', 201, 95, organizationId);
    console.log('✅ Tracked API performance metrics');

  } catch (error) {
    console.error('❌ Error tracking events:', error);
  }

  console.log('\n📈 Demo 2: Retrieving Analytics Data');
  console.log('====================================');

  try {
    // Create a mock organization for metrics calculation
    await prisma.organization.create({
      data: {
        id: organizationId,
        githubId: '12345',
        login: 'demo-org',
        name: 'Demo Organization',
        plan: 'TEAM'
      }
    });

    // Get dashboard data
    const dashboardData = await analyticsService.getDashboardData(organizationId, 7);
    console.log('📊 Dashboard Metrics:');
    console.log('  - Total Users:', dashboardData.metrics.totalUsers);
    console.log('  - Active Users:', dashboardData.metrics.activeUsers);
    console.log('  - Pull Requests:', dashboardData.metrics.totalPullRequests);
    console.log('  - Auto-merged PRs:', dashboardData.metrics.autoMergedPullRequests);
    console.log('  - AI Analysis Requests:', dashboardData.metrics.aiAnalysisRequests);
    console.log('  - Monthly Revenue:', '$' + dashboardData.metrics.monthlyRecurringRevenue);
    console.log('  - Chart Data Points:', dashboardData.charts.userGrowth.length);

  } catch (error) {
    console.error('❌ Error retrieving analytics:', error);
  }

  console.log('\n📋 Demo 3: Generating Reports');
  console.log('=============================');

  try {
    // Generate a sample report
    const reportContent = await reportingService.generateReport(organizationId, 'weekly', 'HTML');
    console.log('✅ Generated weekly HTML report');
    console.log('  Report size:', Math.round(reportContent.length / 1024) + 'KB');

    // Get available report templates
    const templates = reportingService.getReportTemplates();
    console.log('📝 Available Report Templates:');
    templates.forEach((template, index) => {
      console.log(`  ${index + 1}. ${template.name} - ${template.description}`);
    });

  } catch (error) {
    console.error('❌ Error generating reports:', error);
  }

  console.log('\n🔍 Demo 4: Data Export');
  console.log('======================');

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Export data as JSON
    const jsonExport = await analyticsService.exportData(organizationId, 'JSON', startDate, endDate);
    console.log('✅ Exported data as JSON');
    console.log('  Export size:', Math.round(jsonExport.length / 1024) + 'KB');

    // Export data as CSV
    const csvExport = await analyticsService.exportData(organizationId, 'CSV', startDate, endDate);
    console.log('✅ Exported data as CSV');
    console.log('  CSV rows:', csvExport.split('\n').length);

  } catch (error) {
    console.error('❌ Error exporting data:', error);
  }

  console.log('\n🚨 Demo 5: Anomaly Detection');
  console.log('============================');

  try {
    // Run anomaly detection
    const alerts = await analyticsService.detectAnomalies();
    console.log('🔍 Anomaly detection completed');
    console.log('  Alerts found:', alerts.length);
    
    if (alerts.length > 0) {
      alerts.forEach((alert, index) => {
        console.log(`  ${index + 1}. ${alert.severity} - ${alert.metricName}: ${alert.description}`);
      });
    } else {
      console.log('  No anomalies detected - system is healthy! 🎉');
    }

  } catch (error) {
    console.error('❌ Error running anomaly detection:', error);
  }

  console.log('\n🔧 Demo 6: Data Pipeline Integration');
  console.log('===================================');

  try {
    // Test data pipeline health
    await dataPipelineService.initialize();
    console.log('✅ Data pipeline initialized successfully');

    // Send a test event through the pipeline
    const testEvent = {
      id: 'test-event-' + Date.now(),
      timestamp: new Date(),
      eventType: AnalyticsEventType.API_REQUEST_COMPLETED,
      organizationId,
      properties: {
        method: 'GET',
        endpoint: '/health',
        statusCode: 200,
        responseTime: 25
      }
    };

    await dataPipelineService.sendEvent(testEvent);
    console.log('✅ Test event sent through data pipeline');
    console.log('  Provider:', process.env.ANALYTICS_PROVIDER || 'local');

  } catch (error) {
    console.error('❌ Error with data pipeline:', error);
  }

  console.log('\n✨ Demo Complete!');
  console.log('================');
  console.log('The Analytics module is ready for use. Key features demonstrated:');
  console.log('  ✅ Real-time event tracking');
  console.log('  ✅ Metrics calculation and dashboard data');
  console.log('  ✅ Report generation (HTML/PDF/JSON)');
  console.log('  ✅ Data export (JSON/CSV)');
  console.log('  ✅ Anomaly detection and alerting');
  console.log('  ✅ External data pipeline integration');

  console.log('\n🌐 Next Steps:');
  console.log('  1. Configure your external data pipeline (AWS Kinesis/BigQuery)');
  console.log('  2. Set up dashboard visualization (QuickSight/Metabase)');
  console.log('  3. Configure alert notifications (Slack/Email)');
  console.log('  4. Schedule automated reports');
  console.log('  5. Integrate event tracking throughout your application');

  console.log('\n📚 For more information, see: docs/analytics-module.md');

  // Cleanup
  try {
    await prisma.organization.delete({ where: { id: organizationId } });
    console.log('\n🧹 Demo cleanup completed');
  } catch (error) {
    // Ignore cleanup errors
  }

  await prisma.$disconnect();
  await redis.quit();
}

// Run the demo
runAnalyticsDemo()
  .then(() => {
    console.log('\n🎯 Demo completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Demo failed:', error);
    process.exit(1);
  });