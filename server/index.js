require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { supabase } = require('./lib/supabase');
const { getConfig, updateConfig } = require('./lib/sentinelConfig');
const { initSentinel, startSentinel, triggerManualRun } = require('./sentinel');
const { initOptimizer, startOptimizer, triggerManualAttribution } = require('./optimizer');
const { initEmailService, sendInterventionEmail, getEmailPreview } = require('./lib/emailService');
const { logAudit, getAuditLogs, getAuditSummary, AUDIT_ACTIONS } = require('./lib/auditLog');
const { ROLES, PERMISSIONS, requirePermission, getRoleInfo } = require('./lib/rbac');

const app = express();
const httpServer = createServer(app);

// CORS origins - include production URL from env
const corsOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    process.env.CORS_ORIGIN // Production frontend URL
].filter(Boolean);

// Socket.IO with CORS
const io = new Server(httpServer, {
    cors: {
        origin: corsOrigins,
        methods: ['GET', 'POST']
    }
});

app.use(cors({ origin: corsOrigins }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/intervene - Record an intervention action
 * Body: { userId: string, actionType: 'nudge' | 'support' | 'offer', metadata?: object }
 */
app.post('/api/intervene', async (req, res) => {
    const { userId, actionType, metadata = {} } = req.body;

    // Validate required fields
    if (!userId || !actionType) {
        return res.status(400).json({
            success: false,
            error: 'userId and actionType are required'
        });
    }

    // Validate action type
    const validActions = ['nudge', 'support', 'offer'];
    if (!validActions.includes(actionType)) {
        return res.status(400).json({
            success: false,
            error: `Invalid actionType. Must be one of: ${validActions.join(', ')}`
        });
    }

    try {
        const { data, error } = await supabase
            .from('interventions')
            .insert({
                user_id: userId,
                action_type: actionType,
                status: 'completed',
                source: 'manual',
                metadata: metadata,
                completed_at: new Date().toISOString()
            })
            .select();

        if (error) {
            console.error('❌ Intervention Error:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }

        console.log(`✅ Intervention recorded: ${actionType} for user ${userId}`);

        // Emit socket event for real-time dashboard update
        io.emit('INTERVENTION_RECORDED', {
            userId,
            actionType,
            interventionId: data[0]?.id,
            timestamp: new Date().toISOString()
        });

        // Log audit event
        await logAudit(AUDIT_ACTIONS.INTERVENTION_CREATED, 'admin', {
            userId,
            actionType,
            interventionId: data[0]?.id
        });

        return res.json({
            success: true,
            intervention: data[0],
            message: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} action recorded successfully`
        });
    } catch (err) {
        console.error('❌ Server Error:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/interventions - Get all interventions
 */
app.get('/api/interventions', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('interventions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        return res.json({ success: true, interventions: data });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * Persist user action to Supabase database
 * @param {string} socketId - The socket connection ID
 * @param {string} actionType - The type of action performed
 * @param {object} metadata - Additional action metadata
 */
async function persistUserAction(socketId, actionType, metadata) {
    try {
        const { data, error } = await supabase
            .from('user_activity')
            .insert({
                socket_id: socketId,
                action_type: actionType,
                metadata: metadata,
                timestamp: new Date().toISOString()
            })
            .select();

        if (error) {
            console.error('❌ Supabase Insert Error:', error.message);
            console.error('   Details:', error.details || 'No additional details');
            return { success: false, error: error.message };
        }

        console.log('✅ Data Persisted:', {
            id: data[0]?.id,
            action: actionType,
            timestamp: data[0]?.timestamp
        });
        return { success: true, data: data[0] };
    } catch (err) {
        console.error('❌ Database Error:', err.message);
        return { success: false, error: err.message };
    }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('✅ A user connected:', socket.id);

    // Listen for USER_ACTION events
    socket.on('USER_ACTION', async (data) => {
        const timestamp = new Date().toISOString();
        console.log(`🎯 [${timestamp}] USER_ACTION received:`, {
            socketId: socket.id,
            action: data.action,
            metadata: data.metadata || {}
        });

        // Persist to Supabase
        const result = await persistUserAction(
            socket.id,
            data.action,
            data.metadata || {}
        );

        // Acknowledge the action back to the client
        socket.emit('ACTION_ACK', {
            success: result.success,
            action: data.action,
            timestamp,
            persisted: result.success
        });
    });

    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║   🛡️  ChurnGuard Server Running           ║
  ║   📡 Socket.IO listening on port ${PORT}     ║
  ║   🔗 http://localhost:${PORT}               ║
  ╚═══════════════════════════════════════════╝
  `);

    // Initialize and start Sentinel
    initSentinel(io);
    startSentinel();

    // Initialize and start Optimizer
    initOptimizer(io);
    startOptimizer();

    // Initialize Email Service
    initEmailService();
});

// ============================================
// Sentinel API Endpoints
// ============================================

/**
 * GET /api/sentinel/status - Get current Sentinel configuration and stats
 */
app.get('/api/sentinel/status', (req, res) => {
    const config = getConfig();
    res.json({
        success: true,
        sentinel: {
            enabled: config.enabled,
            dryRun: config.dryRun,
            thresholds: config.thresholds,
            intervalMinutes: config.intervalMinutes,
            chunkSize: config.chunkSize,
            maxActionsPerRun: config.maxActionsPerRun,
            cooldownHours: config.cooldownHours,
            humanPriorityHours: config.humanPriorityHours,
            stats: config.stats
        }
    });
});

/**
 * POST /api/sentinel/config - Update Sentinel configuration
 */
app.post('/api/sentinel/config', (req, res) => {
    const updates = req.body;
    const newConfig = updateConfig(updates);

    console.log(`🛡️ Sentinel config updated:`, updates);

    // Emit config update to clients
    io.emit('SENTINEL_CONFIG', newConfig);

    res.json({ success: true, sentinel: newConfig });
});

/**
 * POST /api/sentinel/run - Manually trigger a Sentinel cycle
 */
app.post('/api/sentinel/run', (req, res) => {
    console.log('🛡️ Manual Sentinel trigger requested');
    triggerManualRun();
    res.json({ success: true, message: 'Sentinel cycle triggered' });
});

/**
 * GET /api/sentinel/history - Get recent Sentinel actions
 */
app.get('/api/sentinel/history', async (req, res) => {
    const limit = parseInt(req.query.limit) || 20;

    try {
        const { data, error } = await supabase
            .from('interventions')
            .select('*')
            .eq('source', 'sentinel')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        return res.json({ success: true, history: data || [] });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// Optimizer API Endpoints
// ============================================

/**
 * POST /api/optimizer/run - Manually trigger attribution cycle
 */
app.post('/api/optimizer/run', (req, res) => {
    console.log('📊 Manual optimizer trigger requested');
    triggerManualAttribution();
    res.json({ success: true, message: 'Attribution cycle triggered' });
});

/**
 * GET /api/efficacy - Get intervention efficacy stats
 */
app.get('/api/efficacy', async (req, res) => {
    try {
        // Get all attributed interventions
        const { data, error } = await supabase
            .from('interventions')
            .select('action_type, outcome')
            .not('outcome', 'eq', 'pending');

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        // Calculate success rates per action type
        const stats = {};
        for (const row of data || []) {
            const action = row.action_type;
            if (!stats[action]) {
                stats[action] = { total: 0, successes: 0, failures: 0 };
            }
            stats[action].total++;
            if (row.outcome === 'success') stats[action].successes++;
            if (row.outcome === 'failure') stats[action].failures++;
        }

        // Calculate rates
        const efficacy = Object.entries(stats).map(([action, data]) => ({
            action,
            total: data.total,
            successes: data.successes,
            failures: data.failures,
            successRate: data.total > 0 ? Math.round((data.successes / data.total) * 100) : 0
        }));

        return res.json({ success: true, efficacy });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// Analytics API Endpoints
// ============================================

/**
 * GET /api/analytics/trends - Get churn trend data over time
 */
app.get('/api/analytics/trends', async (req, res) => {
    try {
        // Get interventions grouped by date for the last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data: interventions, error } = await supabase
            .from('interventions')
            .select('created_at, outcome, action_type')
            .gte('created_at', thirtyDaysAgo)
            .order('created_at', { ascending: true });

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        // Group by date
        const trendMap = {};
        for (const int of interventions || []) {
            const date = int.created_at.split('T')[0];
            if (!trendMap[date]) {
                trendMap[date] = { date, total: 0, successes: 0, failures: 0 };
            }
            trendMap[date].total++;
            if (int.outcome === 'success') trendMap[date].successes++;
            if (int.outcome === 'failure') trendMap[date].failures++;
        }

        const trends = Object.values(trendMap).map(d => ({
            ...d,
            successRate: d.total > 0 ? Math.round((d.successes / d.total) * 100) : 0
        }));

        return res.json({ success: true, trends });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/analytics/roi - Calculate ROI per intervention type
 */
app.get('/api/analytics/roi', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('interventions')
            .select('action_type, outcome')
            .not('outcome', 'eq', 'pending');

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        // Average customer LTV = $500, average intervention cost estimates
        const LTV = 500;
        const costs = { nudge: 2, support: 15, offer: 50 };

        const stats = {};
        for (const row of data || []) {
            const action = row.action_type;
            if (!stats[action]) {
                stats[action] = { total: 0, successes: 0, cost: costs[action] || 10 };
            }
            stats[action].total++;
            if (row.outcome === 'success') stats[action].successes++;
        }

        const roi = Object.entries(stats).map(([action, d]) => {
            const savedRevenue = d.successes * LTV;
            const totalCost = d.total * d.cost;
            const netROI = savedRevenue - totalCost;
            return {
                action,
                total: d.total,
                successes: d.successes,
                cost: totalCost,
                savedRevenue,
                netROI,
                roiPercent: totalCost > 0 ? Math.round((netROI / totalCost) * 100) : 0
            };
        });

        return res.json({ success: true, roi, ltv: LTV });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/analytics/cohorts - Cohort analysis by month
 */
app.get('/api/analytics/cohorts', async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('user_segments')
            .select('days_since_signup, is_churned');

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        // Group by signup month (approximate from days_since_signup)
        const cohortMap = {};
        for (const user of users || []) {
            const monthsAgo = Math.floor(user.days_since_signup / 30);
            const cohortLabel = monthsAgo <= 1 ? '0-1 months' :
                monthsAgo <= 3 ? '1-3 months' :
                    monthsAgo <= 6 ? '3-6 months' : '6+ months';

            if (!cohortMap[cohortLabel]) {
                cohortMap[cohortLabel] = { cohort: cohortLabel, total: 0, churned: 0 };
            }
            cohortMap[cohortLabel].total++;
            if (user.is_churned) cohortMap[cohortLabel].churned++;
        }

        const cohorts = Object.values(cohortMap).map(c => ({
            ...c,
            churnRate: c.total > 0 ? Math.round((c.churned / c.total) * 100) : 0
        }));

        return res.json({ success: true, cohorts });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/analytics/summary - Overall analytics summary
 */
app.get('/api/analytics/summary', async (req, res) => {
    try {
        // Get total interventions
        const { count: totalInterventions } = await supabase
            .from('interventions')
            .select('*', { count: 'exact', head: true });

        // Get success count
        const { count: successCount } = await supabase
            .from('interventions')
            .select('*', { count: 'exact', head: true })
            .eq('outcome', 'success');

        // Get total users
        const { count: totalUsers } = await supabase
            .from('user_segments')
            .select('*', { count: 'exact', head: true });

        // Get high risk users
        const { data: highRiskData } = await supabase
            .from('user_segments')
            .select('is_churned')
            .eq('is_churned', false);

        const LTV = 500;
        const estimatedSaved = (successCount || 0) * LTV;

        return res.json({
            success: true,
            summary: {
                totalInterventions: totalInterventions || 0,
                successfulInterventions: successCount || 0,
                successRate: totalInterventions > 0 ? Math.round((successCount / totalInterventions) * 100) : 0,
                totalUsers: totalUsers || 0,
                estimatedRevenueSaved: estimatedSaved
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// Email & Intervention Endpoints
// ============================================

/**
 * GET /api/email/preview/:actionType - Get email preview HTML
 */
app.get('/api/email/preview/:actionType', (req, res) => {
    const { actionType } = req.params;
    const preview = getEmailPreview(actionType, { name: 'John Doe' });

    if (!preview) {
        return res.status(400).json({ success: false, error: 'Unknown action type' });
    }

    return res.json({ success: true, preview });
});

/**
 * POST /api/email/send - Send intervention email
 */
app.post('/api/email/send', async (req, res) => {
    const { userId, actionType, userData = {} } = req.body;

    if (!userId || !actionType) {
        return res.status(400).json({ success: false, error: 'userId and actionType required' });
    }

    const result = await sendInterventionEmail(userId, actionType, userData);
    return res.json(result);
});

/**
 * POST /api/priority-queue - Add user to priority support queue
 */
app.post('/api/priority-queue', async (req, res) => {
    const { userId, reason, priority = 'high' } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, error: 'userId required' });
    }

    try {
        // Insert into interventions with priority flag
        const { data, error } = await supabase
            .from('interventions')
            .insert({
                user_id: userId,
                action_type: 'priority_support',
                status: 'pending',
                source: 'manual',
                metadata: { reason, priority, queued_at: new Date().toISOString() }
            })
            .select();

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        // Emit socket event for real-time update
        io.emit('PRIORITY_QUEUE_UPDATE', { userId, reason, priority, timestamp: new Date().toISOString() });

        console.log(`🚨 Priority queue: ${userId} (${priority}) - ${reason}`);

        return res.json({ success: true, queued: data[0] });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * GET /api/priority-queue - Get priority queue users
 */
app.get('/api/priority-queue', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('interventions')
            .select('*')
            .eq('action_type', 'priority_support')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        return res.json({ success: true, queue: data || [] });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// Audit Log & RBAC Endpoints
// ============================================

/**
 * GET /api/audit/logs - Get recent audit logs
 */
app.get('/api/audit/logs', async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await getAuditLogs(limit, {
        action: req.query.action,
        actor: req.query.actor,
    });
    return res.json({ success: true, logs, count: logs.length });
});

/**
 * GET /api/audit/summary - Get today's audit summary
 */
app.get('/api/audit/summary', async (req, res) => {
    const summary = await getAuditSummary();
    return res.json({ success: true, summary });
});

/**
 * GET /api/role/:role - Get role info and permissions
 */
app.get('/api/role/:role', (req, res) => {
    const { role } = req.params;
    const info = getRoleInfo(role);
    return res.json({ success: true, ...info });
});

/**
 * GET /api/roles - Get all available roles
 */
app.get('/api/roles', (req, res) => {
    return res.json({
        success: true,
        roles: Object.values(ROLES),
        permissions: Object.values(PERMISSIONS),
    });
});
