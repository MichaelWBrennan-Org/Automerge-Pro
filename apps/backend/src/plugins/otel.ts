import { FastifyInstance } from 'fastify';

export async function otelPlugin(fastify: FastifyInstance) {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    fastify.log.info('OTEL disabled (no endpoint)');
    return;
  }
  // Minimal stub: real impl would register OpenTelemetry SDK
  fastify.addHook('onRequest', async (req) => {
    req.headers['x-trace-id'] = req.headers['x-trace-id'] || Math.random().toString(16).slice(2);
  });
}

