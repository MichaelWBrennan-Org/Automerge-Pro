import { SemanticHunkResolver, SemanticResolverResult } from './merge-orchestrator';

export class JavaSemanticHunkResolver implements SemanticHunkResolver {
  async tryAstThreeWay(file: { path: string; base: string; left: string; right: string }): Promise<SemanticResolverResult> {
    if (file.left === file.base && file.right !== file.base) return { resolved: true, content: file.right, diagnostics: ['java-right-wins'] };
    if (file.right === file.base && file.left !== file.base) return { resolved: true, content: file.left, diagnostics: ['java-left-wins'] };
    if (file.left === file.right) return { resolved: true, content: file.left, diagnostics: ['java-identical'] };
    return { resolved: false, content: file.left, diagnostics: ['java-unresolved'] };
  }
}

