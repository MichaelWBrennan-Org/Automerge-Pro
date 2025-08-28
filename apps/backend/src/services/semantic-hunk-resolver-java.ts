import { SemanticHunkResolver, SemanticResolverResult } from './merge-orchestrator';
import { AstMergeServiceClient } from './ast-merge-service';

export class JavaSemanticHunkResolver implements SemanticHunkResolver {
  private svc = new AstMergeServiceClient(process.env.AST_MERGE_SERVICE_URL);
  async tryAstThreeWay(file: { path: string; base: string; left: string; right: string }): Promise<SemanticResolverResult> {
    const svc = await this.svc.resolve({ ...file, language: 'java' });
    if (svc.content) return { resolved: true, content: svc.content, diagnostics: svc.diagnostics || ['java-ast-service'] };
    if (file.left === file.base && file.right !== file.base) return { resolved: true, content: file.right, diagnostics: ['java-right-wins'] };
    if (file.right === file.base && file.left !== file.base) return { resolved: true, content: file.left, diagnostics: ['java-left-wins'] };
    if (file.left === file.right) return { resolved: true, content: file.left, diagnostics: ['java-identical'] };
    try {
      const methodRegex = /\b(public|protected|private|static|\s)+\s+[\w\<\>\[\]]+\s+(\w+)\s*\([^)]*\)\s*\{/gm;
      const baseSet = new Set((file.base.match(methodRegex) || []));
      const leftSet = new Set((file.left.match(methodRegex) || []));
      const rightSet = new Set((file.right.match(methodRegex) || []));
      const rightNew = [...rightSet].filter(d => !baseSet.has(d) && !leftSet.has(d));
      if (rightNew.length) {
        return { resolved: true, content: file.left + '\n\n' + rightNew.join('\n') + '\n', diagnostics: ['java-append-new-methods'] };
      }
    } catch {}
    return { resolved: false, content: file.left, diagnostics: ['java-unresolved'] };
  }
}

