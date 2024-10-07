const SqlServerProvider = require('./providers/SqlServerProvider');
const PostgresProvider = require('./providers/PostgresProvider');
const MySQLProvider = require('./providers/MySQLProvider');

const { CallHistorySchema } = require('./schemas/CallHistorySchema');
const { AgentWasLoggedOutSchema } = require('./schemas/LoginHistorySchema');
const { AgentLeftWorkBreakSchema } = require('./schemas/WorkbreakHistorySchema');
const { ChatHistorySchema } = require('./schemas/WhatsappChatFinishedSchema');

class DatabaseConnector {
  constructor(envContent) {
    this.env = envContent;
    this.dbConfig = {
      user: this.env.dbUser,
      password: this.env.dbPassword,
      server: this.env.dbHost,
      host: this.env.dbHost,
      port: this.env.dbPort,
      database: this.env.dbName,
      requestTimeout : 15000,
      connectionTimeout: 15000,
      options: {
        enableArithAbort: true,
        encrypt: false,
      }
    };

    this.pool = null;
    this.databaseProvider = this.getDatabaseProvider(this.env.dbProvider);
  }

  getDatabaseProvider(provider) {
    switch (provider) {
      case 'sqlserver':
        return new SqlServerProvider(this.dbConfig, this.env);
      case 'pgsql':
        return new PostgresProvider(this.dbConfig, this.env);
      case 'mysql':
        return new MySQLProvider(this.dbConfig, this.env);
      default:
        throw new Error('Unsupported database provider: ', provider, ' - try: sqlserver, pgsql, mysql');
    }
  }

  async initializeDatabase() {
    try {
      await this.connectToDatabase();
      await this.setupDatabase();
      return this.pool;
    } catch (error) {
      console.error(`${new Date().toISOString()} - Error initializing database: ${error}`);
      process.exit(1);
    }
  }

  async connectToDatabase() {
    try {
      return this.pool = await this.databaseProvider.connect();
    } catch (error) {
      console.error(`[CONNECT DATABASE] - Error at initializing database pool: ${error}`);
      throw error;
    }
  }

  async setupDatabase() {

    if(this.env.ignoreSetup)
      return;

    try {
      //await this.createReadOnlyUser();
      await this.createTable(String(this.env.socketEventEnabled).split(','));
    } catch (error) {
      console.error(`[SETUP DATABASE] - Error during database setup: ${error}`);
      throw error;
    }
    
  }

  async createDatabase() {
    try {
      return this.databaseProvider.createDatabase();
    } catch (error) {
      console.error('Error creating database:', error);
      process.exit(1);
    }
  }

  async createReadOnlyUser() {
    try {
      return this.databaseProvider.createReadOnlyUser();
    } catch (error) {
      console.error('Error creating readonlyuser:', error);
    }
  }

  async createTable(tables = ['call_history', 'work_break_history', 'login_history']) {
    try {
      let tableSchema = CallHistorySchema;
      for (const table of tables) {
        if (table == 'call_history') tableSchema = CallHistorySchema;
        if (table == 'login_history') tableSchema = AgentWasLoggedOutSchema;
        if (table == 'work_break_history') tableSchema = AgentLeftWorkBreakSchema;
        if (table == 'chat_history') tableSchema = ChatHistorySchema;
        console.log(`Creating table ${table} with schema: `, tableSchema);
        await this.databaseProvider.createTable(table, tableSchema);
      }
    } catch (error) {
      console.error('Error creating table:', error);
      process.exit(1);
    }
  }

  async checkLastItems() {
    return this.databaseProvider.checkLastItems();
  }

  async createColumn(columnName, columnType) {
    return this.databaseProvider.createColumn(columnName, columnType);
  }
}

module.exports = DatabaseConnector;
