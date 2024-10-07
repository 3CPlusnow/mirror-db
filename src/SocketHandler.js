const io = require("socket.io-client");

const { processBuffer, generateMultiRowInsert, runQuery, updateQualification } = require('./utils');
const { AgentLeftWorkBreakMap: mapDataAgentLeftWorkBreak } = require('./schemas/WorkbreakHistorySchema');
const { AgentWasLoggedOutMap: mapDataAgentWasLoggedOut } = require('./schemas/LoginHistorySchema');
const { ChatHistoryMap: mapDataFinishWhatsappChat } = require('./schemas/WhatsappChatFinishedSchema');

class SocketHandler {
  constructor(envContent, pool) {
    this.env = envContent;
    this.pool = pool;

    this.socket = io(this.env.socketServer, {
      reconnection: true,
      transports: ["websocket"],
      query: { token: this.env.socketToken },
    });
    this.batchSize = parseInt(this.env.batchSize, 10);
    this.eventBatch = [];
  }

  handleCallHistoryEvent(event, queueHandler) {
    if (Number(this.env.companyId) !== Number(event.callHistory.company.id)) {
      return;
    }

    event.callHistory.hangupCause = event.hangupCause || null;
    this.eventBatch.push(event);

    if (this.eventBatch.length >= this.batchSize) {
      processBuffer(queueHandler, this.eventBatch);
      this.eventBatch = [];
      console.log(`${new Date().toISOString()} - 
        [SOCKET HANDLER] - ${this.env.companyDomain}_${this.env.companyId} - 
          batch of ${this.batchSize} inserted into DB ${this.env.dbName} TABLE ${this.env.dbTableName}
      `);
    }
  }

  async handleAgentLeftWorkBreak(pool, event) {
    if (Number(this.env.companyId) !== Number(event.agent.company_id)) {
      return;
    }

    try {
      const rawDataMapped = mapDataAgentLeftWorkBreak(event);
      if (rawDataMapped.length === 0) {
        throw new Error('No data received to create a query');
      }
      const query = generateMultiRowInsert([rawDataMapped], this.env.dbName, 'work_break_history', this.env.dbProvider);
      if (!query) throw new Error('Generating multi insert query for: ', rowDataArray);

      await runQuery(pool, query);
      console.log(`${new Date().toISOString()} - 
        [SOCKET HANDLER] - ${this.env.companyDomain}_${this.env.companyId} - inserted into DB ${this.env.dbName} TABLE 'work_break_history'
      `);
    } catch (error) {
      console.error(`${new Date().toISOString()} - [SOCKET HANDLER] - Error at mapping agent left workbreak events: ${error}`);
    }
  }

  async handleAgentWasLoggedOut(pool, event) {
    if (Number(this.env.companyId) !== Number(event.agent.company_id)) {
      return;
    }

    try {
      const rawDataMapped = mapDataAgentWasLoggedOut(event);
      if (rawDataMapped.length === 0) {
        throw new Error('No data received to create a query');
      }
      const query = generateMultiRowInsert([rawDataMapped], this.env.dbName, 'login_history', this.env.dbProvider);
      if (!query) throw new Error('Generating multi insert query for: ', rowDataArray);

      await runQuery(pool, query);
      console.log(`${new Date().toISOString()} - 
        [SOCKET HANDLER] - ${this.env.companyDomain}_${this.env.companyId} - inserted into DB ${this.env.dbName} TABLE 'login_history'
      `);
    } catch (error) {
      console.error(`${new Date().toISOString()} - [SOCKET HANDLER] - Error at mapping agent was logged out events: ${error}`);
    }
  }

  async handleManualCallWasUpdated(pool, event) {
    if (Number(this.env.companyId) !== Number(event.callHistory['company']['id'])) {
      return;
    }

    try {
      const tableName = this.env.dbTableName || 'call_history';
      const query = updateQualification(event.callHistory['_id'], event.callHistory['qualification'], this.env.dbProvider, tableName);
      if (!query) throw new Error('Generating query to update call_history on manual call: ', rowDataArray);

      await runQuery(pool, query);
      console.log(`${new Date().toISOString()} - 
        [SOCKET HANDLER] - ${this.env.companyDomain}_${this.env.companyId} - updated ${event.callHistory['_id']} into DB ${this.env.dbName} TABLE '${tableName}'
      `);
    } catch (error) {
      console.error(`${new Date().toISOString()} - [SOCKET HANDLER] - Error at mapping manual call was update events: ${error}`);
    }
  }

  async handleChatHistory(pool, event) {
    if (Number(this.env.companyId) !== Number(event.chat.instance.company_id)) {
      return;
    }

    try {
      const rawDataMapped = mapDataFinishWhatsappChat(event, this.env.dbProvider);
      if (rawDataMapped.length === 0) {
        throw new Error('No data received to create a query');
      }
      const query = generateMultiRowInsert([rawDataMapped], this.env.dbName, 'chat_history', this.env.dbProvider);
      if (!query) throw new Error('Generating multi insert query for: ', rowDataArray);

      await runQuery(pool, query);
      console.log(`${new Date().toISOString()} - 
        [SOCKET HANDLER] - ${this.env.companyDomain}_${this.env.companyId} - inserted into DB ${this.env.dbName} TABLE 'chat_history'
      `);
    } catch (error) {
      console.error(`${new Date().toISOString()} - [SOCKET HANDLER] - Error at mapping finish whatsapp chat events: ${error}`);
    }
  }

  start(pool, queueHandler) {
    if (String(this.env.socketEventEnabled).includes('call_history')) {
      this.socket.on("call-history-was-created", (event) => {
        this.handleCallHistoryEvent(event, queueHandler);
      });

      this.socket.on("manual-call-was-updated", (event) => {
        this.handleManualCallWasUpdated(pool, event);
      });
    }

    if (String(this.env.socketEventEnabled).includes('login_history')) {
      this.socket.on("agent-was-logged-out", (event) => {
        this.handleAgentWasLoggedOut(pool, event);
      });
    }

    if (String(this.env.socketEventEnabled).includes('work_break_history')) {
      this.socket.on("agent-left-work-break", (event) => {
        this.handleAgentLeftWorkBreak(pool, event);
      });
    }

    if (String(this.env.socketEventEnabled).includes('chat_history')) {
      this.socket.on("finish-chat-whatsapp", (event) => {
        this.handleChatHistory(pool, event);
      });
    }

    this.socket.on("connect", () => {
      console.log(`${new Date().toISOString()} - Socket.IO is connected`);
    });

    this.socket.on("disconnect", (reason) => {
      console.error(`${new Date().toISOString()} - Socket.IO is disconnected: ${reason}`);
    });

    this.socket.on("error", (error) => {
      console.error(`${new Date().toISOString()} - Socket.IO error: ${error}`);
    });

    this.socket.on("connect_error", (error) => {
      console.error(`${new Date().toISOString()} - Socket.IO connection error: ${error}`);
    });

    this.socket.on("reconnect", (error) => {
      console.error(`${new Date().toISOString()} - Socket.IO reconnect: ${error}`);
    });

    this.socket.on("reconnect_attempt", (attempt) => {
      console.error(`${new Date().toISOString()} - Socket.IO reconnection attempt: ${attempt}`);
    });

    this.socket.on("reconnect_failed", () => {
      console.error(`${new Date().toISOString()} - Socket.IO reconnection failed`);
    });
  }
}

module.exports = SocketHandler;

