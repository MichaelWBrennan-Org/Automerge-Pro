import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { AnalyticsService } from '../src/services/analytics';
import { AnalyticsEventType } from '../src/types';

// Mock Redis for testing
const mockRedis = {
  connect: jest.fn(),
  disconnect: jest.fn()
} as any;

// Mock Prisma for testing
const mockPrisma = {
  webhookEvent: {
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0)
  },
  organization: {
    findUnique: jest.fn().mockResolvedValue({
      id: 'test-org-id',
      name: 'Test Organization',
      plan: 'TEAM',
      installations: []
    })
  },
  organizationUser: {
    count: jest.fn().mockResolvedValue(10)
  }
} as any;

describe('Analytics Service', () => {
  let analyticsService: AnalyticsService;

  beforeAll(() => {
    analyticsService = new AnalyticsService(mockPrisma, mockRedis);
  });

  afterAll(() => {
    // Clean up
  });

  describe('Event Tracking', () => {
    it('should track an analytics event successfully', async () => {
      const eventData = {
        eventType: AnalyticsEventType.PULL_REQUEST_CREATED,
        organizationId: 'test-org-id',
        userId: 'test-user-id',
        repositoryId: 'test-repo-id',
        pullRequestId: 'test-pr-id',
        properties: {
          title: 'Test PR',
          branch: 'feature/test'
        }
      };

      // Mock the database call
      mockPrisma.webhookEvent.create.mockResolvedValue({
        id: 'test-event-id',
        githubId: expect.any(String),
        event: eventData.eventType,
        payload: expect.any(Object),
        processed: false
      });

      await analyticsService.trackEvent(eventData);

      expect(mockPrisma.webhookEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event: eventData.eventType,
          payload: expect.objectContaining({
            organizationId: eventData.organizationId,
            userId: eventData.userId,
            repositoryId: eventData.repositoryId,
            pullRequestId: eventData.pullRequestId,
            properties: eventData.properties
          })
        })
      });
    });

    it('should handle errors gracefully when tracking events', async () => {
      const eventData = {
        eventType: AnalyticsEventType.USER_LOGIN,
        organizationId: 'test-org-id',
        userId: 'test-user-id',
        properties: {}
      };

      // Mock database error
      mockPrisma.webhookEvent.create.mockRejectedValue(new Error('Database error'));

      // Should not throw error
      await expect(analyticsService.trackEvent(eventData)).resolves.not.toThrow();
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate basic metrics for an organization', async () => {
      const organizationId = 'test-org-id';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const metrics = await analyticsService.getMetrics(organizationId, startDate, endDate);

      expect(metrics).toEqual(expect.objectContaining({
        totalUsers: expect.any(Number),
        activeUsers: expect.any(Number),
        newUsers: expect.any(Number),
        totalPullRequests: expect.any(Number),
        autoMergedPullRequests: expect.any(Number),
        aiAnalysisRequests: expect.any(Number),
        averageRiskScore: expect.any(Number),
        monthlyRecurringRevenue: expect.any(Number),
        churnRate: expect.any(Number),
        conversionRate: expect.any(Number),
        periodStart: startDate,
        periodEnd: endDate
      }));
    });

    it('should handle non-existent organization gracefully', async () => {
      const organizationId = 'non-existent-org';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock organization not found
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      const metrics = await analyticsService.getMetrics(organizationId, startDate, endDate);

      expect(metrics.totalPullRequests).toBe(0);
      expect(metrics.autoMergedPullRequests).toBe(0);
      expect(metrics.monthlyRecurringRevenue).toBe(0);
    });
  });

  describe('Dashboard Data', () => {
    it('should generate dashboard data with metrics and charts', async () => {
      const organizationId = 'test-org-id';
      const days = 30;

      const dashboardData = await analyticsService.getDashboardData(organizationId, days);

      expect(dashboardData).toEqual(expect.objectContaining({
        metrics: expect.objectContaining({
          totalUsers: expect.any(Number),
          activeUsers: expect.any(Number)
        }),
        charts: expect.objectContaining({
          userGrowth: expect.any(Array),
          revenue: expect.any(Array),
          featureUsage: expect.any(Array),
          pullRequestStats: expect.any(Array)
        }),
        alerts: expect.any(Array)
      }));

      // Check chart data structure
      expect(dashboardData.charts.userGrowth[0]).toEqual(expect.objectContaining({
        date: expect.any(String),
        value: expect.any(Number)
      }));
    });
  });

  describe('Data Export', () => {
    it('should export data in JSON format', async () => {
      const organizationId = 'test-org-id';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const format = 'JSON';

      const exportData = await analyticsService.exportData(organizationId, format, startDate, endDate);

      expect(() => JSON.parse(exportData)).not.toThrow();
      
      const parsed = JSON.parse(exportData);
      expect(parsed).toEqual(expect.objectContaining({
        metrics: expect.any(Object),
        charts: expect.any(Object),
        exportedAt: expect.any(String)
      }));
    });

    it('should export data in CSV format', async () => {
      const organizationId = 'test-org-id';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const format = 'CSV';

      const exportData = await analyticsService.exportData(organizationId, format, startDate, endDate);

      expect(exportData).toContain('Metric,Value');
      expect(exportData).toContain('Total Users');
      expect(exportData).toContain('Active Users');
    });
  });
});