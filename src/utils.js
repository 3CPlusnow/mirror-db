const { CallHistoryMap: mapDataCallHistory } = require('./schemas/CallHistorySchema');

exports.convertToDateTimeString = function (dateString) {
    const [date, time] = dateString.split(' ');
    const [day, month, year] = date.split('/');
    return `${year}-${month}-${day} ${time}`;
};

exports.updateQualification = function (_id, qualification, provider, dbTableName = 'call_history') {
    if (!qualification) return null;

    const toInt = (value)  => (value === false || value === 'false') ? 0 : Number(value);
    const query = {
        qualification_id: qualification['id'] || null,
        qualification_name: qualification['name'] || null,
        qualification_behavior: qualification['behavior'] || null,
        qualification_behavior_text: qualification['behavior_text'] || null,
        qualification_conversion: qualification['conversion'] != undefined ? toInt(qualification['conversion']) : null,
        qualification_is_dmc: qualification['dmc'] != undefined ? toInt(qualification['dmc']) : null,
        qualification_is_unknown: qualification['unknown'] != undefined ? toInt(qualification['unknown']) : null,
    };

    return `UPDATE ${dbTableName} SET ${Object.entries(query).map(([key, value]) => `${key} = ${escapeValue(value, provider)}`).join(', ')} WHERE _id = '${_id}';`;
}

exports.generateMultiRowInsert = function (rowDataArray, dbName, dbTable, databaseProvider) {
    if (rowDataArray.length === 0) return null;

    let columns = '';
    let values = '';
    if (rowDataArray.length > 1) {
        columns = Object.keys(rowDataArray[0]).join(', ');
        values = rowDataArray.map(rowData => {
            return Object.values(rowData)
                .map(value => escapeValue(value, databaseProvider))
                .join(', ');
        });
    } else {
        columns = Object.keys(rowDataArray[0]).join(', ');
        values = `(${Object.values(rowDataArray[0]).map(value => escapeValue(value, databaseProvider)).join(', ')})`;
    }

    let insertQuery = '';
    switch (String(databaseProvider).trim().toLowerCase()) {
        case 'sqlserver':
            if (rowDataArray.length > 1) {
                insertQuery = `INSERT INTO "${dbName}".dbo.${dbTable} (${columns}) VALUES (${values.join('), (')});`;
            } else {
                insertQuery = `INSERT INTO ${dbTable} (${columns}) VALUES ${values};`;
            }
            break;
        case 'pgsql':
            if (rowDataArray.length > 1) {
                insertQuery = `INSERT INTO ${dbTable} (${columns}) VALUES (${values.join('), (')});`;
            } else {
                insertQuery = `INSERT INTO ${dbTable} (${columns}) VALUES ${values};`;
            }
            break;
        case 'mysql':
            if (rowDataArray.length > 1) {
                insertQuery = `INSERT INTO ${dbName}.${dbTable} (${columns}) VALUES (${values.join('), (')});`;
            } else {
                insertQuery = `INSERT INTO ${dbTable} (${columns}) VALUES ${values};`;
            }
            break;
        default:
            throw new Error('[generateMultiRowInsert] - Unsupported database provider');
    }

    return insertQuery;
}

function escapeValue(value, databaseProvider) {
    if (value === null || value === undefined) {
        return 'NULL';
    } else if (typeof value === 'string') {
        switch (databaseProvider) {
            case 'sqlserver':
                return `'${value.replace(/'/g, "''")}'`;
            case 'pgsql':
                // Escape single quotes inside strings for PostgreSQL by doubling them
                return `'${value.replace(/'/g, "''")}'`;
            case 'mysql':
                // Escape single quotes inside strings for MySQL by using a backslash
                return `'${value.replace(/'/g, "\\'")}'`;
            default:
                throw new Error('[escapeValue 1] - Unsupported database provider');
        }
    } else if (typeof value === 'boolean') {
        switch (databaseProvider) {
            case 'sqlserver':
                return value ? '1' : '0';
            case 'pgsql':
                return value ? 'TRUE' : 'FALSE';
            case 'mysql':
                return value ? 'TRUE' : 'FALSE';
            default:
                throw new Error('[escapeValue 2] - Unsupported database provider');
        }
    }
    return value;
}

exports.mapCallHistory = async function (data, provider) {
    try {
        return data.map(event => mapDataCallHistory(event.callHistory, provider));
    } catch (error) {
        console.error(`${new Date().toISOString()} - [MapCallHistory] - Error occurred: ${error}`);
        return [];
    }
}

exports.mapWorkBreak = async function (data, provider) {
    try {
        return data.map(event => mapDataAgentLeftWorkBreak(event));
    } catch (error) {
        console.error(`${new Date().toISOString()} - [MapWorkBreak] - Error occurred: ${error}`);
        return [];
    }
}

exports.mapAgentLoggedOut = async function (data, provider) {
    try {
        return data.map(event => mapDataAgentWasLoggedOut(event));
    } catch (error) {
        console.error(`${new Date().toISOString()} - [MapAgentLoggedOut] - Error occurred: ${error}`);
        return [];
    }
}

exports.mapSchema = function (schema, dbProvider) {
    return Object.entries(schema).map(([key, value]) => {
        if (dbProvider === 'pgsql') {
            if (value === 'DATETIME') value = 'timestamp';
            if (value === 'BIT') value = 'BOOLEAN';
            if (['NVARCHAR(MAX)', 'VARCHAR(MAX)'].includes(value)) value = 'TEXT';
        } else if (dbProvider === 'mysql') {
            if (value === 'BIT') value = 'TINYINT(1)';
            if (['NVARCHAR(MAX)', 'VARCHAR(MAX)'].includes(value)) value = 'TEXT';
        }
        // SQL Server type mappings remain the same
        return `${key} ${value}`;
    }).join(', ');
}

exports.runQuery = async function (pool, query) {
    try {
        await pool.query(query);
        console.log(`${new Date().toISOString()} - [INSERT DATA] - successfully inserted data`);
    } catch (error) {
        console.error(`${new Date().toISOString()} - [INSERT DATA] - error at inserting query`);
        console.error(`${new Date().toISOString()} - [INSERT DATA] - query: ${query}`);
        console.error(`${new Date().toISOString()} - [INSERT DATA] - error: ${error}`);
    }
};

exports.processBuffer = async function (queueHandler, dataBuffer) {
    try {
        // Convert the buffer to JSON string and insert into Redis list
        const jsonData = JSON.stringify(dataBuffer);
        await queueHandler.queue.add(queueHandler.company_queue, { jsonData });
    } catch (error) {
        console.error(`${new Date().toISOString()} - Error processing buffer: ${error}`);
    }
}
