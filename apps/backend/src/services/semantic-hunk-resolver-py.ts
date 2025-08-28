import { SemanticHunkResolver, SemanticResolverResult } from './merge-orchestrator';

export class PythonSemanticHunkResolver implements SemanticHunkResolver {
  async tryAstThreeWay(file: { path: string; base: string; left: string; right: string }): Promise<SemanticResolverResult> {
    // Trivial merges
    if (file.left === file.base && file.right !== file.base) return { resolved: true, content: file.right, diagnostics: ['py-right-wins'] };
    if (file.right === file.base && file.left !== file.base) return { resolved: true, content: file.left, diagnostics: ['py-left-wins'] };
    if (file.left === file.right) return { resolved: true, content: file.left, diagnostics: ['py-identical'] };
    // Conservative: if only one side adds new def/class signatures, append them
    try {
      const defRegex = /^\s*(def|class)\s+\w+\s*\(/gm;
      const baseDefs = new Set((file.base.match(defRegex) || []).map(s => s.trim()));
      const leftDefs = new Set((file.left.match(defRegex) || []).map(s => s.trim()));
      const rightDefs = new Set((file.right.match(defRegex) || []).map(s => s.trim()));
      const rightNew = [...rightDefs].filter(d => !baseDefs.has(d) && !leftDefs.has(d));
      if (rightNew.length) {
        const appendSection = '\n\n' + rightNew.join('\n') + '\n';
        return { resolved: true, content: file.left + appendSection, diagnostics: ['py-append-new-defs'] };
      }
    } catch {}
    return { resolved: false, content: file.left, diagnostics: ['py-unresolved'] };
  }
}

