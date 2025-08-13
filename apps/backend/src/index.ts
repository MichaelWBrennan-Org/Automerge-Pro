import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

import { githubRoutes } from './routes/github';
import { authRoutes } from './routes/auth';
import { rulesRoutes } from './routes/rules';
import { webhookRoutes } from './routes/webhooks';
import { billingRoutes } from './routes/billing';
import { stripeRoutes } from './routes/stripe';
import { supportRoutes } from './routes/support';
import { notificationRoutes } from './routes/notifications';
import { configRoutes } from './routes/config';
import { registerAnalyticsRoutes } from './routes/analytics';
import { setupQueues } from './services/queue';
import { AnalyticsService } from './services/analytics';
import { DataPipelineService } from './services/data-pipeline';
import { ReportingService } from './services/reporting';
import { NotificationService } from './services/notification';
import { AnalyticsWorker } from './services/analytics-worker';
import { config } from './config';

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyRequest {
    prisma: PrismaClient;
    redis: Redis;
  }
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}

const prisma = new PrismaClient();
const redis = new Redis(config.redis.url);

async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.app.logLevel,
      transport: config.app.env === 'development' ? {
        target: 'pino-pretty'
      } : undefined
    }
  });

  // Security plugins
  await app.register(helmet, {
    contentSecurityPolicy: false
  });

  await app.register(cors, {
    origin: config.app.corsOrigins,
    credentials: true
  });

  await app.register(cookie);

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: redis
  });

  // JWT authentication
  await app.register(jwt, {
    secret: config.auth.jwtSecret,
    cookie: {
      cookieName: 'token',
      signed: false
    }
  });

  // Add context
  app.decorateRequest('prisma', null);
  app.decorateRequest('redis', null);
  app.addHook('onRequest', async (request) => {
    request.prisma = prisma;
    request.redis = redis;
  });

  // Authentication decorator
  app.decorate('authenticate', async function(request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Setup job queues
  const queues = setupQueues(redis);
  
  // Setup analytics services
  const analyticsService = new AnalyticsService(prisma, redis);
  const dataPipelineService = new DataPipelineService();
  const notificationService = new NotificationService();
  const reportingService = new ReportingService(prisma, redis, analyticsService, notificationService);
  
  // Setup analytics worker
  const analyticsWorker = new AnalyticsWorker(
    redis,
    prisma,
    dataPipelineService,
    notificationService,
    reportingService,
    analyticsService
  );
  
  // Initialize data pipeline
  await dataPipelineService.initialize();
  
  // Schedule recurring jobs
  await analyticsWorker.scheduleRecurringJobs();
  
  // Store services in app context for route access
  app.decorate('queues', queues);
  app.decorate('analyticsService', analyticsService);
  app.decorate('dataPipelineService', dataPipelineService);
  app.decorate('reportingService', reportingService);

  // Health check
  app.get('/health', async () => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version 
    };
  });

  // API routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(githubRoutes, { prefix: '/api/github' });
  await app.register(rulesRoutes, { prefix: '/api/rules' });
  await app.register(webhookRoutes, { prefix: '/api/webhooks' });
  await app.register(billingRoutes, { prefix: '/api/billing' });
  await app.register(stripeRoutes, { prefix: '/api/stripe' });
  await app.register(supportRoutes, { prefix: '/api/support' });
  await app.register(notificationRoutes, { prefix: '/api/notifications' });
  await app.register(configRoutes, { prefix: '/api/config' });
  
  // Register analytics routes
  registerAnalyticsRoutes(
    app, 
    (app as any).analyticsService,
    (app as any).reportingService,
    (app as any).dataPipelineService
  );

  // Error handler
  app.setErrorHandler(async (error, request, reply) => {
    request.log.error(error);
    
    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation
      });
    }

    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  });

  return app;
}

async function start() {
  try {
    const app = await buildApp();
    
    await app.listen({
      port: config.app.port,
      host: config.app.host
    });

    console.log(`🚀 Server running on http://${config.app.host}:${config.app.port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

export { buildApp };