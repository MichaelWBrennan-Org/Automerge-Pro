import { Octokit } from '@octokit/rest';

export class CheckRunService {
  constructor(private readonly octokit: Octokit) {}

  async createOrUpdate(params: { owner: string; repo: string; headSha: string; name: string; status?: 'queued'|'in_progress'|'completed'; conclusion?: 'success'|'failure'|'neutral'|'cancelled'|'timed_out'|'action_required'; summary?: string }) {
    const { owner, repo, headSha, name, status = 'in_progress', conclusion, summary } = params;
    try {
      await this.octokit.checks.create({
        owner,
        repo,
        name,
        head_sha: headSha,
        status,
        conclusion,
        output: summary ? { title: name, summary } : undefined
      } as any);
    } catch (e) {
      // Best effort; remain silent on failure
    }
  }
}

