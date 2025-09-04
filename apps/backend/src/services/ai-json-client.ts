import { config } from '../config';

export class AiJsonClient {

  async completeJSON(prompt: string): Promise<{ content: string; diagnostics?: string[] }> {
    // Prefer Groq if configured (free tier) for cost efficiency
    if (config.groq?.apiKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${config.groq.apiKey}`
          },
          body: JSON.stringify({
            model: config.groq.model,
            messages: [
              { role: 'system', content: 'Return ONLY valid JSON with keys: content (string), diagnostics (array of strings). Do not include markdown.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0,
            response_format: { type: 'json_object' }
          })
        } as any);
        const json: any = await res.json();
        const raw = json?.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(raw);
        return { content: parsed.content || '', diagnostics: Array.isArray(parsed.diagnostics) ? parsed.diagnostics : [] };
      } catch (e) {
        // fall through to next provider
      }
    }

    // Hugging Face Inference API fallback (free tier with API key)
    if (config.huggingface?.apiKey) {
      try {
        const completion = await fetch('https://api-inference.huggingface.co/models/' + encodeURIComponent(config.huggingface.model), {
          method: 'POST',
          headers: {
            'authorization': `Bearer ${config.huggingface.apiKey}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            inputs: `You are a deterministic merge resolver. Return ONLY strict JSON with keys: content (string), diagnostics (array of strings).\n\n${prompt}`,
            parameters: { max_new_tokens: 1024, temperature: 0 }
          })
        } as any);
        const data: any = await completion.json();
        const text: string = Array.isArray(data) ? (data[0]?.generated_text || '') : (data?.generated_text || data?.[0]?.generated_text || '');
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        const slice = jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : '{}';
        const parsed = JSON.parse(slice);
        return { content: parsed.content || '', diagnostics: Array.isArray(parsed.diagnostics) ? parsed.diagnostics : [] };
      } catch (e) {
        // ignore
      }
    }

    return { content: '', diagnostics: ['llm-disabled'] };
  }
}

