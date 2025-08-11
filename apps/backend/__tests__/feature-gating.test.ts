import { FeatureGatingService } from '../src/services/feature-gating';
import { createMockPrismaClient, testData } from './utils/test-utils';

describe('FeatureGatingService', () => {
  let service: FeatureGatingService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    service = new FeatureGatingService(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrganizationLimits', () => {
    it('should return FREE plan limits for non-existent organization', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.getOrganizationLimits('non-existent-org')).rejects.toThrow(
        'Organization not found'
      );
    });

    it('should return FREE plan limits', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        plan: 'FREE'
      });

      const limits = await service.getOrganizationLimits('test-org-id');

      expect(limits).toEqual({
        repositories: 1,
        aiAnalysis: false,
        advancedRules: false,
        complianceChecks: false,
        scheduledMerges: false,
        slackNotifications: false,
        webhookNotifications: false,
        prioritySupport: false,
        customIntegrations: false
      });
    });

    it('should return TEAM plan limits', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        plan: 'TEAM'
      });

      const limits = await service.getOrganizationLimits('test-org-id');

      expect(limits).toEqual({
        repositories: 10,
        aiAnalysis: true,
        advancedRules: true,
        complianceChecks: false,
        scheduledMerges: false,
        slackNotifications: true,
        webhookNotifications: false,
        prioritySupport: false,
        customIntegrations: false
      });
    });

    it('should return GROWTH plan limits with unlimited repositories', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        plan: 'GROWTH'
      });

      const limits = await service.getOrganizationLimits('test-org-id');

      expect(limits).toEqual({
        repositories: -1,
        aiAnalysis: true,
        advancedRules: true,
        complianceChecks: true,
        scheduledMerges: true,
        slackNotifications: true,
        webhookNotifications: true,
        prioritySupport: false,
        customIntegrations: true
      });
    });

    it('should return ENTERPRISE plan limits', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        plan: 'ENTERPRISE'
      });

      const limits = await service.getOrganizationLimits('test-org-id');

      expect(limits).toEqual({
        repositories: -1,
        aiAnalysis: true,
        advancedRules: true,
        complianceChecks: true,
        scheduledMerges: true,
        slackNotifications: true,
        webhookNotifications: true,
        prioritySupport: true,
        customIntegrations: true
      });
    });
  });

  describe('canAddRepository', () => {
    it('should return true for unlimited plans', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        plan: 'GROWTH'
      });

      const result = await service.canAddRepository('test-org-id');
      expect(result).toBe(true);
    });

    it('should return true when under repository limit', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        plan: 'TEAM' // 10 repositories limit
      });
      mockPrisma.repository.count.mockResolvedValue(5);

      const result = await service.canAddRepository('test-org-id');
      expect(result).toBe(true);
      expect(mockPrisma.repository.count).toHaveBeenCalledWith({
        where: {
          installation: {
            organizationId: 'test-org-id'
          }
        }
      });
    });

    it('should return false when at repository limit', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        plan: 'TEAM' // 10 repositories limit
      });
      mockPrisma.repository.count.mockResolvedValue(10);

      const result = await service.canAddRepository('test-org-id');
      expect(result).toBe(false);
    });

    it('should return false when over repository limit', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        plan: 'FREE' // 1 repository limit
      });
      mockPrisma.repository.count.mockResolvedValue(2);

      const result = await service.canAddRepository('test-org-id');
      expect(result).toBe(false);
    });
  });

  describe('checkFeatureAccess', () => {
    it('should return true for enabled features', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        plan: 'TEAM'
      });

      const hasAiAnalysis = await service.checkFeatureAccess('test-org-id', 'aiAnalysis');
      expect(hasAiAnalysis).toBe(true);

      const hasAdvancedRules = await service.checkFeatureAccess('test-org-id', 'advancedRules');
      expect(hasAdvancedRules).toBe(true);
    });

    it('should return false for disabled features', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        plan: 'FREE'
      });

      const hasAiAnalysis = await service.checkFeatureAccess('test-org-id', 'aiAnalysis');
      expect(hasAiAnalysis).toBe(false);

      const hasCompliance = await service.checkFeatureAccess('test-org-id', 'complianceChecks');
      expect(hasCompliance).toBe(false);
    });
  });

  describe('enforceRepositoryLimit', () => {
    it('should not enforce limits for unlimited plans', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        plan: 'ENTERPRISE'
      });

      await service.enforceRepositoryLimit('test-org-id');

      expect(mockPrisma.repository.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.mergeRule.updateMany).not.toHaveBeenCalled();
    });

    it('should disable rules for excess repositories', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        plan: 'FREE' // 1 repository limit
      });

      const repositories = [
        { ...testData.repository, id: 'repo-1', createdAt: new Date('2023-01-01') },
        { ...testData.repository, id: 'repo-2', createdAt: new Date('2023-01-02') },
        { ...testData.repository, id: 'repo-3', createdAt: new Date('2023-01-03') }
      ];

      mockPrisma.repository.findMany.mockResolvedValue(repositories);

      await service.enforceRepositoryLimit('test-org-id');

      expect(mockPrisma.repository.findMany).toHaveBeenCalledWith({
        where: {
          installation: {
            organizationId: 'test-org-id'
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Should disable rules for the 2 excess repositories (keeping the newest)
      expect(mockPrisma.mergeRule.updateMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.mergeRule.updateMany).toHaveBeenCalledWith({
        where: { repositoryId: 'repo-2' },
        data: { enabled: false }
      });
      expect(mockPrisma.mergeRule.updateMany).toHaveBeenCalledWith({
        where: { repositoryId: 'repo-1' },
        data: { enabled: false }
      });
    });

    it('should not disable rules when under limit', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        plan: 'TEAM' // 10 repositories limit
      });

      const repositories = [
        { ...testData.repository, id: 'repo-1' },
        { ...testData.repository, id: 'repo-2' }
      ];

      mockPrisma.repository.findMany.mockResolvedValue(repositories);

      await service.enforceRepositoryLimit('test-org-id');

      expect(mockPrisma.mergeRule.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics and limits', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        ...testData.organization,
        plan: 'TEAM'
      });
      mockPrisma.repository.count.mockResolvedValue(5);
      mockPrisma.mergeRule.count.mockResolvedValue(12);

      const stats = await service.getUsageStats('test-org-id');

      expect(stats).toEqual({
        limits: {
          repositories: 10,
          aiAnalysis: true,
          advancedRules: true,
          complianceChecks: false,
          scheduledMerges: false,
          slackNotifications: true,
          webhookNotifications: false,
          prioritySupport: false,
          customIntegrations: false
        },
        usage: {
          repositories: 5,
          activeRules: 12
        }
      });

      expect(mockPrisma.repository.count).toHaveBeenCalledWith({
        where: {
          installation: {
            organizationId: 'test-org-id'
          }
        }
      });

      expect(mockPrisma.mergeRule.count).toHaveBeenCalledWith({
        where: {
          organizationId: 'test-org-id',
          enabled: true
        }
      });
    });
  });
});