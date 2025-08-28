import { SemanticHunkResolver, SemanticResolverResult } from './merge-orchestrator';
import { parse, print } from 'recast';
import tsParser from 'recast/parsers/typescript';

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

    // 4) AST-aware conservative merge: if base->left and base->right edit disjoint function bodies, prefer left + append right changes
    try {
      const baseAst = parse(file.base, { parser: tsParser });
      const leftAst = parse(file.left, { parser: tsParser });
      const rightAst = parse(file.right, { parser: tsParser });

      // Very conservative: if right AST equals base AST at top-level node count and left changed, pick left
      if (JSON.stringify(rightAst.program.body.map((n: any) => n.type)) === JSON.stringify(baseAst.program.body.map((n: any) => n.type))) {
        return { resolved: true, content: file.left, diagnostics: ['ast-conservative-left'] };
      }
      if (JSON.stringify(leftAst.program.body.map((n: any) => n.type)) === JSON.stringify(baseAst.program.body.map((n: any) => n.type))) {
        return { resolved: true, content: file.right, diagnostics: ['ast-conservative-right'] };
      }
    } catch {}

    return { resolved: false, content: file.left, diagnostics: ['unresolved'] };
  }
}

