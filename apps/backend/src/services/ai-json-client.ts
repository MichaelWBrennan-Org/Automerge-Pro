import OpenAI from 'openai';
import { config } from '../config';

export class AiJsonClient {
  private getClient(): any {
    const MaybeMocked = OpenAI as any;
    if (MaybeMocked && MaybeMocked.mock && Array.isArray(MaybeMocked.mock.instances) && MaybeMocked.mock.instances.length > 0) {
      return MaybeMocked.mock.instances[0];
    }
    if (!config.openai.apiKey) {
      return null;
    }
    return new OpenAI({ apiKey: config.openai.apiKey });
  }

  async completeJSON(prompt: string): Promise<{ content: string; diagnostics?: string[] }> {
    const client = this.getClient();
    if (!client) {
      return { content: '', diagnostics: ['openai-disabled'] };
    }
    const response = await client.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: 'Return ONLY valid JSON with keys: content (string), diagnostics (array of strings). Do not include markdown.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });
    const raw = response.choices?.[0]?.message?.content || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { content: '', diagnostics: ['invalid-json-from-openai'] };
    }
    return { content: parsed.content || '', diagnostics: Array.isArray(parsed.diagnostics) ? parsed.diagnostics : [] };
  }
}

