import AWS from 'aws-sdk';
import { BigQuery } from '@google-cloud/bigquery';
import { config } from '../config';
import { AnalyticsEvent, AnomalyAlert } from '../types/index';

export interface DataPipelineProvider {
  sendEvent(event: AnalyticsEvent): Promise<void>;
  sendBatch(events: AnalyticsEvent[]): Promise<void>;
  sendAlert(alert: AnomalyAlert): Promise<void>;
}

export class KinesisProvider implements DataPipelineProvider {
  private kinesis: AWS.Kinesis;

  constructor() {
    this.kinesis = new AWS.Kinesis({
      region: config.analytics.aws?.region,
      accessKeyId: config.analytics.aws?.accessKeyId,
      secretAccessKey: config.analytics.aws?.secretAccessKey
    });
  }

  async sendEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const params: AWS.Kinesis.PutRecordInput = {
        StreamName: config.analytics.aws?.kinesisStreamName || 'automerge-pro-events',
        Data: JSON.stringify(event),
        PartitionKey: event.organizationId || event.id
      };

      await this.kinesis.putRecord(params).promise();
    } catch (error) {
      console.error('Failed to send event to Kinesis:', error);
      throw error;
    }
  }

  async sendBatch(events: AnalyticsEvent[]): Promise<void> {
    try {
      const records: AWS.Kinesis.PutRecordsRequestEntry[] = events.map(event => ({
        Data: JSON.stringify(event),
        PartitionKey: event.organizationId || event.id
      }));

      // Kinesis batch limit is 500 records
      const batches = this.chunkArray(records, 500);

      for (const batch of batches) {
        const params: AWS.Kinesis.PutRecordsInput = {
          StreamName: config.analytics.aws?.kinesisStreamName || 'automerge-pro-events',
          Records: batch
        };

        await this.kinesis.putRecords(params).promise();
      }
    } catch (error) {
      console.error('Failed to send batch to Kinesis:', error);
      throw error;
    }
  }

  async sendAlert(alert: AnomalyAlert): Promise<void> {
    // Send alerts to a separate stream or topic
    const alertStreamName = `${config.analytics.aws?.kinesisStreamName || 'automerge-pro-events'}-alerts`;
    
    try {
      const params: AWS.Kinesis.PutRecordInput = {
        StreamName: alertStreamName,
        Data: JSON.stringify(alert),
        PartitionKey: alert.organizationId || alert.id
      };

      await this.kinesis.putRecord(params).promise();
    } catch (error) {
      console.error('Failed to send alert to Kinesis:', error);
      throw error;
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

export class BigQueryProvider implements DataPipelineProvider {
  private bigquery: BigQuery;
  private dataset: any;
  private eventsTable: any;

  constructor() {
    const options: any = {
      projectId: config.analytics.bigquery?.projectId
    };

    if (config.analytics.bigquery?.keyFilename) {
      options.keyFilename = config.analytics.bigquery.keyFilename;
    } else if (config.analytics.bigquery?.credentials) {
      options.credentials = JSON.parse(config.analytics.bigquery.credentials);
    }

    this.bigquery = new BigQuery(options);
    this.dataset = this.bigquery.dataset(config.analytics.bigquery?.datasetId || 'automerge_pro');
    this.eventsTable = this.dataset.table(config.analytics.bigquery?.tableId || 'events');
  }

  async sendEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const row = this.formatEventForBigQuery(event);
      await this.eventsTable.insert([row]);
    } catch (error) {
      console.error('Failed to send event to BigQuery:', error);
      throw error;
    }
  }

  async sendBatch(events: AnalyticsEvent[]): Promise<void> {
    try {
      const rows = events.map(event => this.formatEventForBigQuery(event));
      await this.eventsTable.insert(rows);
    } catch (error) {
      console.error('Failed to send batch to BigQuery:', error);
      throw error;
    }
  }

  async sendAlert(alert: AnomalyAlert): Promise<void> {
    try {
      const alertsTable = this.dataset.table('alerts');
      const row = {
        id: alert.id,
        timestamp: alert.timestamp.toISOString(),
        metric_name: alert.metricName,
        current_value: alert.currentValue,
        expected_value: alert.expectedValue,
        threshold: alert.threshold,
        severity: alert.severity,
        description: alert.description,
        organization_id: alert.organizationId,
        created_at: new Date().toISOString()
      };

      await alertsTable.insert([row]);
    } catch (error) {
      console.error('Failed to send alert to BigQuery:', error);
      throw error;
    }
  }

  private formatEventForBigQuery(event: AnalyticsEvent): any {
    return {
      id: event.id,
      timestamp: event.timestamp.toISOString(),
      event_type: event.eventType,
      organization_id: event.organizationId,
      user_id: event.userId || null,
      repository_id: event.repositoryId || null,
      pull_request_id: event.pullRequestId || null,
      properties: JSON.stringify(event.properties),
      metadata: JSON.stringify(event.metadata || {}),
      created_at: new Date().toISOString()
    };
  }

  /**
   * Ensure BigQuery tables exist with proper schema
   */
  async initializeTables(): Promise<void> {
    try {
      // Events table schema
      const eventsSchema = [
        { name: 'id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
        { name: 'event_type', type: 'STRING', mode: 'REQUIRED' },
        { name: 'organization_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'user_id', type: 'STRING', mode: 'NULLABLE' },
        { name: 'repository_id', type: 'STRING', mode: 'NULLABLE' },
        { name: 'pull_request_id', type: 'STRING', mode: 'NULLABLE' },
        { name: 'properties', type: 'JSON', mode: 'NULLABLE' },
        { name: 'metadata', type: 'JSON', mode: 'NULLABLE' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
      ];

      // Alerts table schema
      const alertsSchema = [
        { name: 'id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
        { name: 'metric_name', type: 'STRING', mode: 'REQUIRED' },
        { name: 'current_value', type: 'FLOAT64', mode: 'REQUIRED' },
        { name: 'expected_value', type: 'FLOAT64', mode: 'REQUIRED' },
        { name: 'threshold', type: 'FLOAT64', mode: 'REQUIRED' },
        { name: 'severity', type: 'STRING', mode: 'REQUIRED' },
        { name: 'description', type: 'STRING', mode: 'NULLABLE' },
        { name: 'organization_id', type: 'STRING', mode: 'NULLABLE' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
      ];

      // Create dataset if it doesn't exist
      const [datasetExists] = await this.dataset.exists();
      if (!datasetExists) {
        await this.dataset.create();
      }

      // Create events table if it doesn't exist
      const [eventsTableExists] = await this.eventsTable.exists();
      if (!eventsTableExists) {
        await this.eventsTable.create({
          schema: { fields: eventsSchema },
          timePartitioning: {
            type: 'DAY',
            field: 'timestamp'
          }
        });
      }

      // Create alerts table if it doesn't exist
      const alertsTable = this.dataset.table('alerts');
      const [alertsTableExists] = await alertsTable.exists();
      if (!alertsTableExists) {
        await alertsTable.create({
          schema: { fields: alertsSchema },
          timePartitioning: {
            type: 'DAY',
            field: 'timestamp'
          }
        });
      }

      console.log('BigQuery tables initialized successfully');
    } catch (error) {
      console.error('Failed to initialize BigQuery tables:', error);
      throw error;
    }
  }
}

export class LocalProvider implements DataPipelineProvider {
  async sendEvent(event: AnalyticsEvent): Promise<void> {
    console.log('Local Analytics Event:', {
      eventType: event.eventType,
      organizationId: event.organizationId,
      timestamp: event.timestamp,
      properties: event.properties
    });
  }

  async sendBatch(events: AnalyticsEvent[]): Promise<void> {
    console.log(`Local Analytics Batch: ${events.length} events`);
    for (const event of events) {
      await this.sendEvent(event);
    }
  }

  async sendAlert(alert: AnomalyAlert): Promise<void> {
    console.warn('Local Analytics Alert:', {
      severity: alert.severity,
      metric: alert.metricName,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
      description: alert.description
    });
  }
}

export class DataPipelineService {
  private provider: DataPipelineProvider;

  constructor() {
    this.provider = this.createProvider();
  }

  private createProvider(): DataPipelineProvider {
    switch (config.analytics.provider) {
      case 'kinesis':
        return new KinesisProvider();
      case 'bigquery':
        return new BigQueryProvider();
      case 'local':
      default:
        return new LocalProvider();
    }
  }

  async sendEvent(event: AnalyticsEvent): Promise<void> {
    if (!config.analytics.enabled) {
      return;
    }

    try {
      await this.provider.sendEvent(event);
    } catch (error) {
      console.error('Failed to send event via data pipeline:', error);
      // Fallback to local logging
      const localProvider = new LocalProvider();
      await localProvider.sendEvent(event);
    }
  }

  async sendBatch(events: AnalyticsEvent[]): Promise<void> {
    if (!config.analytics.enabled || events.length === 0) {
      return;
    }

    try {
      await this.provider.sendBatch(events);
    } catch (error) {
      console.error('Failed to send batch via data pipeline:', error);
      // Fallback to local logging
      const localProvider = new LocalProvider();
      await localProvider.sendBatch(events);
    }
  }

  async sendAlert(alert: AnomalyAlert): Promise<void> {
    if (!config.analytics.enabled) {
      return;
    }

    try {
      await this.provider.sendAlert(alert);
    } catch (error) {
      console.error('Failed to send alert via data pipeline:', error);
      // Fallback to local logging
      const localProvider = new LocalProvider();
      await localProvider.sendAlert(alert);
    }
  }

  /**
   * Initialize external data pipeline (for BigQuery table creation)
   */
  async initialize(): Promise<void> {
    if (config.analytics.provider === 'bigquery' && this.provider instanceof BigQueryProvider) {
      await this.provider.initializeTables();
    }
  }
}