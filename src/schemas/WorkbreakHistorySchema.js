const { convertToDateTimeString } = require('./../utils');

const AgentLeftWorkBreakSchema = {
    agent_id: "INT",
    agent_name: "VARCHAR(255)",
    work_break_interval_name: "VARCHAR(255)",
    work_break_interval_id: "INT",
    work_break_interval_start: "DATETIME",
    work_break_interval_end: "DATETIME",
};


const AgentLeftWorkBreakMap = (eventData) => {
    const agent = eventData.agent || {};
    const workBreak = eventData.work_break || {};
    return {
        agent_id: agent.id || null,
        agent_name: agent.name || null,
        work_break_interval_name: workBreak.work_break_interval_name || null,
        work_break_interval_id: workBreak.work_break_interval_id || null,
        work_break_interval_start: workBreak.work_break_interval_start ? convertToDateTimeString(workBreak.work_break_interval_start) : null,
        work_break_interval_end: workBreak.work_break_interval_end ? convertToDateTimeString(workBreak.work_break_interval_end) : null,
    };
};

module.exports = {
    AgentLeftWorkBreakSchema,
    AgentLeftWorkBreakMap
};