export type PolicyDecision = {
  allow: boolean;
  reasons: string[];
};

export class PolicyEngine {
  constructor(private readonly opaUrl?: string) {}

  async evaluate(context: { orgId: string; repo: string; prNumber: number; labels?: string[] }): Promise<PolicyDecision> {
    // Simple local policy first
    const sensitive = (context.labels || []).includes('sensitive');
    if (sensitive) return { allow: false, reasons: ['Sensitive PR label present'] };

    // Optional OPA call
    if (!this.opaUrl) return { allow: true, reasons: [] };
    try {
      const body = {
        input: {
          orgId: context.orgId,
          repo: context.repo,
          prNumber: context.prNumber,
          labels: context.labels || []
        }
      };
      const res = await fetch(`${this.opaUrl}/v1/data/automerge/allow`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      const allow = Boolean(json?.result?.allow ?? json?.result);
      const reasons = Array.isArray(json?.result?.reasons) ? json.result.reasons : [];
      return { allow, reasons };
    } catch {
      return { allow: true, reasons: ['OPA unavailable, default allow'] };
    }
  }
}

