import { z } from 'zod';

const configSchema = z.object({
  app: z.object({
    port: z.number().default(3001),
    host: z.string().default('0.0.0.0'),
    env: z.enum(['development', 'production', 'test']).default('development'),
    logLevel: z.string().default('info'),
    corsOrigins: z.array(z.string()).default(['http://localhost:3000'])
  }),
  auth: z.object({
    jwtSecret: z.string(),
    githubClientId: z.string(),
    githubClientSecret: z.string(),
    githubWebhookSecret: z.string(),
    githubAppId: z.string(),
    githubPrivateKey: z.string()
  }),
  database: z.object({
    url: z.string()
  }),
  redis: z.object({
    url: z.string()
  }),
  openai: z.object({
    apiKey: z.string(),
    model: z.string().default('gpt-4-1106-preview')
  }),
  groq: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('llama3-70b-8192')
  }).optional(),
  huggingface: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('mistralai/Mixtral-8x7B-Instruct-v0.1')
  }).optional(),
  billing: z.object({
    stripeSecretKey: z.string(),
    stripeWebhookSecret: z.string(),
    githubMarketplaceWebhookSecret: z.string()
  }),
  stripe: z.object({
    secretKey: z.string(),
    publishableKey: z.string(),
    webhookSecret: z.string(),
    teamPriceId: z.string().optional(),
    growthPriceId: z.string().optional(),
    enterprisePriceId: z.string().optional()
  }),
  notifications: z.object({
    smtpHost: z.string().optional(),
    smtpPort: z.number().optional(),
    smtpUser: z.string().optional(),
    smtpPass: z.string().optional(),
    fromEmail: z.string().default('noreply@automerge-pro.com')
  }),
  analytics: z.object({
    enabled: z.boolean().default(true),
    provider: z.enum(['kinesis', 'bigquery', 'local']).default('local'),
    aws: z.object({
      region: z.string().default('us-east-1'),
      kinesisStreamName: z.string().default('automerge-pro-events'),
      accessKeyId: z.string().optional(),
      secretAccessKey: z.string().optional()
    }).optional(),
    bigquery: z.object({
      projectId: z.string(),
      datasetId: z.string().default('automerge_pro'),
      tableId: z.string().default('events'),
      keyFilename: z.string().optional(),
      credentials: z.string().optional()
    }).optional(),
    anomalyDetection: z.object({
      enabled: z.boolean().default(true),
      alertThresholds: z.object({
        errorRate: z.number().default(0.05), // 5% error rate
        responseTime: z.number().default(5000), // 5 seconds
        userDropoff: z.number().default(0.3) // 30% drop
      })
    }),
    reporting: z.object({
      enabled: z.boolean().default(true),
      schedule: z.string().default('0 9 * * MON'), // Every Monday at 9 AM
      recipients: z.array(z.string()).default([])
    })
  })
});

const rawConfig = {
  app: {
    port: parseInt(process.env.PORT || '3001'),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000']
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-here',
    githubClientId: process.env.GITHUB_CLIENT_ID || '',
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
    githubAppId: process.env.GITHUB_APP_ID || '',
    githubPrivateKey: process.env.GITHUB_PRIVATE_KEY || ''
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/automerge_pro'
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4-1106-preview'
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'llama3-70b-8192'
  },
  huggingface: {
    apiKey: process.env.HF_API_KEY,
    model: process.env.HF_MODEL || 'mistralai/Mixtral-8x7B-Instruct-v0.1'
  },
  billing: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    githubMarketplaceWebhookSecret: process.env.GITHUB_MARKETPLACE_WEBHOOK_SECRET || ''
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    teamPriceId: process.env.STRIPE_TEAM_PRICE_ID,
    growthPriceId: process.env.STRIPE_GROWTH_PRICE_ID,
    enterprisePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID
  },
  notifications: {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    fromEmail: process.env.FROM_EMAIL || 'noreply@automerge-pro.com'
  },
  analytics: {
    enabled: process.env.ANALYTICS_ENABLED !== 'false',
    provider: (process.env.ANALYTICS_PROVIDER as 'kinesis' | 'bigquery' | 'local') || 'local',
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      kinesisStreamName: process.env.AWS_KINESIS_STREAM_NAME || 'automerge-pro-events',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    bigquery: {
      projectId: process.env.BIGQUERY_PROJECT_ID || '',
      datasetId: process.env.BIGQUERY_DATASET_ID || 'automerge_pro',
      tableId: process.env.BIGQUERY_TABLE_ID || 'events',
      keyFilename: process.env.BIGQUERY_KEY_FILENAME,
      credentials: process.env.BIGQUERY_CREDENTIALS
    },
    anomalyDetection: {
      enabled: process.env.ANOMALY_DETECTION_ENABLED !== 'false',
      alertThresholds: {
        errorRate: parseFloat(process.env.ALERT_ERROR_RATE_THRESHOLD || '0.05'),
        responseTime: parseInt(process.env.ALERT_RESPONSE_TIME_THRESHOLD || '5000'),
        userDropoff: parseFloat(process.env.ALERT_USER_DROPOFF_THRESHOLD || '0.3')
      }
    },
    reporting: {
      enabled: process.env.SCHEDULED_REPORTING_ENABLED !== 'false',
      schedule: process.env.REPORT_SCHEDULE || '0 9 * * MON',
      recipients: process.env.REPORT_RECIPIENTS?.split(',') || []
    }
  }
};

export const config = configSchema.parse(rawConfig);