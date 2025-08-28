import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { Octokit } from '@octokit/rest';
import OpenAI from 'openai';
import { analyzeNextFilesPullRequest } from './ai-analyzer';
import { notificationService } from './notification';
import { githubService } from './github';
import { config } from '../config';
import { MergeOrchestrator } from './merge-orchestrator';
import { TypeScriptSemanticHunkResolver } from './semantic-hunk-resolver';
import { PythonSemanticHunkResolver } from './semantic-hunk-resolver-py';
import { GoSemanticHunkResolver } from './semantic-hunk-resolver-go';
import { JavaSemanticHunkResolver } from './semantic-hunk-resolver-java';
import { OpenAiLlmHunkResolver } from './llm-hunk-resolver';
import { VerificationService } from './verification-service';
import { PolicyEngine } from './policy-engine';
import { eventBus } from './event-bus';
import { CheckRunService } from './check-run';

export interface QueueJob {
  pullRequestId: string;
  installationId: string;
  repositoryId: string;
  action: string;
  metadata?: Record<string, any>;
}

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: config.openai.apiKey });

export function setupQueues(redis: Redis) {
  // Queue for processing pull request events
  const prQueue = new Queue('pr-processing', {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      delay: 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    }
  });

  // Queue for AI analysis
  const aiQueue = new Queue('ai-analysis', {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 25,
      delay: 1000, // Small delay to batch requests
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    }
  });

  // Queue for notifications
  const notificationQueue = new Queue('notifications', {
    connection: redis,
    defaultJobOptions: {
      removeOnComplete: 200,
      removeOnFail: 50,
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    }
  });

  // Workers
  const prWorker = new Worker('pr-processing', async (job: Job<QueueJob>) => {
    const { pullRequestId, installationId, action, metadata } = job.data;
    
    try {
      const pr = await prisma.pullRequest.findUnique({
        where: { id: pullRequestId },
        include: {
          repository: {
            include: {
              installation: {
                include: {
                  organization: true
                }
              }
            }
          },
          author: true
        }
      });

      if (!pr) {
        throw new Error(`Pull request ${pullRequestId} not found`);
      }

      const octokit = await githubService.getInstallationClient(installationId);
      const checkRun = new CheckRunService(octokit as any);
      
      switch (action) {
        case 'opened':
        case 'synchronize':
          // Trigger AI analysis
          await aiQueue.add('analyze-pr', {
            pullRequestId,
            installationId,
            repositoryId: pr.repositoryId
          });
          // Auto-merge decision will occur post-analysis
          break;
          
        case 'review_requested':
          // Check if auto-approval rules apply
          await checkAutoApprovalRules(pr, octokit);
          break;
          
        case 'approved':
          // Check if we can auto-merge
          await checkAutoMerge(pr, octokit);
          await attemptAutoMerge(pr, installationId, octokit);
          break;
      }

      await prisma.pRActivity.create({
        data: {
          pullRequestId,
          type: 'RULE_APPLIED',
          description: `Processed ${action} event`,
          metadata
        }
      });

    } catch (error) {
      console.error(`Error processing PR job ${job.id}:`, error);
      throw error;
    }
  }, { connection: redis, concurrency: 5 });

  const aiWorker = new Worker('ai-analysis', async (job: Job<QueueJob>) => {
    const { pullRequestId, installationId } = job.data;
    
    try {
      const pr = await prisma.pullRequest.findUnique({
        where: { id: pullRequestId },
        include: {
          repository: true,
          author: true
        }
      });

      if (!pr) {
        throw new Error(`Pull request ${pullRequestId} not found`);
      }

      const octokit = await githubService.getInstallationClient(installationId);
      const checkRun = new CheckRunService(octokit as any);
      
      // Get PR diff and files
      const { data: prData } = await octokit.pulls.get({
        owner: pr.repository.fullName.split('/')[0],
        repo: pr.repository.fullName.split('/')[1],
        pull_number: pr.number
      });
      const headSha = prData.head.sha;
      const checkRun = new CheckRunService(octokit as any);
      await checkRun.createOrUpdate({ owner: pr.repository.fullName.split('/')[0], repo: pr.repository.fullName.split('/')[1], headSha, name: 'Automerge-Pro Orchestrator', status: 'in_progress', summary: 'Running AI analysis and merge dry-run' });

      const { data: files } = await octokit.pulls.listFiles({
        owner: pr.repository.fullName.split('/')[0],
        repo: pr.repository.fullName.split('/')[1],
        pull_number: pr.number
      });

      // Analyze with AI
      const analysis = await analyzeNextFilesPullRequest({
        title: pr.title,
        body: pr.body || '',
        files: files.map(f => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch || ''
        })),
        author: pr.author.login,
        baseBranch: pr.baseBranch,
        headBranch: pr.headBranch
      });

      // Update PR with analysis
      await prisma.pullRequest.update({
        where: { id: pullRequestId },
        data: {
          riskScore: analysis.riskScore,
          aiAnalysis: analysis
        }
      });

      // If high risk, send notification
      if (analysis.riskScore > 0.7) {
        await notificationQueue.add('high-risk-pr', {
          pullRequestId,
          riskScore: analysis.riskScore,
          concerns: analysis.concerns
        });
      }

      await prisma.pRActivity.create({
        data: {
          pullRequestId,
          type: 'AI_ANALYZED',
          description: `AI analysis completed with risk score ${analysis.riskScore}`,
          metadata: { riskScore: analysis.riskScore }
        }
      });

      // After analysis, attempt auto merge silently if conditions likely met
      const attempt = await attemptAutoMerge(pr, installationId, octokit);
      const conclusion = attempt?.merged ? 'success' : 'neutral';
      await checkRun.createOrUpdate({ owner: pr.repository.fullName.split('/')[0], repo: pr.repository.fullName.split('/')[1], headSha, name: 'Automerge-Pro Orchestrator', status: 'completed', conclusion: conclusion as any, summary: attempt?.summary || 'Analysis complete' });

    } catch (error) {
      console.error(`Error in AI analysis job ${job.id}:`, error);
      throw error;
    }
  }, { connection: redis, concurrency: 3 });

  const notificationWorker = new Worker('notifications', async (job: Job) => {
    try {
      await notificationService.sendNotification(job.data);
    } catch (error) {
      console.error(`Error sending notification ${job.id}:`, error);
      throw error;
    }
  }, { connection: redis, concurrency: 10 });

  return {
    prQueue,
    aiQueue,
    notificationQueue,
    workers: [prWorker, aiWorker, notificationWorker]
  };
}

