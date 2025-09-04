import { z } from 'zod';
import * as yaml from 'js-yaml';
import { Octokit } from '@octokit/rest';
import { MergeRule } from '../types';

const AutomergeConfigSchema = z.object({
  version: z.string().default('1'),
  rules: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    enabled: z.boolean().default(true),
    conditions: z.object({
      filePatterns: z.array(z.string()).optional(),
      authorPatterns: z.array(z.string()).optional(),
      branchPatterns: z.array(z.string()).optional(),
      maxRiskScore: z.number().min(0).max(1).optional(),
      requireTests: z.boolean().optional(),
      blockPatterns: z.array(z.string()).optional(),
      requiredChecks: z.array(z.string()).optional(),
      minApprovals: z.number().min(0).optional()
    }),
    actions: z.object({
      autoApprove: z.boolean().default(false),
      autoMerge: z.boolean().default(false),
      requireReviews: z.number().min(0).optional(),
      notify: z.boolean().default(true),
      mergeMethod: z.enum(['merge', 'squash', 'rebase']).optional(),
      deleteBranch: z.boolean().optional(),
      // Optional: influence queue behavior when merge queue is enabled
      priority: z.number().min(0).max(10).optional(),
      rebaseBeforeMerge: z.boolean().optional(),
      // Optional: schedule merges using cron or time windows (e.g., "0 9 * * MON-FRI" or "09:00-17:00 TZ=UTC")
      schedule: z.string().optional()
    })
  })).default([]),
  // Optional backport configuration (applies after merge)
  backports: z.object({
    to: z.array(z.string()),
    strategy: z.enum(['cherry-pick', 'merge']).default('cherry-pick')
  }).optional(),
  notifications: z.object({
    slack: z.object({
      webhookUrl: z.string().url(),
      channels: z.array(z.string()).optional(),
      events: z.array(z.string()).optional()
    }).optional(),
    email: z.object({
      recipients: z.array(z.string().email()),
      events: z.array(z.string()).optional()
    }).optional()
  }).optional(),
  settings: z.object({
    aiAnalysis: z.boolean().default(true),
    riskThreshold: z.number().min(0).max(1).default(0.5),
    autoDeleteBranches: z.boolean().default(false),
    requireStatusChecks: z.boolean().default(true),
    allowForceUpdates: z.boolean().default(false),
    // Merge train/queue controls
    mergeTrain: z.boolean().default(false),
    maxConcurrentMerges: z.number().min(1).default(1),
    defaultSchedule: z.string().optional(),
    // Centralized merge queue configuration
    mergeQueue: z.object({
      enabled: z.boolean().default(false),
      mode: z.enum(['strict', 'lenient']).default('lenient'),
      maxConcurrent: z.number().min(1).default(1),
      updateBranch: z.enum(['always', 'as_needed', 'never']).default('as_needed'),
      defaultPriority: z.number().min(0).max(10).default(5),
      batchSize: z.number().min(1).max(20).optional()
    }).optional()
  }).optional()
});

export type AutomergeConfig = z.infer<typeof AutomergeConfigSchema>;

export class ConfigurationService {
  constructor(private octokit: Octokit) {}

