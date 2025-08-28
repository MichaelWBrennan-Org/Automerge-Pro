import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MergeOrchestrator } from '../services/merge-orchestrator';
import { TypeScriptSemanticHunkResolver } from '../services/semantic-hunk-resolver';
import { OpenAiLlmHunkResolver } from '../services/llm-hunk-resolver';
import { VerificationService } from '../services/verification-service';
import { PolicyEngine } from '../services/policy-engine';

export async function mergeRoutes(fastify: FastifyInstance) {
  fastify.post('/merge/:owner/:repo/:pr/dry-run', async (
    request: FastifyRequest<{ Params: { owner: string; repo: string; pr: string } }>,
    reply: FastifyReply
  ) => {
    const { owner, repo, pr } = request.params;

    // Placeholder: in real impl, fetch base/left/right and file contents via GitHub API
    const context = {
      repo: `${owner}/${repo}`,
      baseSha: 'BASE_SHA',
      leftSha: 'LEFT_SHA',
      rightSha: 'RIGHT_SHA',
      language: 'ts' as const,
      files: [] as any[]
    };

    const policy = new PolicyEngine();
    const decision = await policy.evaluate({ orgId: 'unknown-org', repo: `${owner}/${repo}`, prNumber: parseInt(pr, 10), labels: [] });
    if (!decision.allow) {
      return reply.status(403).send({ error: 'Policy denied', reasons: decision.reasons });
    }

    const orchestrator = new MergeOrchestrator(
      new TypeScriptSemanticHunkResolver(),
      new OpenAiLlmHunkResolver({ completeJSON: async () => ({ content: '', diagnostics: [] }) }),
      new VerificationService(),
      fastify.log
    );

    const result = await orchestrator.merge(context);
    await fastify.auditLog('unknown-org', `${owner}/${repo}`, parseInt(pr, 10), 'MERGE_DRY_RUN', result);
    return reply.send(result);
  });
}

