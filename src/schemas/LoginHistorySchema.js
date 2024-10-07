const { convertToDateTimeString } = require('./../utils');

const AgentWasLoggedOutSchema = {
    agent_id: "INT",
    agent_name: "VARCHAR(255)",
    extension_number: "INT",
    login_time: "DATETIME",
    logout_time: "DATETIME",
};

const AgentWasLoggedOutMap = (eventData) => {
    const agent = eventData.agent || {};
    const extension = agent.extension || {};

    return {
        agent_id: agent.id || null,
        agent_name: agent.name || null,
        extension_number: extension.extension_number || null,
        login_time: eventData.login_time ? convertToDateTimeString(eventData.login_time) : null,
        logout_time: eventData.logout_time ? convertToDateTimeString(eventData.logout_time) : null,
    };
};

module.exports = {
    AgentWasLoggedOutSchema,
    AgentWasLoggedOutMap
};