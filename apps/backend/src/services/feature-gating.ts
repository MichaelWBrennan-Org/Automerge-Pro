import { PrismaClient } from '@prisma/client';

export interface PlanLimits {
  repositories: number;
  aiAnalysis: boolean;
  advancedRules: boolean;
  complianceChecks: boolean;
  scheduledMerges: boolean;
  slackNotifications: boolean;
  webhookNotifications: boolean;
  prioritySupport: boolean;
  customIntegrations: boolean;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: {
    repositories: 1,
    aiAnalysis: false,
    advancedRules: false,
    complianceChecks: false,
    scheduledMerges: false,
    slackNotifications: false,
    webhookNotifications: false,
    prioritySupport: false,
    customIntegrations: false
  },
  TEAM: {
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
  GROWTH: {
    repositories: -1, // unlimited
    aiAnalysis: true,
    advancedRules: true,
    complianceChecks: true,
    scheduledMerges: true,
    slackNotifications: true,
    webhookNotifications: true,
    prioritySupport: false,
    customIntegrations: true
  },
  ENTERPRISE: {
    repositories: -1, // unlimited
    aiAnalysis: true,
    advancedRules: true,
    complianceChecks: true,
    scheduledMerges: true,
    slackNotifications: true,
    webhookNotifications: true,
    prioritySupport: true,
    customIntegrations: true
  }
};

export class FeatureGatingService {
  constructor(private prisma: PrismaClient) {}

  async getOrganizationLimits(organizationId: string): Promise<PlanLimits> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    return PLAN_LIMITS[org.plan] || PLAN_LIMITS.FREE;
  }

  async canAddRepository(organizationId: string): Promise<boolean> {
    const limits = await this.getOrganizationLimits(organizationId);
    
    if (limits.repositories === -1) return true; // unlimited
    
    const currentCount = await this.prisma.repository.count({
      where: {
        installation: {
          organizationId
        }
      }
    });

    return currentCount < limits.repositories;
  }

  async checkFeatureAccess(organizationId: string, feature: keyof PlanLimits): Promise<boolean> {
    const limits = await this.getOrganizationLimits(organizationId);
    return limits[feature] as boolean;
  }

  async enforceRepositoryLimit(organizationId: string): Promise<void> {
    const limits = await this.getOrganizationLimits(organizationId);
    
    if (limits.repositories === -1) return; // unlimited

    const repositories = await this.prisma.repository.findMany({
      where: {
        installation: {
          organizationId
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (repositories.length > limits.repositories) {
      // Disable automerge for excess repositories
      const excessRepos = repositories.slice(limits.repositories);
      
      for (const repo of excessRepos) {
        await this.prisma.mergeRule.updateMany({
          where: {
            repositoryId: repo.id
          },
          data: {
            enabled: false
          }
        });
      }
    }
  }

  async getUsageStats(organizationId: string) {
    const [limits, repositoryCount, activeRules] = await Promise.all([
      this.getOrganizationLimits(organizationId),
      this.prisma.repository.count({
        where: {
          installation: {
            organizationId
          }
        }
      }),
      this.prisma.mergeRule.count({
        where: {
          organizationId,
          enabled: true
        }
      })
    ]);

    return {
      limits,
      usage: {
        repositories: repositoryCount,
        activeRules
      }
    };
  }
}

export const featureGating = new FeatureGatingService(new PrismaClient());