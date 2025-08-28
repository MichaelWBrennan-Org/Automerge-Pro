export interface MergeEvent<T = any> {
  type: 'MERGE_REQUESTED' | 'MERGE_DECISIONED' | 'POLICY_EVALUATED' | 'VERIFICATION_COMPLETED';
  orgId: string;
  repo: string;
  prNumber: number;
  payload: T;
}

export interface PluginContext {
  log: (msg: string, meta?: any) => void;
  emit: (event: MergeEvent) => Promise<void>;
}

export interface AutomergePlugin {
  name: string;
  version: string;
  handles: MergeEvent['type'][];
  onEvent: (event: MergeEvent, ctx: PluginContext) => Promise<void>;
}