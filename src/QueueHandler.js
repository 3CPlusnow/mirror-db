const Queue = require('bull');

const { mapCallHistory, generateMultiRowInsert, runQuery } = require('./utils');

class QueueHandler {
  constructor(envContent) {
    this.env = envContent;
    this.company_queue = `${this.env.companyDomain}_${this.env.companyId}`;
    this.queue = new Queue(this.company_queue, {
      redis: {
        host: this.env.redisHost,
        port: this.env.redisPort,
      },
      DefaultJobOptions: {
        attempts: this.env.redisJobAttempts || 3,
        backoff: {
          type: 'exponential',
          delay: this.env.redisJobBackoffDelay || 1000,
        },
      },
    });

    this.setupQueueListeners();
  }

  setupQueueListeners() {
    this.queue.on('completed', this.handleJobCompleted.bind(this));
    this.queue.on('error', this.handleQueueError.bind(this));
    this.queue.on('failed', this.handleJobFailed.bind(this));
  }

  processEventBatch(eventBatch) {
    eventBatch.forEach((event) => {
      // Add a job to the queue for each event in the batch
      this.queue.add({ jsonData: JSON.stringify(event) });
    });
  }

  async handleJobCompleted(job, result) {
    console.log(`${new Date().toISOString()} - Job completed successfully: ${job.id}`);
    job.remove();
  }

  handleQueueError(error) {
    console.error(`${new Date().toISOString()} - Queue error: ${error.message}`);
  }

  handleJobFailed(job, err) {
    console.error(`${new Date().toISOString()} - Job ${job.id} failed with error: ${err.message}. Attempts left: ${job.attemptsMade}/${job.opts.attempts}.`);

    if (job.attemptsMade >= job.opts.attempts) {
      job.remove();
      console.error(`${new Date().toISOString()} - Job ${job.id} removed from the queue after reaching max retries.`);
      console.error(`${new Date().toISOString()} - Job data: ${job}`);
    }
  }

  start(pool) {
    this.queue.process(this.company_queue, async (job) => {
      const { jsonData } = job.data;

      try {
        const rowDataArray = await mapCallHistory(JSON.parse(jsonData), this.env.dbProvider);
        if (rowDataArray.length === 0) {
          throw new Error('No data received to create a query');
        }
        const query = generateMultiRowInsert(rowDataArray, this.env.dbName, this.env.dbTableName, this.env.dbProvider);
        if (!query) {
          throw new Error('Generating multi insert query for: ', rowDataArray);
        }

        await runQuery(pool, query);
      } catch (error) {
        console.error(`${new Date().toISOString()} - [QUEUE HANDLER] - Error at mapping call history events: ${error}`);
      }
    });
  }
}

module.exports = QueueHandler;