async function checkAutoApprovalRules(pr: any, octokit: Octokit) {
  // Implementation for checking auto-approval rules
  const rules = await prisma.mergeRule.findMany({
    where: {
      OR: [
        { repositoryId: pr.repositoryId },
        { repositoryId: null, organizationId: pr.repository.installation.organizationId }
      ],
      enabled: true
    },
    orderBy: { priority: 'desc' }
  });

  // Apply rules logic here
  for (const rule of rules) {
    // Check conditions and apply actions
  }
}

async function checkAutoMerge(pr: any, octokit: Octokit) {
  // Implementation for checking if PR can be auto-merged
  if (!pr.autoMergeEnabled) return;

  // Check all required conditions are met
  const checks = await prisma.pRCheck.findMany({
    where: { pullRequestId: pr.id }
  });

  const allChecksPass = checks.every((check: any) => 
    check.conclusion === 'SUCCESS' || check.conclusion === 'NEUTRAL'
  );

  if (allChecksPass && pr.riskScore <= 0.3) {
    // Auto-merge the PR
    await octokit.pulls.merge({
      owner: pr.repository.fullName.split('/')[0],
      repo: pr.repository.fullName.split('/')[1],
      pull_number: pr.number,
      merge_method: 'squash'
    });

    await prisma.pullRequest.update({
      where: { id: pr.id },
      data: {
        state: 'MERGED',
        mergedAt: new Date()
      }
    });
  }
}

async function attemptAutoMerge(pr: any, installationId: string, octokit: Octokit) {
  try {
    // Quick checks: must be open, low risk, and checks passing
    if (pr.state !== 'OPEN') return;

    const checks = await prisma.pRCheck.findMany({ where: { pullRequestId: pr.id } });
    const allChecksPass = checks.every((c: any) => c.conclusion === 'SUCCESS' || c.conclusion === 'NEUTRAL');

    // Build merge context from GitHub PR files
    const { data: files } = await octokit.pulls.listFiles({
      owner: pr.repository.fullName.split('/')[0],
      repo: pr.repository.fullName.split('/')[1],
      pull_number: pr.number
    });

    const mergeContext = {
      repo: pr.repository.fullName,
      baseSha: pr.baseBranch,
      leftSha: pr.baseBranch,
      rightSha: pr.headBranch,
      language: 'ts' as const,
      files: [] as any[] // Future: fetch base/left/right file contents
    };

    const orchestrator = new MergeOrchestrator(
      new TypeScriptSemanticHunkResolver(),
      new OpenAiLlmHunkResolver({ completeJSON: async () => ({ content: '', diagnostics: [] }) }),
      new VerificationService()
    );

    const policy = new PolicyEngine(process.env.OPA_URL);
    const decision = await policy.evaluate({ orgId: pr.repository.installation.organizationId, repo: pr.repository.fullName, prNumber: pr.number, labels: [] });
    if (!decision.allow) return;

    // Heuristic: allow auto-merge if docs-only or dependabot with low risk
    const docsOnly = files.length > 0 && files.every((f: any) => f.filename.endsWith('.md') || f.filename.includes('docs/'));
    const dependabot = pr.author.login === 'dependabot[bot]';
    const lowRisk = (pr.riskScore ?? 0.2) <= 0.3;

    if (allChecksPass && (docsOnly || (dependabot && lowRisk))) {
      const result = await orchestrator.merge(mergeContext);
      await eventBus.emit({ type: 'MERGE_DECISIONED', orgId: pr.repository.installation.organizationId, repo: pr.repository.fullName, prNumber: pr.number, payload: result });

      if (result.success) {
        await octokit.pulls.merge({
          owner: pr.repository.fullName.split('/')[0],
          repo: pr.repository.fullName.split('/')[1],
          pull_number: pr.number,
          merge_method: 'squash'
        });

        await prisma.pullRequest.update({ where: { id: pr.id }, data: { state: 'MERGED', mergedAt: new Date() } });
        await eventBus.emit({ type: 'VERIFICATION_COMPLETED', orgId: pr.repository.installation.organizationId, repo: pr.repository.fullName, prNumber: pr.number, payload: { success: true } });
      }
    }
  } catch (error) {
    console.error('attemptAutoMerge error', error);
  }
}