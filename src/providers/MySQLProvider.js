const mysql = require('mysql2/promise');
const IDatabaseProvider = require('./IDatabaseProvider');
const { CallHistorySchema } = require('../schemas/CallHistorySchema');
const { mapSchema } = require('./../utils');

class MySQLProvider extends IDatabaseProvider {
  constructor(dbConfig, envContent) {
    super();
    this.env = envContent;
    this.dbConfig = dbConfig;
    this.pool = null;
  }

  async connect() {
    return this.pool = mysql.createPool(this.dbConfig);
  }

  async createDatabase() {
    const checkDbExistsQuery = `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${this.dbConfig.database}'`;
    const result = await this.pool.query(checkDbExistsQuery);
    if (result[0].length === 0) {
      const createDbQuery = `CREATE DATABASE ${this.dbConfig.database}`;
      await this.pool.query(createDbQuery);
      console.log(`${new Date().toISOString()} - [CREATE DATABASE] - Database '${this.dbConfig.database}' created successfully.`);
    } else {
      console.log(`${new Date().toISOString()} - [CREATE DATABASE] - Database '${this.dbConfig.database}' already exists.`);
    }
  }

  async createReadOnlyUser() {
    const checkUserQuery = `SELECT User FROM mysql.user WHERE User = '${this.env.readOnlyUser}'`;
    const result = await this.pool.query(checkUserQuery);
    if (result[0].length === 0) {
      const query = `
        CREATE USER '${this.env.readOnlyUser}'@'%' IDENTIFIED BY '${this.env.readOnlyPassword}';
        GRANT SELECT ON ${this.dbConfig.database}.* TO '${this.env.readOnlyUser}'@'%';
      `;
      await this.pool.query(query);
      console.log(`${new Date().toISOString()} - [CREATE USER] - Read-only user '${this.env.readOnlyUser}' created successfully.`);
    } else {
      console.log(`${new Date().toISOString()} - [CREATE USER] - Read-only user '${this.env.readOnlyUser}' already exists.`);
    }
  }

  async createTable(tableName = 'call_history', tableSchema=CallHistorySchema) {
    const checkTableQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = '${this.dbConfig.database}'
      AND table_name = '${tableName}'
    `;
    const result = await this.pool.query(checkTableQuery);
    if (result[0].length === 0) {
      const createTableQuery = `CREATE TABLE ${this.dbConfig.database}.${tableName} (${mapSchema(tableSchema, 'mysql')})`;
      await this.pool.query(createTableQuery);
      console.log(`${new Date().toISOString()} - [CREATE TABLE] - Table '${tableName}' created successfully.`);
    } else {
      console.log(`${new Date().toISOString()} - [CREATE TABLE] - Table '${tableName}' already exists.`);
    }
  }

  async checkLastItems() {
    const selectDataQuery = `SELECT * FROM ${this.dbConfig.database}.${this.env.tableName} ORDER BY custom_created_at DESC LIMIT 10`;
    const result = await this.pool.query(selectDataQuery);
    console.log(`${new Date().toISOString()} - [CHECK DB] - Last 10 items: ${JSON.stringify(result[0])}`);
  }

  async createColumn(tableName, columnName, columnType) {
    const columnCheckQuery = `
      SELECT COUNT(*) AS column_exists
      FROM information_schema.columns
      WHERE table_schema = '${this.dbConfig.database}'
      AND table_name = '${tableName}'
      AND column_name = '${columnName}'
    `;
    const result = await this.pool.query(columnCheckQuery);
    if (result[0][0].column_exists === 0) {
      const alterQuery = `ALTER TABLE ${this.dbConfig.database}.${tableName} ADD COLUMN ${columnName} ${columnType}`;
      await this.pool.query(alterQuery);
      console.log(`${new Date().toISOString()} - [CREATE COLUMN] - Column '${columnName}' created successfully.`);
    } else {
      console.log(`${new Date().toISOString()} - [CREATE COLUMN] - Column '${columnName}' already exists.`);
    }
  }
}

module.exports = MySQLProvider;
