import { SemanticHunkResolver, SemanticResolverResult } from './merge-orchestrator';
import { AstMergeServiceClient } from './ast-merge-service';

export class GoSemanticHunkResolver implements SemanticHunkResolver {
  private svc = new AstMergeServiceClient(process.env.AST_MERGE_SERVICE_URL);
  async tryAstThreeWay(file: { path: string; base: string; left: string; right: string }): Promise<SemanticResolverResult> {
    const svc = await this.svc.resolve({ ...file, language: 'go' });
    if (svc.content) return { resolved: true, content: svc.content, diagnostics: svc.diagnostics || ['go-ast-service'] };
    if (file.left === file.base && file.right !== file.base) return { resolved: true, content: file.right, diagnostics: ['go-right-wins'] };
    if (file.right === file.base && file.left !== file.base) return { resolved: true, content: file.left, diagnostics: ['go-left-wins'] };
    if (file.left === file.right) return { resolved: true, content: file.left, diagnostics: ['go-identical'] };
    try {
      const funcRegex = /^func\s+\w+\s*\(/gm;
      const baseSet = new Set((file.base.match(funcRegex) || []));
      const leftSet = new Set((file.left.match(funcRegex) || []));
      const rightSet = new Set((file.right.match(funcRegex) || []));
      const rightNew = [...rightSet].filter(d => !baseSet.has(d) && !leftSet.has(d));
      if (rightNew.length) {
        return { resolved: true, content: file.left + '\n\n' + rightNew.join('\n') + '\n', diagnostics: ['go-append-new-funcs'] };
      }
    } catch {}
    return { resolved: false, content: file.left, diagnostics: ['go-unresolved'] };
  }
}

