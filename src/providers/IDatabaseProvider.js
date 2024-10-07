class IDatabaseProvider {
    async connect() {
        throw new Error('Method not implemented');
    }

    async createDatabase() {
        throw new Error('Method not implemented');
    }

    async createReadOnlyUser() {
        throw new Error('Method not implemented');
    }

    async createTable(tableName, tableSchema) {
        throw new Error('Method not implemented');
    }

    async checkLastItems() {
        throw new Error('Method not implemented');
    }

    async createColumn(columnName, columnType) {
        throw new Error('Method not implemented');
    }
}

module.exports = IDatabaseProvider;
