import { SemanticHunkResolver, SemanticResolverResult } from './merge-orchestrator';

export class TypeScriptSemanticHunkResolver implements SemanticHunkResolver {
  async tryAstThreeWay(
    file: { path: string; base: string; left: string; right: string },
    _tools?: any
  ): Promise<SemanticResolverResult> {
    // Trivial strategies before heavy AST work:
    // 1) If one side equals base, take the other side.
    if (file.left === file.base && file.right !== file.base) {
      return { resolved: true, content: file.right, diagnostics: ['right-wins (left==base)'] };
    }
    if (file.right === file.base && file.left !== file.base) {
      return { resolved: true, content: file.left, diagnostics: ['left-wins (right==base)'] };
    }

    // 2) If both sides are identical, take either.
    if (file.left === file.right) {
      return { resolved: true, content: file.left, diagnostics: ['identical-sides'] };
    }

    // 3) If both only append to base (line-wise heuristic), concatenate unique additions.
    try {
      const baseLines = new Set(file.base.split('\n'));
      const leftLines = file.left.split('\n');
      const rightLines = file.right.split('\n');
      const leftAdds = leftLines.filter(l => !baseLines.has(l));
      const rightAdds = rightLines.filter(l => !baseLines.has(l));
      if (leftAdds.length && rightAdds.length) {
        const merged = file.base + '\n' + [...leftAdds, ...rightAdds].join('\n');
        return { resolved: true, content: merged, diagnostics: ['append-merge'] };
      }
    } catch {}

    return { resolved: false, content: file.left, diagnostics: ['unresolved'] };
  }
}

