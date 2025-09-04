import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MergeOrchestrator } from '../services/merge-orchestrator';
import { MultiLanguageSemanticHunkResolver } from '../services/multi-language-semantic-resolver';
import { OpenAiLlmHunkResolver } from '../services/llm-hunk-resolver';
import { VerificationService } from '../services/verification-service';
import { PolicyEngine } from '../services/policy-engine';
import { githubService } from '../services/github';
import { buildMergeContext } from '../services/diff-context';
import { AiJsonClient } from '../services/ai-json-client';
import { CheckRunService } from '../services/check-run';

export async function mergeRoutes(fastify: FastifyInstance) {
  fastify.post('/merge/:owner/:repo/:pr/dry-run', async (
    request: FastifyRequest<{ Params: { owner: string; repo: string; pr: string }; Body?: { installationId?: string } }>,
    reply: FastifyReply
  ) => {
    const { owner, repo, pr } = request.params;
    const installationId = (request.body as any)?.installationId || request.headers['x-installation-id'];
    if (!installationId) {
      return reply.status(400).send({ error: 'installationId required (body or X-Installation-Id header)' });
    }

    // Fetch PR and files to build a realistic merge context
    const octokit = await githubService.getInstallationClient(String(installationId));
    const { data: prData } = await (octokit.pulls as any).get({ owner, repo, pull_number: parseInt(pr, 10) });
    const { data: files } = await (octokit.pulls as any).listFiles({ owner, repo, pull_number: parseInt(pr, 10) });
    const context = await buildMergeContext(octokit as any, `${owner}/${repo}`, prData.base.sha, prData.head.sha, files);

    const policy = new PolicyEngine();
    const decision = await policy.evaluate({ orgId: 'unknown-org', repo: `${owner}/${repo}`, prNumber: parseInt(pr, 10), labels: [] });
    if (!decision.allow) {
      return reply.status(403).send({ error: 'Policy denied', reasons: decision.reasons });
    }

    const orchestrator = new MergeOrchestrator(
      new MultiLanguageSemanticHunkResolver(),
      new OpenAiLlmHunkResolver(new AiJsonClient()),
      new VerificationService(),
      fastify.log
    );

    const result = await orchestrator.merge(context);
    if ((fastify as any).auditLog) {
      await (fastify as any).auditLog('unknown-org', `${owner}/${repo}`, parseInt(pr, 10), 'MERGE_DRY_RUN', result);
    }
    return reply.send(result);
  });

  fastify.post('/merge/:owner/:repo/:pr/attempt', async (
    request: FastifyRequest<{ Params: { owner: string; repo: string; pr: string }; Body?: { installationId?: string } }>,
    reply: FastifyReply
  ) => {
    const { owner, repo, pr } = request.params;
    const installationId = (request.body as any)?.installationId || request.headers['x-installation-id'];
    if (!installationId) {
      return reply.status(400).send({ error: 'installationId required (body or X-Installation-Id header)' });
    }

    try {
      const octokit = await githubService.getInstallationClient(String(installationId));
      const check = new CheckRunService(octokit as any);
      const { data: prData } = await (octokit.pulls as any).get({ owner, repo, pull_number: parseInt(pr, 10) });
      const headSha = prData.head.sha;
      await check.createOrUpdate({ owner, repo, headSha, name: 'Automerge-Pro Attempt', status: 'in_progress', summary: 'Attempting auto-merge now' });

      // Enqueue job for attempt merge via queue to reuse logic
      const app: any = fastify as any;
      const queues = app.queues;
      if (queues?.prQueue) {
        await queues.prQueue.add('process-pr', {
          pullRequestId: prData.id,
          installationId: String(installationId),
          repositoryId: undefined,
          action: 'attempt_merge',
          metadata: { reason: 'manual-trigger' }
        });
      }

      await check.createOrUpdate({ owner, repo, headSha, name: 'Automerge-Pro Attempt', status: 'completed', conclusion: 'neutral', summary: 'Enqueued merge attempt' });
      return reply.send({ enqueued: true });
    } catch (e: any) {
      return reply.status(500).send({ error: e?.message || 'merge attempt failed' });
    }
  });
}

