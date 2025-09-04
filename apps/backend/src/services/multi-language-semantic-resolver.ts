import { SemanticHunkResolver, SemanticResolverResult } from './merge-orchestrator';
import { TypeScriptSemanticHunkResolver } from './semantic-hunk-resolver';
import { PythonSemanticHunkResolver } from './semantic-hunk-resolver-py';
import { GoSemanticHunkResolver } from './semantic-hunk-resolver-go';
import { JavaSemanticHunkResolver } from './semantic-hunk-resolver-java';

function getExtension(filePath: string): string {
  const idx = filePath.lastIndexOf('.');
  return idx >= 0 ? filePath.slice(idx).toLowerCase() : '';
}

export class MultiLanguageSemanticHunkResolver implements SemanticHunkResolver {
  private readonly tsResolver = new TypeScriptSemanticHunkResolver();
  private readonly pyResolver = new PythonSemanticHunkResolver();
  private readonly goResolver = new GoSemanticHunkResolver();
  private readonly javaResolver = new JavaSemanticHunkResolver();

  async tryAstThreeWay(
    file: { path: string; base: string; left: string; right: string },
    _tools?: any
  ): Promise<SemanticResolverResult> {
    const ext = getExtension(file.path);

    // Route to language-specific resolvers. Treat .js/.jsx like TS for conservative merges.
    if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
      return this.tsResolver.tryAstThreeWay(file, _tools);
    }
    if (ext === '.py') {
      return this.pyResolver.tryAstThreeWay(file);
    }
    if (ext === '.go') {
      return this.goResolver.tryAstThreeWay(file);
    }
    if (ext === '.java') {
      return this.javaResolver.tryAstThreeWay(file);
    }

    return { resolved: false, content: file.left, diagnostics: ['unsupported-language'] };
  }
}

