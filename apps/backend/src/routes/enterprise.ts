/**
 * Enterprise API Routes
 * Connects all enterprise services to HTTP endpoints
 */

import { FastifyInstance } from 'fastify';
import { MarketingAutomationService } from '../services/marketing-automation';
import { OnboardingService } from '../services/onboarding';
import { MonitoringService } from '../services/monitoring';
import { SupportFeedbackService } from '../services/support-feedback';
import { AdvancedAnalyticsService } from '../services/advanced-analytics';
import { EnterpriseSecurityService } from '../services/enterprise-security';

export async function enterpriseRoutes(fastify: FastifyInstance) {
  const marketing = new MarketingAutomationService();
  const onboarding = new OnboardingService();
  const monitoring = new MonitoringService();
  const support = new SupportFeedbackService();
  const analytics = new AdvancedAnalyticsService();
  const security = new EnterpriseSecurityService();

  // Marketing Automation Routes
  fastify.register(async function (fastify) {
    fastify.post('/api/marketing/social-posts/generate', async (request, reply) => {
      try {
        const posts = await marketing.generateWeeklySocialPosts();
        return { success: true, posts };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.post('/api/marketing/email-campaign', async (request, reply) => {
      try {
        const { type } = request.body as { type: 'onboarding' | 'feature_announcement' | 'weekly_digest' };
        const campaign = await marketing.generateEmailCampaign(type);
        return { success: true, campaign };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.post('/api/marketing/case-study', async (request, reply) => {
      try {
        const { organizationData } = request.body as { organizationData: any };
        const caseStudy = await marketing.generateCaseStudy(organizationData);
        return { success: true, caseStudy };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });
  });

  // Onboarding Routes
  fastify.register(async function (fastify) {
    fastify.post('/api/onboarding/initialize', async (request, reply) => {
      try {
        const { userId, organizationId } = request.body as { userId: string; organizationId?: string };
        const progress = await onboarding.initializeOnboarding(userId, organizationId);
        return { success: true, progress };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.post('/api/onboarding/complete-step', async (request, reply) => {
      try {
        const { userId, stepId } = request.body as { userId: string; stepId: string };
        const progress = await onboarding.completeStep(userId, stepId);
        return { success: true, progress };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/onboarding/progress/:userId', async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const progress = await onboarding.getOnboardingProgress(userId);
        return { success: true, progress };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/onboarding/dashboard/:userId', async (request, reply) => {
      try {
        const { userId } = request.params as { userId: string };
        const progress = await onboarding.getOnboardingProgress(userId);
        const dashboardHtml = onboarding.generateWebDashboard(userId, progress);
        
        reply.type('text/html');
        return dashboardHtml;
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/onboarding/cli-script', async (request, reply) => {
      try {
        const cliScript = onboarding.generateCLIOnboarding();
        reply.type('text/plain');
        return cliScript;
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/onboarding/analytics', async (request, reply) => {
      try {
        const analyticsData = await onboarding.getOnboardingAnalytics();
        return { success: true, analytics: analyticsData };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });
  });

  // Monitoring & Alerting Routes
  fastify.register(async function (fastify) {
    fastify.post('/api/monitoring/metric', async (request, reply) => {
      try {
        const metric = request.body as any;
        await monitoring.trackMetric(metric);
        return { success: true };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.post('/api/monitoring/error', async (request, reply) => {
      try {
        const { error: errorData, context } = request.body as { error: any; context?: any };
        const error = new Error(errorData.message);
        error.name = errorData.name;
        error.stack = errorData.stack;
        
        await monitoring.trackError(error, context);
        return { success: true };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.post('/api/monitoring/performance', async (request, reply) => {
      try {
        const metrics = request.body as any;
        await monitoring.trackPerformance(metrics);
        return { success: true };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/monitoring/health', async (request, reply) => {
      try {
        const health = await monitoring.getHealthStatus();
        return { success: true, health };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.post('/api/monitoring/alert', async (request, reply) => {
      try {
        const alertData = request.body as any;
        const alert = await monitoring.createAlert(alertData);
        return { success: true, alert };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });
  });

  // Support & Feedback Routes
  fastify.register(async function (fastify) {
    fastify.post('/api/support/feedback', async (request, reply) => {
      try {
        const feedbackData = request.body as any;
        const feedback = await support.submitFeedback(feedbackData);
        return { success: true, feedback };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.post('/api/support/ticket', async (request, reply) => {
      try {
        const feedbackData = request.body as any;
        const feedback = await support.submitFeedback(feedbackData);
        const ticket = await support.createSupportTicket(feedback);
        return { success: true, ticket };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/support/analytics', async (request, reply) => {
      try {
        const { timeRange } = request.query as { timeRange?: 'week' | 'month' | 'quarter' };
        const analytics = await support.getFeedbackAnalytics(timeRange);
        return { success: true, analytics };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/support/summary/weekly', async (request, reply) => {
      try {
        const summary = await support.generateWeeklyFeedbackSummary();
        reply.type('text/markdown');
        return summary;
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/support/release-notes/draft', async (request, reply) => {
      try {
        const releaseNotes = await support.generateReleaseNotesDraft();
        reply.type('text/markdown');
        return releaseNotes;
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/support/dashboard', async (request, reply) => {
      try {
        const dashboardHtml = support.generateSupportDashboard();
        reply.type('text/html');
        return dashboardHtml;
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    // KPI endpoints for dashboard
    fastify.get('/api/support/analytics/kpis', async (request, reply) => {
      try {
        return {
          totalTickets: 42,
          avgResolutionTime: 18.5,
          satisfactionScore: 8.7,
          criticalIssues: 3
        };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/support/analytics/charts', async (request, reply) => {
      try {
        return {
          feedbackByType: {
            'bug_report': 25,
            'feature_request': 18,
            'support_request': 12,
            'general_feedback': 8
          },
          sentiment: {
            positive: 45,
            neutral: 32,
            negative: 23
          },
          resolutionTrends: {
            dates: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            counts: [8, 12, 15, 9, 11]
          },
          topIssues: [
            { name: 'Configuration issues', count: 15 },
            { name: 'Performance problems', count: 12 },
            { name: 'Integration questions', count: 9 }
          ]
        };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/support/activity/recent', async (request, reply) => {
      try {
        return [
          {
            title: 'Critical: Database connection timeout',
            meta: '2 hours ago by user@example.com',
            priority: 'critical'
          },
          {
            title: 'Feature request: Dark mode support',
            meta: '4 hours ago by developer@company.com',
            priority: 'medium'
          },
          {
            title: 'Bug: Auto-merge not working for private repos',
            meta: '6 hours ago by admin@startup.com',
            priority: 'high'
          }
        ];
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });
  });

  // Advanced Analytics Routes
  fastify.register(async function (fastify) {
    fastify.post('/api/analytics/event', async (request, reply) => {
      try {
        const event = request.body as any;
        await analytics.trackEvent(event);
        return { success: true };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.post('/api/analytics/pipeline/run', async (request, reply) => {
      try {
        const { jobType, configuration } = request.body as { jobType: any; configuration: any };
        const job = await analytics.runDataPipeline(jobType, configuration);
        return { success: true, job };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/analytics/insights/predictive', async (request, reply) => {
      try {
        const insights = await analytics.generatePredictiveInsights();
        return { success: true, insights };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/analytics/insights/automated', async (request, reply) => {
      try {
        const { timeRange } = request.query as { timeRange?: 'day' | 'week' | 'month' };
        const insights = await analytics.generateAutomatedInsights(timeRange || 'week');
        reply.type('text/markdown');
        return insights;
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/analytics/dashboards', async (request, reply) => {
      try {
        const dashboards = await analytics.createBIDashboards();
        return { success: true, dashboards };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });
  });

  // Enterprise Security Routes
  fastify.register(async function (fastify) {
    fastify.post('/api/security/authenticate', async (request, reply) => {
      try {
        const { provider, authCode } = request.body as { provider: 'github' | 'google' | 'microsoft'; authCode: string };
        const authResult = await security.authenticateUser(provider, authCode);
        return { success: true, ...authResult };
      } catch (error) {
        reply.code(401);
        return { success: false, error: error.message };
      }
    });

    fastify.post('/api/security/permission-check', async (request, reply) => {
      try {
        const { userId, resource, action } = request.body as { userId: string; resource: string; action: string };
        const hasPermission = await security.checkPermission(userId, resource, action);
        return { success: true, hasPermission };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.post('/api/security/scan', async (request, reply) => {
      try {
        const { type, target } = request.body as { type: any; target: string };
        const scan = await security.performSecurityScan(type, target);
        return { success: true, scan };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.post('/api/security/mfa/setup', async (request, reply) => {
      try {
        const { userId, method } = request.body as { userId: string; method: 'totp' | 'sms' | 'email' };
        const mfaSetup = await security.setupMFA(userId, method);
        return { success: true, mfaSetup };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.post('/api/security/encrypt', async (request, reply) => {
      try {
        const { data, context } = request.body as { data: string; context?: any };
        const encryptedData = await security.encryptSensitiveData(data, context);
        return { success: true, encryptedData };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.post('/api/security/decrypt', async (request, reply) => {
      try {
        const { encryptedData, context } = request.body as { encryptedData: string; context?: any };
        const data = await security.decryptSensitiveData(encryptedData, context);
        return { success: true, data };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/security/compliance/:framework/:organizationId', async (request, reply) => {
      try {
        const { framework, organizationId } = request.params as { framework: any; organizationId: string };
        const report = await security.generateComplianceReport(framework, organizationId);
        return { success: true, report };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.get('/api/security/hardening-recommendations', async (request, reply) => {
      try {
        const recommendations = await security.generateSecurityHardening();
        return { success: true, ...recommendations };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });

    fastify.post('/api/security/audit-log', async (request, reply) => {
      try {
        const auditEvent = request.body as any;
        await security.logAuditEvent(auditEvent);
        return { success: true };
      } catch (error) {
        reply.code(500);
        return { success: false, error: error.message };
      }
    });
  });

  // Combined Enterprise Dashboard
  fastify.get('/api/enterprise/dashboard', async (request, reply) => {
    try {
      const dashboardHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Automerge-Pro Enterprise Dashboard</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: #f5f5f5;
                }
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                .dashboard-card {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .dashboard-card h3 {
                    margin-top: 0;
                    color: #333;
                    border-bottom: 2px solid #667eea;
                    padding-bottom: 10px;
                }
                .quick-link {
                    display: block;
                    padding: 10px;
                    margin: 5px 0;
                    background: #f8f9fa;
                    text-decoration: none;
                    color: #333;
                    border-radius: 4px;
                    border-left: 4px solid #667eea;
                }
                .quick-link:hover {
                    background: #e9ecef;
                }
                .header {
                    text-align: center;
                    margin-bottom: 40px;
                }
                .header h1 {
                    color: #667eea;
                    margin-bottom: 10px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🚀 Automerge-Pro Enterprise Dashboard</h1>
                <p>Comprehensive view of all enterprise features and analytics</p>
            </div>
            
            <div class="dashboard-grid">
                <div class="dashboard-card">
                    <h3>📊 Support & Feedback</h3>
                    <a href="/api/support/dashboard" class="quick-link">Support Dashboard</a>
                    <a href="/api/support/analytics" class="quick-link">Feedback Analytics</a>
                    <a href="/api/support/summary/weekly" class="quick-link">Weekly Summary</a>
                    <a href="/api/support/release-notes/draft" class="quick-link">Release Notes Draft</a>
                </div>
                
                <div class="dashboard-card">
                    <h3>🎯 User Onboarding</h3>
                    <a href="/api/onboarding/analytics" class="quick-link">Onboarding Analytics</a>
                    <a href="/api/onboarding/cli-script" class="quick-link">CLI Setup Script</a>
                    <a href="/api/onboarding/dashboard/demo" class="quick-link">Demo Dashboard</a>
                </div>
                
                <div class="dashboard-card">
                    <h3>📈 Advanced Analytics</h3>
                    <a href="/api/analytics/dashboards" class="quick-link">BI Dashboards</a>
                    <a href="/api/analytics/insights/predictive" class="quick-link">Predictive Insights</a>
                    <a href="/api/analytics/insights/automated" class="quick-link">Automated Insights</a>
                </div>
                
                <div class="dashboard-card">
                    <h3>🔒 Enterprise Security</h3>
                    <a href="/api/security/hardening-recommendations" class="quick-link">Security Hardening</a>
                    <a href="/api/security/compliance/SOC2/demo" class="quick-link">Compliance Report</a>
                </div>
                
                <div class="dashboard-card">
                    <h3>🚀 Marketing Automation</h3>
                    <a href="/api/marketing/social-posts/generate" class="quick-link">Generate Social Posts</a>
                    <a href="/api/marketing/case-study" class="quick-link">Case Studies</a>
                </div>
                
                <div class="dashboard-card">
                    <h3>📊 System Monitoring</h3>
                    <a href="/api/monitoring/health" class="quick-link">Health Status</a>
                    <a href="/health" class="quick-link">System Health</a>
                </div>
            </div>
            
            <script>
                // Auto-refresh certain metrics
                setInterval(() => {
                    // Could refresh health status, alerts, etc.
                }, 30000);
            </script>
        </body>
        </html>
      `;
      
      reply.type('text/html');
      return dashboardHtml;
    } catch (error) {
      reply.code(500);
      return { success: false, error: error.message };
    }
  });
}