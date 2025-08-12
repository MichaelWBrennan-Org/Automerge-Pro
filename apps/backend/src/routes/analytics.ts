import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AnalyticsService } from '../services/analytics.js';
import { ReportingService } from '../services/reporting.js';
import { DataPipelineService } from '../services/data-pipeline.js';
import { AnalyticsEventType } from '../types/index.js';

// Request schemas
const getMetricsSchema = z.object({
  organizationId: z.string(),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  days: z.number().optional()
});

const trackEventSchema = z.object({
  eventType: z.nativeEnum(AnalyticsEventType),
  organizationId: z.string(),
  userId: z.string().optional(),
  repositoryId: z.string().optional(),
  pullRequestId: z.string().optional(),
  properties: z.record(z.any()).default({}),
  metadata: z.object({
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    sessionId: z.string().optional(),
    version: z.string().optional()
  }).optional()
});

const generateReportSchema = z.object({
  organizationId: z.string(),
  reportType: z.enum(['weekly', 'monthly', 'quarterly']),
  format: z.enum(['HTML', 'PDF', 'JSON']).default('HTML'),
  email: z.boolean().default(false),
  recipients: z.array(z.string()).default([])
});

const exportDataSchema = z.object({
  organizationId: z.string(),
  format: z.enum(['JSON', 'CSV']),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str))
});

export function registerAnalyticsRoutes(
  fastify: any,
  analyticsService: AnalyticsService,
  reportingService: ReportingService,
  dataPipelineService: DataPipelineService
) {
  
  /**
   * Get analytics dashboard data
   */
  fastify.get('/analytics/dashboard/:organizationId', async (
    request: FastifyRequest<{ 
      Params: { organizationId: string };
      Querystring: { days?: string }
    }>, 
    reply: FastifyReply
  ) => {
    try {
      const { organizationId } = request.params;
      const days = request.query.days ? parseInt(request.query.days) : 30;

      const dashboardData = await analyticsService.getDashboardData(organizationId, days);
      
      reply.send({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      request.log.error('Failed to get dashboard data:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to load dashboard data'
      });
    }
  });

  /**
   * Get detailed analytics metrics
   */
  fastify.get('/analytics/metrics/:organizationId', async (
    request: FastifyRequest<{ 
      Params: { organizationId: string };
      Querystring: { startDate: string; endDate: string }
    }>, 
    reply: FastifyReply
  ) => {
    try {
      const validation = getMetricsSchema.safeParse({
        organizationId: request.params.organizationId,
        startDate: request.query.startDate,
        endDate: request.query.endDate
      });

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid parameters',
          details: validation.error.issues
        });
      }

      const { organizationId, startDate, endDate } = validation.data;
      const metrics = await analyticsService.getMetrics(organizationId, startDate, endDate);
      
      reply.send({
        success: true,
        data: metrics
      });
    } catch (error) {
      request.log.error('Failed to get analytics metrics:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to load analytics metrics'
      });
    }
  });

  /**
   * Track an analytics event
   */
  fastify.post('/analytics/events', async (
    request: FastifyRequest<{ Body: any }>, 
    reply: FastifyReply
  ) => {
    try {
      const validation = trackEventSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid event data',
          details: validation.error.issues
        });
      }

      const eventData = validation.data;
      
      // Add request metadata if not provided
      if (!eventData.metadata) {
        eventData.metadata = {
          userAgent: request.headers['user-agent'],
          ipAddress: request.headers['x-forwarded-for'] as string || request.ip,
          sessionId: request.headers['x-session-id'] as string
        };
      }

      await analyticsService.trackEvent(eventData);
      
      reply.send({
        success: true,
        message: 'Event tracked successfully'
      });
    } catch (error) {
      request.log.error('Failed to track analytics event:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to track event'
      });
    }
  });

  /**
   * Generate analytics report
   */
  fastify.post('/analytics/reports', async (
    request: FastifyRequest<{ Body: any }>, 
    reply: FastifyReply
  ) => {
    try {
      const validation = generateReportSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid report parameters',
          details: validation.error.issues
        });
      }

      const { organizationId, reportType, format, email, recipients } = validation.data;
      
      const reportContent = await reportingService.generateReport(organizationId, reportType, format);
      
      // Send via email if requested
      if (email && recipients.length > 0) {
        await reportingService.emailReport(organizationId, reportContent, recipients, reportType);
        
        reply.send({
          success: true,
          message: 'Report generated and emailed successfully',
          reportGenerated: true,
          emailSent: true
        });
      } else {
        reply.send({
          success: true,
          data: {
            content: reportContent,
            format,
            generatedAt: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      request.log.error('Failed to generate report:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to generate report'
      });
    }
  });

  /**
   * Export analytics data
   */
  fastify.post('/analytics/export', async (
    request: FastifyRequest<{ Body: any }>, 
    reply: FastifyReply
  ) => {
    try {
      const validation = exportDataSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid export parameters',
          details: validation.error.issues
        });
      }

      const { organizationId, format, startDate, endDate } = validation.data;
      
      const exportedData = await analyticsService.exportData(organizationId, format, startDate, endDate);
      
      const filename = `analytics_export_${organizationId}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.${format.toLowerCase()}`;
      
      reply.header('Content-Type', format === 'JSON' ? 'application/json' : 'text/csv')
           .header('Content-Disposition', `attachment; filename="${filename}"`)
           .send(exportedData);
    } catch (error) {
      request.log.error('Failed to export analytics data:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to export data'
      });
    }
  });

  /**
   * Detect and get anomaly alerts
   */
  fastify.get('/analytics/alerts/:organizationId', async (
    request: FastifyRequest<{ Params: { organizationId: string } }>, 
    reply: FastifyReply
  ) => {
    try {
      const { organizationId } = request.params;
      
      // Run anomaly detection for this organization
      const alerts = await analyticsService.detectAnomalies();
      const orgAlerts = alerts.filter(alert => alert.organizationId === organizationId);
      
      reply.send({
        success: true,
        data: {
          alerts: orgAlerts,
          count: orgAlerts.length
        }
      });
    } catch (error) {
      request.log.error('Failed to get anomaly alerts:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to load alerts'
      });
    }
  });

  /**
   * Get report templates
   */
  fastify.get('/analytics/report-templates', async (
    request: FastifyRequest, 
    reply: FastifyReply
  ) => {
    try {
      const templates = reportingService.getReportTemplates();
      
      reply.send({
        success: true,
        data: templates
      });
    } catch (error) {
      request.log.error('Failed to get report templates:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to load report templates'
      });
    }
  });

  /**
   * Health check for analytics system
   */
  fastify.get('/analytics/health', async (
    request: FastifyRequest, 
    reply: FastifyReply
  ) => {
    try {
      const healthStatus = {
        analytics: true,
        dataPipeline: true,
        reporting: true,
        timestamp: new Date().toISOString()
      };

      // Test data pipeline connection
      try {
        await dataPipelineService.initialize();
      } catch (error) {
        healthStatus.dataPipeline = false;
      }

      reply.send({
        success: true,
        data: healthStatus
      });
    } catch (error) {
      request.log.error('Failed to check analytics health:', error);
      reply.status(500).send({
        success: false,
        error: 'Failed to check system health'
      });
    }
  });
}