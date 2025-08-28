export type PolicyDecision = {
  allow: boolean;
  reasons: string[];
};

export class PolicyEngine {
  async evaluate(context: { orgId: string; repo: string; prNumber: number; labels?: string[] }): Promise<PolicyDecision> {
    // Placeholder for OPA/Rego evaluation; deny on sensitive label as example
    const sensitive = (context.labels || []).includes('sensitive');
    return sensitive ? { allow: false, reasons: ['Sensitive PR label present'] } : { allow: true, reasons: [] };
  }
}

