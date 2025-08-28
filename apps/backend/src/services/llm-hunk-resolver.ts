import { LlmHunkResolver, MergeContext } from './merge-orchestrator';

export class OpenAiLlmHunkResolver implements LlmHunkResolver {
  constructor(private readonly ai: { completeJSON: (prompt: string) => Promise<any> }) {}

  async resolveConflict(
    file: { path: string; base: string; left: string; right: string },
    _context: MergeContext
  ): Promise<{ content: string; diagnostics: string[] }> {
    const prompt = [
      'You are a deterministic merge resolver. Return ONLY JSON with fields: content, diagnostics.',
      'Constraints:',
      '- Preserve unrelated lines and formatting.',
      '- Keep licensing headers.',
      '- Do not introduce new dependencies.',
      '- If two edits clash, compose both behaviors if possible.',
      `PATH: ${file.path}`,
      'BASE:\n' + file.base,
      'LEFT:\n' + file.left,
      'RIGHT:\n' + file.right
    ].join('\n\n');

    try {
      const { content, diagnostics } = await this.ai.completeJSON(prompt);
      return { content, diagnostics: diagnostics ?? [] };
    } catch (error) {
      return { content: file.left, diagnostics: ['LLM resolution failed'] };
    }
  }
}

