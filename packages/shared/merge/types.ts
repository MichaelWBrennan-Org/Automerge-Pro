// packages/shared/merge/types.ts
export interface MergeContext {
  repo: string;
  baseSha: string;
  leftSha: string;
  rightSha: string;
  language: 'ts' | 'js' | 'py' | 'go' | 'java' | 'rb' | 'other';
  files: Array<{ path: string; base?: string; left?: string; right?: string }>;
}

export interface MergeDecision {
  path: string;
  resolvedContent: string;
  strategy: 'ast' | 'llm' | 'manual';
  diagnostics: string[];
}

export interface MergeVerification {
  compiled: boolean;
  testsPassed: boolean;
  warnings: string[];
}

export interface MergeResult {
  decisions: MergeDecision[];
  success: boolean;
  verification: MergeVerification;
}