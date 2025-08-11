import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ConfigurationService } from '../services/configuration';
import { githubService } from '../services/github';
import { featureGating } from '../services/feature-gating';

export async function configRoutes(fastify: FastifyInstance) {
  // Get repository configuration
  fastify.get('/repo/:owner/:repo', async (request: FastifyRequest<{
    Params: { owner: string; repo: string };
    Querystring: { installationId: string };
  }>, reply: FastifyReply) => {
    const { owner, repo } = request.params;
    const { installationId } = request.query;

    try {
      const client = await githubService.getInstallationClient(installationId);
      const configService = new ConfigurationService(client);

      const config = await configService.loadRepositoryConfig(owner, repo);
      
      return reply.send({
        config,
        source: 'repository'
      });
    } catch (error: any) {
      if (error.status === 404) {
        return reply.send({
          config: { version: '1', rules: [] },
          source: 'default'
        });
      }
      
      request.log.error('Error loading repository config:', error);
      return reply.status(500).send({ error: 'Failed to load configuration' });
    }
  });

  // Validate configuration
  fastify.post('/validate', async (request: FastifyRequest<{
    Body: any;
  }>, reply: FastifyReply) => {
    try {
      const client = await githubService.getAppClient();
      const configService = new ConfigurationService(client);

      const validation = await configService.validateConfig(request.body);
      
      return reply.send(validation);
    } catch (error) {
      request.log.error('Error validating config:', error);
      return reply.status(500).send({ error: 'Failed to validate configuration' });
    }
  });

  // Get example configuration
  fastify.get('/example', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const client = await githubService.getAppClient();
      const configService = new ConfigurationService(client);

      const exampleConfig = configService.generateExampleConfig();
      
      return reply
        .header('Content-Type', 'text/plain')
        .send(exampleConfig);
    } catch (error) {
      request.log.error('Error generating example config:', error);
      return reply.status(500).send({ error: 'Failed to generate example configuration' });
    }
  });

  // Get merged rules (database + config file)
  fastify.get('/repo/:owner/:repo/rules', async (request: FastifyRequest<{
    Params: { owner: string; repo: string };
    Querystring: { installationId: string; orgId: string };
  }>, reply: FastifyReply) => {
    const { owner, repo } = request.params;
    const { installationId, orgId } = request.query;

    try {
      // Check if organization has access to advanced rules
      const hasAdvancedRules = await featureGating.checkFeatureAccess(orgId, 'advancedRules');
      
      if (!hasAdvancedRules) {
        return reply.status(403).send({ 
          error: 'Advanced rules require a paid plan',
          upgrade: true
        });
      }

      const client = await githubService.getInstallationClient(installationId);
      const configService = new ConfigurationService(client);

      // Load config file
      const config = await configService.loadRepositoryConfig(owner, repo);

      // Load database rules
      const repository = await request.prisma.repository.findFirst({
        where: {
          fullName: `${owner}/${repo}`,
          installation: {
            organizationId: orgId
          }
        },
        include: {
          rules: {
            where: { enabled: true },
            orderBy: { priority: 'desc' }
          }
        }
      });

      const databaseRules = repository?.rules || [];
      
      // Merge rules
      const mergedRules = configService.mergeWithDatabaseRules(config, databaseRules as any);

      return reply.send({
        rules: mergedRules,
        config,
        sources: {
          config: config.rules.length,
          database: databaseRules.length,
          total: mergedRules.length
        }
      });
    } catch (error: any) {
      request.log.error('Error loading merged rules:', error);
      if (error.status === 404) {
        return reply.status(404).send({ error: 'Repository not found' });
      }
      return reply.status(500).send({ error: 'Failed to load rules' });
    }
  });
}