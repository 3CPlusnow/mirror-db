const DatabaseHandler = require('./DatabaseHandler');
const SocketHandler = require('./SocketHandler');
const QueueHandler = require('./QueueHandler');
const fs = require('fs');

const envFilePath = process.argv[process.argv.length - 1];
const envFileContent = JSON.parse(fs.readFileSync(envFilePath, 'utf-8'));

const envContent = {
  socketServer: envFileContent.SOCKET_SERVER,
  socketToken: envFileContent.SOCKET_TOKEN,
  companyId: envFileContent.COMPANY_ID,
  companyDomain: envFileContent.COMPANY_DOMAIN,
  batchSize: envFileContent.BATCH_SIZE,
  dbProvider: envFileContent.DB_PROVIDER,
  dbHost: envFileContent.DB_HOST,
  dbPort: envFileContent.DB_PORT,
  dbUser: envFileContent.DB_USER,
  dbTableName: envFileContent.DB_TABLE_NAME || 'call_history',
  dbPassword: envFileContent.DB_PASSWORD,
  dbName: envFileContent.DB_NAME,
  dbSchema: envFileContent.DB_SCHEMA,
  redisHost: envFileContent.REDIS_HOST,
  redisPort: envFileContent.REDIS_PORT,
  readonlyPassword: envFileContent.READONLY_PASSWORD,
  readonlyUser: envFileContent.READONLY_USER,
  ignoreSetup: envFileContent.IGNORE_SETUP || false,

  socketEventEnabled: envFileContent.SOCKET_EVENT_ENABLED || 'call_history,work_break_history,login_history,chat_history',
}

class AppOrchestrator {
  constructor() {
    this.pool = null;
    this.databaseHandler = new DatabaseHandler(envContent);
    this.socketHandler = new SocketHandler(envContent);
    this.queueHandler = new QueueHandler(envContent);
  }

  async start() {
    this.pool = await this.databaseHandler.initializeDatabase();
    this.socketHandler.start(this.pool, this.queueHandler);
    this.queueHandler.start(this.pool);
  }
}

// Instantiate and start the orchestrator
const appOrchestrator = new AppOrchestrator();
appOrchestrator.start();

