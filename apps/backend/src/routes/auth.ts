import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { deleteUser } from '../services/user';

export async function authRoutes(fastify: FastifyInstance) {
  // GitHub OAuth callback
  fastify.get('/github/callback', async (request: FastifyRequest<{
    Querystring: { code: string; state?: string; installation_id?: string }
  }>, reply: FastifyReply) => {
    const { code, installation_id } = request.query;
    
    // Exchange code for access token and handle user/org creation
    // Implementation would go here
    
    return reply.redirect('http://localhost:3000/dashboard');
  });

  // Get current user
  fastify.get('/me', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ user: (request as any).user });
  });

  // Logout
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.clearCookie('token').send({ status: 'logged out' });
  });

  // Delete current user
  fastify.delete('/me', {
    preHandler: [fastify.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    if (!user || !user.id) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    try {
      await deleteUser(request.prisma, user.id);
      return reply.clearCookie('token').send({ status: 'account deleted' });
    } catch (error) {
      request.log.error('Failed to delete account:', error);
      return reply.status(500).send({ error: 'Failed to delete account' });
    }
  });
}