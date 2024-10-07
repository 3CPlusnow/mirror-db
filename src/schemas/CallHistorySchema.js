const CallHistorySchema = {
    _id: "VARCHAR(255) PRIMARY KEY",
    number: "VARCHAR(255)",
    campaign_id: "INT",
    campaign_name: "VARCHAR(255)",
    company_id: "INT",
    company_name: "VARCHAR(255)",
    phone_type: "VARCHAR(255)",
    agent_id: "INT",
    agent_name: "VARCHAR(255)",
    route_id: "INT",
    route_name: "VARCHAR(255)",
    route_host: "VARCHAR(255)",
    route_route: "INT",
    route_endpoint: "VARCHAR(255)",
    route_caller_id: "INT",
    telephony_id: "VARCHAR(255)",
    status: "INT",
    qualification_id: "VARCHAR(255)",
    qualification_name: "VARCHAR(255)",
    qualification_behavior: "INT",
    qualification_behavior_text: "VARCHAR(255)",
    qualification_conversion: "BIT",
    qualification_is_dmc: "BIT",
    qualification_is_unknown: "BIT",
    qualification_note: "TEXT",
    billed_time: "INT",
    billed_value: "FLOAT",
    rate_value: "FLOAT",
    amd_status: "INT",
    hangup_cause: "INT",
    recorded: "BIT",
    ended_by_agent: "BIT",
    sid: "VARCHAR(255)",
    call_mode: "VARCHAR(255)",
    list_id: "INT",
    list_name: "VARCHAR(255)",
    list_original_name: "VARCHAR(255)",
    call_date: "DATETIME",
    calling_time: "INT",
    waiting_time: "INT",
    speaking_time: "INT",
    speaking_with_agent_time: "INT",
    acw_time: "INT",
    receptive_name: "VARCHAR(255)",
    receptive_phone: "VARCHAR(255)",
    receptive_did: "VARCHAR(255)",
    queue_id: "INT",
    queue_name: "VARCHAR(255)",
    ivr_id: "INT",
    ivr_name: "VARCHAR(255)",
    parent_id: "VARCHAR(255)",
    random_consult_id: "VARCHAR(255)",
    transfer_recording: "VARCHAR(255)",
    ivr_after_call: "BIT",
    criteria: "TEXT",
    max_time_exceeded: "INT",
    custom_updated_at: "DATETIME",
    custom_created_at: "DATETIME",
    hangup_cause_text: "VARCHAR(50)",
    hangup_cause_color: "VARCHAR(16)",
    hangup_cause_id: "INT",
    hangup_cause_sip: "VARCHAR(255)",
    mailing_data: "NVARCHAR(MAX)",
    identifier: "VARCHAR(255)",
};

const CallHistoryMap = (callHistory, provider) => {
    let mappedField = {
        _id: callHistory?._id || null,
        number: callHistory?.number || null,
        phone_type: callHistory?.phone_type || null,
        telephony_id: callHistory?.telephony_id || null,
        status: callHistory?.status || null,
        rate_value: callHistory?.rate_value || null,
        amd_status: callHistory?.amd_status || null,
        hangup_cause: callHistory?.hangup_cause || null,
        recorded: formatRecord(callHistory?.recorded, provider),
        billed_time: callHistory?.billed_time || null,
        billed_value: callHistory?.billed_value || null,
        ended_by_agent: callHistory?.ended_by_agent || null,
        qualification_note: callHistory?.qualification_note || null,
        sid: callHistory?.sid || null,
        call_mode: callHistory?.call_mode || null,
        list_id: callHistory?.list?.id || null,
        list_name: callHistory?.list?.name || null,
        list_original_name: callHistory?.list?.original_name || null,
        call_date: formatDateForProvider(callHistory?.call_date, provider),
        calling_time: callHistory?.calling_time || null,
        waiting_time: callHistory?.waiting_time || null,
        speaking_time: callHistory?.speaking_time || null,
        speaking_with_agent_time: callHistory?.speaking_with_agent_time || null,
        acw_time: callHistory?.acw_time || null,
        receptive_name: callHistory?.receptive_name || null,
        receptive_phone: callHistory?.receptive_phone || null,
        receptive_did: callHistory?.receptive_did || null,
        parent_id: callHistory?.parent_id || null,
        random_consult_id: callHistory?.random_consult_id || null,
        transfer_recording: callHistory?.transfer_recording || null,
        ivr_after_call: callHistory?.ivr_after_call || null,
        criteria: callHistory?.criteria || null,
        max_time_exceeded: callHistory?.max_time_exceeded || null,
        custom_updated_at: formatDateForProvider(callHistory?.updated_at, provider),
        custom_created_at: formatDateForProvider(callHistory?.created_at, provider),
        hangup_cause_text: callHistory?.hangupCause?.text || null,
        hangup_cause_color: callHistory?.hangupCause?.color || null,
        hangup_cause_id: callHistory?.hangupCause?.id || null,
        hangup_cause_sip: callHistory?.hangupCause?.sip || null,
    
        campaign_id: callHistory?.campaign?.id || null,
        campaign_name: callHistory?.campaign?.name || null,
    
        company_id: callHistory?.company?.id || null,
        company_name: callHistory?.company?.name || null,
    
        agent_id: callHistory?.agent?.id || null,
        agent_name: callHistory?.agent?.name || null,
    
        route_id: callHistory?.route?.id || null,
        route_name: callHistory?.route?.name || null,
        route_host: callHistory?.route?.host || null,
        route_route: callHistory?.route?.route || null,
        route_endpoint: callHistory?.route?.endpoint || null,
        route_caller_id: callHistory?.route?.caller_id || null,
    
        qualification_id: callHistory?.qualification?.id || null,
        qualification_name: callHistory?.qualification?.name || null,
        qualification_behavior: callHistory?.qualification?.behavior || null,
        qualification_behavior_text: callHistory?.qualification?.behavior_text || null,
        qualification_conversion: callHistory?.qualification?.conversion || null,
        qualification_is_dmc: callHistory?.qualification?.is_dmc || null,
        qualification_is_unknown: callHistory?.qualification?.is_unknown || null,
    
        queue_id: callHistory?.queue?.id || null,
        queue_name: callHistory?.queue?.name || null,
    
        ivr_id: callHistory?.ivr?.id || null,
        ivr_name: callHistory?.ivr?.name || null,
    
        mailing_data: callHistory?.mailing_data ? JSON.stringify(callHistory?.mailing_data) : null,
        identifier: callHistory?.mailing_data ? callHistory?.mailing_data?.identifier : null,
    };

    if (provider === 'sqlserver') {
        mappedField = {
            ...mappedField,
            qualification_conversion: mappedField.qualification_conversion ? 1 : 0,
            qualification_is_dmc: mappedField.qualification_is_dmc ? 1 : 0,
            qualification_is_unknown: mappedField.qualification_is_unknown ? 1 : 0,
            recorded: mappedField.recorded ? 1 : 0,
            ended_by_agent: mappedField.ended_by_agent ? 1 : 0,
            ivr_after_call: mappedField.ivr_after_call ? 1 : 0,
        };
    }

    return mappedField;
};

function formatRecord(record, provider) {
    if (provider == 'sqlserver') return record ? 1 : 0;
    return record ? true : false;
}

function formatDateForProvider(date, provider) {
    if (!date) return null;

    let formattedDate = new Date(date).toISOString();
    if (provider === 'mysql') {
        return formattedDate.slice(0, 19).replace('T', ' ');
    }

    return formattedDate;
}


module.exports = {
    CallHistorySchema,
    CallHistoryMap
};
