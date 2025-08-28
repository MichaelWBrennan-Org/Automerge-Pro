import { MergeEvent } from '@automerge-pro/shared/plugins/types';

export class EventBus {
  async emit(event: MergeEvent) {
    // Placeholder: in-process emit; future: webhook/gRPC publish
    console.log('[event]', event.type, { orgId: event.orgId, repo: event.repo, pr: event.prNumber });
  }
}

export const eventBus = new EventBus();

