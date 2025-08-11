import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import { config } from '../config';

class GitHubService {
  private appOctokit: Octokit;
  private installationTokens: Map<string, { token: string; expiresAt: Date }> = new Map();

  constructor() {
    this.appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: config.auth.githubAppId,
        privateKey: config.auth.githubPrivateKey.replace(/\\n/g, '\n'),
        clientId: config.auth.githubClientId,
        clientSecret: config.auth.githubClientSecret,
      },
    });
  }

  async getInstallationClient(installationId: string): Promise<Octokit> {
    // Check if we have a valid cached token
    const cached = this.installationTokens.get(installationId);
    if (cached && cached.expiresAt > new Date()) {
      return new Octokit({
        auth: cached.token
      });
    }

    // Get a new installation token
    const { data } = await this.appOctokit.apps.createInstallationAccessToken({
      installation_id: parseInt(installationId)
    });

    // Cache the token (expires in 1 hour, cache for 55 minutes)
    const expiresAt = new Date(Date.now() + 55 * 60 * 1000);
    this.installationTokens.set(installationId, {
      token: data.token,
      expiresAt
    });

    return new Octokit({
      auth: data.token
    });
  }

  async getAppClient(): Promise<Octokit> {
    return this.appOctokit;
  }

  async validateInstallation(installationId: string): Promise<boolean> {
    try {
      await this.appOctokit.apps.getInstallation({
        installation_id: parseInt(installationId)
      });
      return true;
    } catch {
      return false;
    }
  }

  async getInstallationRepositories(installationId: string) {
    const client = await this.getInstallationClient(installationId);
    const { data } = await client.apps.listReposAccessibleToInstallation();
    return data.repositories;
  }

  async getRepositoryContent(
    installationId: string,
    owner: string,
    repo: string,
    path: string
  ) {
    const client = await this.getInstallationClient(installationId);
    return client.repos.getContent({
      owner,
      repo,
      path
    });
  }
}

export const githubService = new GitHubService();