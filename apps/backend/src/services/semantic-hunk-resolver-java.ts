import { SemanticHunkResolver, SemanticResolverResult } from './merge-orchestrator';

export class JavaSemanticHunkResolver implements SemanticHunkResolver {
  async tryAstThreeWay(file: { path: string; base: string; left: string; right: string }): Promise<SemanticResolverResult> {
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

