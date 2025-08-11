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
      deleteBranch: z.boolean().optional()
    })
  })).default([]),
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
    allowForceUpdates: z.boolean().default(false)
  }).optional()
});

export type AutomergeConfig = z.infer<typeof AutomergeConfigSchema>;

export class ConfigurationService {
  constructor(private octokit: Octokit) {}

  async loadRepositoryConfig(owner: string, repo: string): Promise<AutomergeConfig> {
    try {
      const { data } = await this.octokit.repos.getContent({
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
        // No config file found, return defaults
        return AutomergeConfigSchema.parse({});
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
            deleteBranch: true
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
            notify: true
          }
        }
      ],
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
        allowForceUpdates: false
      }
    };

    return yaml.dump(example, {
      indent: 2,
      lineWidth: 100,
      noRefs: true
    });
  }
}