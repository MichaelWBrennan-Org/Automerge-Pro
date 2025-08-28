export class AstMergeServiceClient {
  constructor(private readonly baseUrl?: string) {}

  async resolve(file: { path: string; base: string; left: string; right: string; language: string }): Promise<{ content?: string; diagnostics?: string[] }> {
    if (!this.baseUrl) return {};
    try {
      const res = await fetch(`${this.baseUrl}/merge`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(file)
      } as any);
      if (!res.ok) return {};
      return await res.json();
    } catch {
      return {};
    }
  }
}