  async loadRepositoryConfig(owner: string, repo: string): Promise<AutomergeConfig> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: '.automerge-pro.yml'
      });

      if ('content' in data) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const yamlConfig = yaml.load(content);
        
        return AutomergeConfigSchema.parse(yamlConfig);
      }
    } catch (error: any) {
      if (error.status === 404) {
        // No config file found, return safe zero-config defaults
        const defaults = {
          version: '1',
          rules: [
            {
              name: 'Zero-config: documentation-only',
              description: 'Auto-approve and auto-merge documentation-only changes',
              enabled: true,
              conditions: {
                filePatterns: ['**/*.md', 'docs/**', '**/README*'],
                maxRiskScore: 0.2,
                minApprovals: 0
              },
              actions: {
                autoApprove: true,
                autoMerge: true,
                notify: false,
                mergeMethod: 'squash',
                deleteBranch: true
              }
            },
            {
              name: 'Zero-config: dependabot safe updates',
              description: 'Auto-approve dependabot with low risk',
              enabled: true,
              conditions: {
                authorPatterns: ['dependabot[bot]'],
                maxRiskScore: 0.3
              },
              actions: {
                autoApprove: true,
                autoMerge: true,
                notify: false,
                mergeMethod: 'squash',
                deleteBranch: true
              }
            }
          ],
          settings: {
            aiAnalysis: true,
            riskThreshold: 0.5,
            autoDeleteBranches: true,
            requireStatusChecks: true,
            allowForceUpdates: false,
            mergeQueue: {
              enabled: false,
              mode: 'lenient',
              maxConcurrent: 1,
              updateBranch: 'as_needed',
              defaultPriority: 5
            }
          }
        };
        return AutomergeConfigSchema.parse(defaults);
      }
      throw error;
    }

    throw new Error('Invalid configuration file format');
  }

  async validateConfig(config: any): Promise<{ valid: boolean; errors: string[] }> {
    try {
      AutomergeConfigSchema.parse(config);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        };
      }
      return { valid: false, errors: ['Invalid configuration format'] };
    }
  }

  mergeWithDatabaseRules(config: AutomergeConfig, databaseRules: MergeRule[]): MergeRule[] {
    const mergedRules: MergeRule[] = [];

    // Add config rules first (higher priority)
    config.rules.forEach((rule, index) => {
      mergedRules.push({
        id: `config-${index}`,
        name: rule.name,
        description: rule.description,
        enabled: rule.enabled,
        conditions: rule.conditions,
        actions: rule.actions
      });
    });

    // Add database rules that don't conflict with config rules
    databaseRules.forEach(dbRule => {
      const conflict = mergedRules.find(configRule => 
        configRule.name === dbRule.name
      );

      if (!conflict) {
        mergedRules.push(dbRule);
      }
    });

    return mergedRules;
  }

  generateExampleConfig(): string {
    const example = {
      version: '1',
      rules: [
        {
          name: 'Auto-merge documentation',
          description: 'Automatically merge documentation-only changes',
          enabled: true,
          conditions: {
            filePatterns: ['*.md', 'docs/**', '**/*.md'],
            maxRiskScore: 0.2,
            minApprovals: 0
          },
          actions: {
            autoApprove: true,
            autoMerge: true,
            notify: false,
            mergeMethod: 'squash',
            deleteBranch: true,
            priority: 7
          }
        },
        {
          name: 'Trusted authors',
          description: 'Auto-approve changes from trusted team members',
          enabled: true,
          conditions: {
            authorPatterns: ['dependabot[bot]', '@core-team/*'],
            maxRiskScore: 0.4,
            requireTests: true
          },
          actions: {
            autoApprove: true,
            autoMerge: false,
            requireReviews: 1,
            notify: true,
            priority: 5,
            rebaseBeforeMerge: true
          }
        }
      ],
      backports: {
        to: ['release/*'],
        strategy: 'cherry-pick'
      },
      notifications: {
        slack: {
          webhookUrl: 'https://hooks.slack.com/your/webhook/url',
          channels: ['#deployments'],
          events: ['auto_merged', 'high_risk_pr']
        }
      },
      settings: {
        aiAnalysis: true,
        riskThreshold: 0.5,
        autoDeleteBranches: true,
        requireStatusChecks: true,
        allowForceUpdates: false,
        mergeQueue: {
          enabled: true,
          mode: 'strict',
          maxConcurrent: 1,
          updateBranch: 'as_needed',
          defaultPriority: 5
        }
      }
    };

    return yaml.dump(example, {
      indent: 2,
      lineWidth: 100,
      noRefs: true
    });
  }
}