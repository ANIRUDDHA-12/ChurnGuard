/**
 * Audit Log Service
 * ==================
 * Tracks all user actions for compliance and debugging.
 * Stores logs in Supabase audit_logs table.
 */

const { supabase } = require('./supabase');

// Audit action types
const AUDIT_ACTIONS = {
    INTERVENTION_CREATED: 'intervention_created',
    INTERVENTION_COMPLETED: 'intervention_completed',
    USER_FLAGGED: 'user_flagged',
    SENTINEL_TRIGGERED: 'sentinel_triggered',
    CONFIG_CHANGED: 'config_changed',
    EMAIL_SENT: 'email_sent',
    MODEL_RETRAINED: 'model_retrained',
    LOGIN: 'login',
    LOGOUT: 'logout',
};

/**
 * Log an audit event
 */
async function logAudit(action, actor, details = {}) {
    try {
        const { error } = await supabase
            .from('audit_logs')
            .insert({
                action,
                actor: actor || 'system',
                details,
                ip_address: details.ip || null,
                user_agent: details.userAgent || null,
                created_at: new Date().toISOString(),
            });

        if (error) {
            console.error('Audit log failed:', error.message);
            return false;
        }

        console.log(`📝 Audit: ${action} by ${actor}`);
        return true;
    } catch (err) {
        console.error('Audit log error:', err.message);
        return false;
    }
}

/**
 * Get recent audit logs
 */
async function getAuditLogs(limit = 50, filters = {}) {
    try {
        let query = supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (filters.action) {
            query = query.eq('action', filters.action);
        }
        if (filters.actor) {
            query = query.eq('actor', filters.actor);
        }
        if (filters.since) {
            query = query.gte('created_at', filters.since);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return data || [];
    } catch (err) {
        console.error('Failed to fetch audit logs:', err.message);
        return [];
    }
}

/**
 * Get audit logs summary (for dashboard)
 */
async function getAuditSummary() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('audit_logs')
            .select('action')
            .gte('created_at', today.toISOString());

        if (error) throw error;

        // Count by action type
        const counts = {};
        for (const log of data || []) {
            counts[log.action] = (counts[log.action] || 0) + 1;
        }

        return {
            total: data?.length || 0,
            byAction: counts,
            date: today.toISOString().split('T')[0],
        };
    } catch (err) {
        console.error('Failed to get audit summary:', err.message);
        return { total: 0, byAction: {}, date: null };
    }
}

module.exports = {
    AUDIT_ACTIONS,
    logAudit,
    getAuditLogs,
    getAuditSummary,
};
