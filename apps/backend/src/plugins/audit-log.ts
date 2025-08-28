import { FastifyInstance } from 'fastify';
import crypto from 'crypto';

declare module 'fastify' {
  interface FastifyInstance {
    auditLog: (orgId: string, repo: string, pr: number, eventType: string, payload: any) => Promise<void>;
  }
}

export async function auditLogPlugin(fastify: FastifyInstance) {
  fastify.decorate('auditLog', async (orgId: string, repo: string, pr: number, eventType: string, payload: any) => {
    const latest = await fastify.prisma.auditEvent.findFirst({
      where: { orgId, repo, prNumber: pr },
      orderBy: { createdAt: 'desc' }
    });
    const serialized = JSON.stringify(payload);
    const prevHash = latest?.hash ?? '';
    const hash = crypto.createHash('sha256').update(prevHash + serialized).digest('hex');

    await fastify.prisma.auditEvent.create({
      data: { orgId, repo, prNumber: pr, actor: 'system', eventType, payload, prevHash, hash }
    });
  });
}

