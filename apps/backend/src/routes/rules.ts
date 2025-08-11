import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { featureGating } from '../services/feature-gating';

const createRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  repositoryId: z.string().optional(),
  conditions: z.object({
    filePatterns: z.array(z.string()).optional(),
    authorPatterns: z.array(z.string()).optional(),
    branchPatterns: z.array(z.string()).optional(),
    maxRiskScore: z.number().min(0).max(1).optional(),
    requireTests: z.boolean().optional(),
    blockPatterns: z.array(z.string()).optional()
  }),
  actions: z.object({
    autoApprove: z.boolean().default(false),
    autoMerge: z.boolean().default(false),
    requireReviews: z.number().min(0).optional(),
    notify: z.boolean().default(true)
  })
});

export async function rulesRoutes(fastify: FastifyInstance) {
  // Get rules for organization
  fastify.get('/org/:orgId', async (request: FastifyRequest<{
    Params: { orgId: string }
  }>, reply: FastifyReply) => {
    try {
      const { orgId } = request.params;
      
      const rules = await request.prisma.mergeRule.findMany({
        where: { organizationId: orgId },
        include: {
          repository: {
            select: { name: true, fullName: true }
          }
        },
        orderBy: { priority: 'desc' }
      });

      return reply.send({ rules });
    } catch (error) {
      request.log.error('Error fetching rules:', error);
      return reply.status(500).send({ error: 'Failed to fetch rules' });
    }
  });

  // Create new rule
  fastify.post('/org/:orgId', async (request: FastifyRequest<{
    Params: { orgId: string }
    Body: z.infer<typeof createRuleSchema>
  }>, reply: FastifyReply) => {
    try {
      const { orgId } = request.params;
      const ruleData = createRuleSchema.parse(request.body);

      // Check if organization can create advanced rules
      const hasAdvancedRules = await featureGating.checkFeatureAccess(orgId, 'advancedRules');
      
      // Count existing rules
      const existingRules = await request.prisma.mergeRule.count({
        where: { organizationId: orgId }
      });

      // For free plan, only allow basic rules
      if (!hasAdvancedRules) {
        if (existingRules >= 3) {
          return reply.status(403).send({
            error: 'Free plan is limited to 3 rules. Upgrade to add more.',
            upgrade: true
          });
        }

        // Restrict advanced features for free plan
        if (ruleData.conditions.maxRiskScore !== undefined ||
            ruleData.conditions.requireTests ||
            (ruleData.actions.autoMerge && ruleData.actions.autoApprove)) {
          return reply.status(403).send({
            error: 'Advanced rule features require a paid plan.',
            upgrade: true
          });
        }
      }

      const rule = await request.prisma.mergeRule.create({
        data: {
          organizationId: orgId,
          name: ruleData.name,
          description: ruleData.description,
          repositoryId: ruleData.repositoryId,
          conditions: ruleData.conditions,
          actions: ruleData.actions,
          priority: 0 // Will be updated based on user preference
        }
      });

      return reply.status(201).send({ rule });
    } catch (error) {
      request.log.error('Error creating rule:', error);
      return reply.status(500).send({ error: 'Failed to create rule' });
    }
  });

  // Update rule
  fastify.put('/:ruleId', async (request: FastifyRequest<{
    Params: { ruleId: string }
    Body: Partial<z.infer<typeof createRuleSchema>>
  }>, reply: FastifyReply) => {
    try {
      const { ruleId } = request.params;
      const updates = request.body;

      const rule = await request.prisma.mergeRule.update({
        where: { id: ruleId },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });

      return reply.send({ rule });
    } catch (error) {
      request.log.error('Error updating rule:', error);
      return reply.status(500).send({ error: 'Failed to update rule' });
    }
  });

  // Delete rule
  fastify.delete('/:ruleId', async (request: FastifyRequest<{
    Params: { ruleId: string }
  }>, reply: FastifyReply) => {
    try {
      const { ruleId } = request.params;

      await request.prisma.mergeRule.delete({
        where: { id: ruleId }
      });

      return reply.status(204).send();
    } catch (error) {
      request.log.error('Error deleting rule:', error);
      return reply.status(500).send({ error: 'Failed to delete rule' });
    }
  });

  // Toggle rule enabled/disabled
  fastify.patch('/:ruleId/toggle', async (request: FastifyRequest<{
    Params: { ruleId: string }
  }>, reply: FastifyReply) => {
    try {
      const { ruleId } = request.params;

      const rule = await request.prisma.mergeRule.findUnique({
        where: { id: ruleId }
      });

      if (!rule) {
        return reply.status(404).send({ error: 'Rule not found' });
      }

      const updatedRule = await request.prisma.mergeRule.update({
        where: { id: ruleId },
        data: { enabled: !rule.enabled }
      });

      return reply.send({ rule: updatedRule });
    } catch (error) {
      request.log.error('Error toggling rule:', error);
      return reply.status(500).send({ error: 'Failed to toggle rule' });
    }
  });

  // Reorder rules (update priorities)
  fastify.post('/org/:orgId/reorder', async (request: FastifyRequest<{
    Params: { orgId: string }
    Body: { ruleIds: string[] }
  }>, reply: FastifyReply) => {
    try {
      const { orgId } = request.params;
      const { ruleIds } = request.body;

      // Update priorities based on order
      const updates = ruleIds.map((ruleId, index) => 
        request.prisma.mergeRule.update({
          where: { id: ruleId, organizationId: orgId },
          data: { priority: ruleIds.length - index }
        })
      );

      await Promise.all(updates);

      return reply.send({ status: 'success' });
    } catch (error) {
      request.log.error('Error reordering rules:', error);
      return reply.status(500).send({ error: 'Failed to reorder rules' });
    }
  });
}