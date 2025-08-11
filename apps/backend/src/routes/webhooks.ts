import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Webhooks } from '@octokit/webhooks';
import { config } from '../config';
import { featureGating } from '../services/feature-gating';

const webhooks = new Webhooks({
  secret: config.auth.githubWebhookSecret
});

const webhookPayloadSchema = z.object({
  action: z.string(),
  installation: z.object({
    id: z.number()
  }).optional(),
  repository: z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string()
  }).optional(),
  pull_request: z.object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    state: z.string(),
    user: z.object({
      id: z.number(),
      login: z.string()
    }),
    base: z.object({
      ref: z.string()
    }),
    head: z.object({
      ref: z.string()
    })
  }).optional()
});

export async function webhookRoutes(fastify: FastifyInstance) {
  // GitHub webhook endpoint
  fastify.post('/github', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-hub-signature-256'] as string;
    const event = request.headers['x-github-event'] as string;
    const delivery = request.headers['x-github-delivery'] as string;

    if (!signature || !event || !delivery) {
      return reply.status(400).send({ error: 'Missing required headers' });
    }

    try {
      // Verify webhook signature
      const payload = JSON.stringify(request.body);
      const isValid = await webhooks.verify(payload, signature);
      
      if (!isValid) {
        return reply.status(401).send({ error: 'Invalid signature' });
      }

      // Store webhook event for processing
      await request.prisma.webhookEvent.create({
        data: {
          githubId: delivery,
          event,
          payload: request.body as any,
          processed: false
        }
      });

      // Process webhook based on event type
      switch (event) {
        case 'pull_request':
          await handlePullRequestEvent(request.body as any, request);
          break;
        case 'pull_request_review':
          await handlePullRequestReviewEvent(request.body as any, request);
          break;
        case 'installation':
          await handleInstallationEvent(request.body as any, request);
          break;
      case 'installation_repositories':
          await handleInstallationRepositoriesEvent(request.body as any, request);
          break;
        case 'check_suite':
          await handleCheckSuiteEvent(request.body as any, request);
          break;
        case 'check_run':
          await handleCheckRunEvent(request.body as any, request);
          break;
      }

      return reply.status(200).send({ status: 'ok' });
    } catch (error) {
      request.log.error('Webhook processing error:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}

async function handlePullRequestEvent(payload: any, request: FastifyRequest) {
  const { action, installation, repository, pull_request } = payload;

  if (!installation || !repository || !pull_request) {
    return;
  }

  // Find or create user
  let user = await request.prisma.user.findUnique({
    where: { githubId: pull_request.user.id.toString() }
  });

  if (!user) {
    user = await request.prisma.user.create({
      data: {
        githubId: pull_request.user.id.toString(),
        login: pull_request.user.login,
        name: pull_request.user.name,
        avatarUrl: pull_request.user.avatar_url
      }
    });
  }

  // Find repository
  const repo = await request.prisma.repository.findUnique({
    where: { githubId: repository.id.toString() }
  });

  if (!repo) {
    request.log.warn(`Repository ${repository.full_name} not found in database`);
    return;
  }

  // Create or update pull request
  const prData = {
    githubId: pull_request.id.toString(),
    repositoryId: repo.id,
    number: pull_request.number,
    title: pull_request.title,
    body: pull_request.body,
    state: pull_request.state.toUpperCase(),
    authorId: user.id,
    baseBranch: pull_request.base.ref,
    headBranch: pull_request.head.ref,
    mergeable: pull_request.mergeable,
    updatedAt: new Date()
  };

  let pr = await request.prisma.pullRequest.findUnique({
    where: { githubId: pull_request.id.toString() }
  });

  if (pr) {
    pr = await request.prisma.pullRequest.update({
      where: { id: pr.id },
      data: prData
    });
  } else {
    pr = await request.prisma.pullRequest.create({
      data: {
        ...prData,
        createdAt: new Date()
      }
    });
  }

  // Add to processing queue
  const app = request.server as any;
  const queues = app.queues;
  if (queues?.prQueue) {
    await queues.prQueue.add('process-pr', {
      pullRequestId: pr.id,
      installationId: installation.id.toString(),
      repositoryId: repo.id,
      action,
      metadata: { event: 'pull_request' }
    });
  }
}

async function handlePullRequestReviewEvent(payload: any, request: FastifyRequest) {
  const { action, installation, repository, pull_request, review } = payload;

  if (!review || !pull_request) {
    return;
  }

  const pr = await request.prisma.pullRequest.findUnique({
    where: { githubId: pull_request.id.toString() }
  });

  if (!pr) {
    return;
  }

  // Create or update review
  await request.prisma.pRReview.upsert({
    where: { githubId: review.id.toString() },
    create: {
      githubId: review.id.toString(),
      pullRequestId: pr.id,
      reviewerId: review.user.id.toString(),
      state: review.state.toUpperCase(),
      body: review.body,
      submittedAt: new Date(review.submitted_at)
    },
    update: {
      state: review.state.toUpperCase(),
      body: review.body,
      submittedAt: new Date(review.submitted_at)
    }
  });

  // Trigger auto-merge check if approved
  if (review.state === 'approved') {
    const app = request.server as any;
    const queues = app.queues;
    if (queues?.prQueue) {
      await queues.prQueue.add('process-pr', {
        pullRequestId: pr.id,
        installationId: installation.id.toString(),
        repositoryId: pr.repositoryId,
        action: 'approved',
        metadata: { event: 'pull_request_review' }
      });
    }
  }
}

async function handleInstallationEvent(payload: any, request: FastifyRequest) {
  const { action, installation, repositories } = payload;

  if (action === 'created') {
    // Create new installation
    await request.prisma.installation.create({
      data: {
        githubId: installation.id.toString(),
        organizationId: installation.account.id.toString(), // This should be mapped to org
        repositoryCount: repositories?.length || 0
      }
    });
  } else if (action === 'deleted') {
    // Mark installation as suspended
    await request.prisma.installation.update({
      where: { githubId: installation.id.toString() },
      data: { suspendedAt: new Date() }
    });
  }
}

async function handleInstallationRepositoriesEvent(payload: any, request: FastifyRequest) {
  const { action, installation, repositories_added, repositories_removed } = payload;

  const installationRecord = await request.prisma.installation.findUnique({
    where: { githubId: installation.id.toString() }
  });

  if (!installationRecord) {
    return;
  }

  if (action === 'added' && repositories_added) {
    for (const repo of repositories_added) {
      await request.prisma.repository.create({
        data: {
          githubId: repo.id.toString(),
          installationId: installationRecord.id,
          name: repo.name,
          fullName: repo.full_name,
          private: repo.private,
          defaultBranch: repo.default_branch || 'main'
        }
      });
    }
  }

  if (action === 'removed' && repositories_removed) {
    for (const repo of repositories_removed) {
      await request.prisma.repository.delete({
        where: { githubId: repo.id.toString() }
      });
    }
  }

  // Update repository count
  const count = await request.prisma.repository.count({
    where: { installationId: installationRecord.id }
  });

  await request.prisma.installation.update({
    where: { id: installationRecord.id },
    data: { repositoryCount: count }
  });

  // Enforce plan limits after repository changes
  const installationWithOrg = await request.prisma.installation.findUnique({
    where: { id: installationRecord.id }
  });

  if (installationWithOrg) {
    await featureGating.enforceRepositoryLimit(installationWithOrg.organizationId);
  }
}

async function handleCheckSuiteEvent(payload: any, request: FastifyRequest) {
  const { action, check_suite, repository } = payload;

  if (!check_suite || !repository) {
    return;
  }

  // Find pull requests associated with this check suite
  const pullRequests = check_suite.pull_requests || [];
  
  for (const pr of pullRequests) {
    const existingPR = await request.prisma.pullRequest.findUnique({
      where: { githubId: pr.id.toString() }
    });

    if (existingPR) {
      // Update or create check record
      await request.prisma.pRCheck.upsert({
        where: { githubId: check_suite.id.toString() },
        create: {
          githubId: check_suite.id.toString(),
          pullRequestId: existingPR.id,
          name: check_suite.app?.name || 'Unknown',
          conclusion: check_suite.conclusion?.toUpperCase() || null,
          status: check_suite.status,
          detailsUrl: check_suite.details_url,
          completedAt: check_suite.completed_at ? new Date(check_suite.completed_at) : null
        },
        update: {
          conclusion: check_suite.conclusion?.toUpperCase() || null,
          status: check_suite.status,
          completedAt: check_suite.completed_at ? new Date(check_suite.completed_at) : null
        }
      });

      // Trigger processing if check suite completed
      if (action === 'completed' && check_suite.conclusion) {
        const app = request.server as any;
        const queues = app.queues;
        if (queues?.prQueue) {
          await queues.prQueue.add('process-pr', {
            pullRequestId: existingPR.id,
            repositoryId: existingPR.repositoryId,
            action: 'checks_completed',
            metadata: { event: 'check_suite', conclusion: check_suite.conclusion }
          });
        }
      }
    }
  }
}

async function handleCheckRunEvent(payload: any, request: FastifyRequest) {
  const { action, check_run, repository } = payload;

  if (!check_run || !repository) {
    return;
  }

  // Find pull requests associated with this check run
  const pullRequests = check_run.pull_requests || [];
  
  for (const pr of pullRequests) {
    const existingPR = await request.prisma.pullRequest.findUnique({
      where: { githubId: pr.id.toString() }
    });

    if (existingPR) {
      // Update or create check record
      await request.prisma.pRCheck.upsert({
        where: { githubId: check_run.id.toString() },
        create: {
          githubId: check_run.id.toString(),
          pullRequestId: existingPR.id,
          name: check_run.name,
          conclusion: check_run.conclusion?.toUpperCase() || null,
          status: check_run.status,
          detailsUrl: check_run.details_url,
          completedAt: check_run.completed_at ? new Date(check_run.completed_at) : null
        },
        update: {
          conclusion: check_run.conclusion?.toUpperCase() || null,
          status: check_run.status,
          completedAt: check_run.completed_at ? new Date(check_run.completed_at) : null
        }
      });

      // Trigger processing if check run completed  
      if (action === 'completed' && check_run.conclusion) {
        const app = request.server as any;
        const queues = app.queues;
        if (queues?.prQueue) {
          await queues.prQueue.add('process-pr', {
            pullRequestId: existingPR.id,
            repositoryId: existingPR.repositoryId,
            action: 'checks_completed',
            metadata: { event: 'check_run', conclusion: check_run.conclusion }
          });
        }
      }
    }
  }
}