const { Pool } = require('pg');
const IDatabaseProvider = require('./IDatabaseProvider');
const { mapSchema } = require('./../utils');

// TODO: utilizar o padrão de mandar os parametros no metodo query().
// FIXME: ainda não esta 100% para uso
class PostgresProvider extends IDatabaseProvider {
  constructor(dbConfig, envContent) {
    super();
    this.env = envContent;
    this.dbConfig = dbConfig;
    this.pool = null;
  }

  async connect() {
    try {
      return this.pool = new Pool({
        user: this.env.dbUser,
        password: this.env.dbPassword,
        server: this.env.dbHost,
        host: this.env.dbHost,
        port: this.env.dbPort,
        database: this.env.dbName,
        requestTimeout: 5000,
        connectionTimeout: 150000,
        options: {
          enableArithAbort: true,
          encrypt: false
        }
      });
    } catch (error) {
      console.error(`[CREATE POOL] - Error at initializing database pool: ${error}`);
    }
  }

  async createDatabase() {
    const checkDbExistsQuery = `SELECT 1 FROM pg_database WHERE datname = '$1'`;
    const result = await this.pool.query(checkDbExistsQuery, [this.dbConfig.database]);
    if (result.rowCount === 0) {
      const createDbQuery = `CREATE DATABASE ${this.dbConfig.database}`;
      await this.pool.query(createDbQuery);
      console.log(`${new Date().toISOString()} - [CREATE DATABASE] - Database '${this.dbConfig.database}' created successfully.`);
    } else {
      console.log(`${new Date().toISOString()} - [CREATE DATABASE] - Database '${this.dbConfig.database}' already exists.`);
    }
  }

  async createReadOnlyUser() {
    const checkUserQuery = `SELECT 1 FROM pg_roles WHERE rolname = '$1'`;
    const result = await this.pool.query(checkUserQuery, [this.env.readonlyUser]);
    if (result.rowCount === 0) {
      const query = `
        CREATE USER ${this.env.readonlyUser} WITH PASSWORD '${this.env.readonlyPassword}';
        GRANT CONNECT ON DATABASE ${this.dbConfig.database} TO ${this.env.readonlyUser};
        GRANT SELECT ON ALL TABLES IN SCHEMA ${this.env.dbSchema || "public"} TO ${this.env.readonlyUser};
        ALTER DEFAULT PRIVILEGES IN SCHEMA ${this.env.dbSchema || "public"} GRANT SELECT ON TABLES TO ${this.env.readonlyUser};
      `;
      await this.pool.query(query);
      console.log(`${new Date().toISOString()} - [CREATE USER] - Read-only user '${this.env.readonlyUser}' created successfully.`);
    } else {
      console.log(`${new Date().toISOString()} - [CREATE USER] - Read-only user '${this.env.readonlyUser}' already exists.`);
    }
  }

  async createTable(tableName = 'call_history', tableSchema = CallHistorySchema) {
    const checkTableQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = '${this.env.dbSchema || "public"}'
      AND table_name = '${tableName}'
    `;
    const result = await this.pool.query(checkTableQuery);
    if (result.rowCount === 0) {
      const createTableQuery = `CREATE TABLE ${tableName} (${mapSchema(tableSchema, 'pgsql')})`;
      await this.pool.query(createTableQuery);
      console.log(`${new Date().toISOString()} - [CREATE TABLE] - Table '${tableName}' created successfully.`);
    } else {
      console.log(`${new Date().toISOString()} - [CREATE TABLE] - Table '${tableName}' already exists.`);
    }
  }

  async checkLastItems() {
    const selectDataQuery = `SELECT * FROM ${this.dbConfig.tableName} ORDER BY custom_created_at DESC LIMIT 10`;
    const result = await this.pool.query(selectDataQuery);
    console.log(`${new Date().toISOString()} - [CHECK DB] - Last 10 items: ${JSON.stringify(result.rows)}`);
  }

  async createColumn(tableName, columnName, columnType) {
    const columnCheckQuery = `
      SELECT COUNT(*) AS column_exists
      FROM information_schema.columns
      WHERE table_name = '${tableName}'
      AND column_name = '${columnName}'
    `;
    const result = await this.pool.query(columnCheckQuery);
    if (result.rows[0].column_exists === 0) {
      const alterQuery = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`;
      await this.pool.query(alterQuery);
      console.log(`${new Date().toISOString()} - [CREATE COLUMN] - Column '${columnName}' created successfully.`);
    } else {
      console.log(`${new Date().toISOString()} - [CREATE COLUMN] - Column '${columnName}' already exists.`);
    }
  }
}

module.exports = PostgresProvider;
