import { FastifyBaseLogger } from 'fastify';

export interface MergeContext {
  repo: string;
  baseSha: string;
  leftSha: string;
  rightSha: string;
  language: 'ts' | 'js' | 'py' | 'go' | 'java' | 'rb' | 'other';
  files: Array<{ path: string; base?: string; left?: string; right?: string }>;
  verifyCommands?: string[];
}

export interface MergeDecision {
  path: string;
  resolvedContent: string;
  strategy: 'ast' | 'llm' | 'manual';
  diagnostics: string[];
}

export interface MergeVerification {
  compiled: boolean;
  testsPassed: boolean;
  warnings: string[];
}

export interface MergeResult {
  decisions: MergeDecision[];
  success: boolean;
  verification: MergeVerification;
}

export interface SemanticResolverResult {
  resolved: boolean;
  content: string;
  diagnostics: string[];
}

export interface SemanticHunkResolver {
  tryAstThreeWay(
    file: { path: string; base: string; left: string; right: string },
    tools?: any
  ): Promise<SemanticResolverResult>;
}

export interface LlmHunkResolver {
  resolveConflict(
    file: { path: string; base: string; left: string; right: string },
    context: MergeContext
  ): Promise<{ content: string; diagnostics: string[] }>;
}

export interface VerificationService {
  verify(context: MergeContext, decisions: MergeDecision[]): Promise<MergeVerification>;
}

export class MergeOrchestrator {
  constructor(
    private readonly semanticResolver: SemanticHunkResolver,
    private readonly llmResolver: LlmHunkResolver,
    private readonly verifier: VerificationService,
    private readonly log?: FastifyBaseLogger
  ) {}

  async merge(context: MergeContext): Promise<MergeResult> {
    const decisions: MergeDecision[] = [];

    for (const file of context.files) {
      if (!file.left || !file.right || !file.base) continue;

      try {
        if (context.language === 'ts' || context.language === 'js') {
          const result = await this.semanticResolver.tryAstThreeWay(
            { path: file.path, base: file.base, left: file.left, right: file.right },
            undefined
          );
          if (result.resolved) {
            decisions.push({
              path: file.path,
              resolvedContent: result.content,
              strategy: 'ast',
              diagnostics: result.diagnostics
            });
            continue;
          }
        }

        const llm = await this.llmResolver.resolveConflict(
          { path: file.path, base: file.base, left: file.left, right: file.right },
          context
        );
        decisions.push({
          path: file.path,
          resolvedContent: llm.content,
          strategy: 'llm',
          diagnostics: llm.diagnostics
        });
      } catch (error: unknown) {
        this.log?.error({ err: error }, 'merge decision failed');
      }
    }

    const verification = await this.verifier.verify(context, decisions);
    const success = verification.compiled && verification.testsPassed;
    return { decisions, success, verification };
  }
}

