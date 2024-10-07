const sql = require('mssql');
const IDatabaseProvider = require('./IDatabaseProvider');
const { CallHistorySchema } = require('../schemas/CallHistorySchema');
const { mapSchema } = require('./../utils');

class SqlServerProvider extends IDatabaseProvider {
  constructor(dbConfig, envContent) {
    super();
    this.env = envContent;
    this.dbConfig = dbConfig;
    this.pool = null;
  }

  async connect() {
    return this.pool = await new sql.ConnectionPool(this.dbConfig).connect();
  }

  async createDatabase() {
    const checkDbExistsQuery = `SELECT COUNT(*) AS dbCount FROM sys.databases WHERE name = '${this.dbConfig.database}'`;
    const result = await this.pool.request().query(checkDbExistsQuery);
    if (result.recordset[0].dbCount === 0) {
      const createDbQuery = `CREATE DATABASE "${this.dbConfig.database}"`;
      await this.pool.request().query(createDbQuery);
      console.log(`${new Date().toISOString()} - [CREATE DATABASE] - Database '${this.dbConfig.database}' created successfully.`);
    } else {
      console.log(`${new Date().toISOString()} - [CREATE DATABASE] - Database '${this.dbConfig.database}' already exists.`);
    }
  }

  async createReadOnlyUser() {
    const checkUserQuery = `SELECT name FROM sys.server_principals WHERE name = '${this.env.readonlyUser}'`;
    const userCheckResult = await this.pool.request().query(checkUserQuery);
    if (userCheckResult.recordset.length === 0) {
      const query = `
        CREATE LOGIN [${this.env.readonlyUser}] WITH PASSWORD = '${this.env.readonlyPassword}';
        USE "${this.dbConfig.database}";
        CREATE USER [${this.env.readonlyUser}] FOR LOGIN [${this.env.readonlyUser}];
        EXEC sp_addrolemember 'db_datareader', '${this.env.readonlyUser}';
        GRANT EXECUTE TO [${this.env.readonlyUser}];
      `;
      await this.pool.request().batch(query);
      console.log(`${new Date().toISOString()} - [CREATE USER] - Read-only user '${this.env.readonlyUser}' created successfully.`);
    } else {
      console.log(`${new Date().toISOString()} - [CREATE USER] - Read-only user '${this.env.readonlyUser}' already exists.`);
    }
  }

  async createTable(tableName = 'call_history', tableSchema=CallHistorySchema) {
    const checkTableQuery = `
      SELECT TABLE_NAME
      FROM "${this.dbConfig.database}".INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME = '${tableName}'
    `;
    const result = await this.pool.request().query(checkTableQuery);
    if (result.recordset.length === 0) {
      const createTableQuery = `CREATE TABLE "${this.dbConfig.database}".dbo.${tableName} (${mapSchema(tableSchema, 'sqlserver')})`;
      await this.pool.request().query(createTableQuery);
      console.log(`${new Date().toISOString()} - [CREATE TABLE] - Table '${tableName}' created successfully.`);
    } else {
      console.log(`${new Date().toISOString()} - [CREATE TABLE] - Table '${tableName}' already exists.`);
    }
  }

  async checkLastItems() {
    const selectDataQuery = `SELECT TOP 10 * FROM "${this.dbConfig.database}".dbo.${this.dbConfig.tableName} ORDER BY custom_created_at DESC`;
    const result = await this.pool.request().query(selectDataQuery);
    console.log(`${new Date().toISOString()} - [CHECK DB] - Last 10 items: ${JSON.stringify(result.recordset)}`);
  }

  async createColumn(tableName, columnName, columnType) {
    const columnCheckQuery = `
      SELECT COUNT(*) AS column_exists
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${tableName}'
      AND COLUMN_NAME = '${columnName}'
    `;
    const columnCheckResult = await this.pool.request().query(columnCheckQuery);
    if (columnCheckResult.recordset[0].column_exists === 0) {
      const alterQuery = `ALTER TABLE "${this.dbConfig.database}".dbo.${tableName} ADD ${columnName} ${columnType}`;
      await this.pool.request().query(alterQuery);
      console.log(`${new Date().toISOString()} - [CREATE COLUMN] - Column '${columnName}' created successfully.`);
    } else {
      console.log(`${new Date().toISOString()} - [CREATE COLUMN] - Column '${columnName}' already exists.`);
    }
  }
}

module.exports = SqlServerProvider;
