require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { supabase } = require('./lib/supabase');
const { getConfig, updateConfig } = require('./lib/sentinelConfig');
const { initSentinel, startSentinel, triggerManualRun } = require('./sentinel');
const { initOptimizer, startOptimizer, triggerManualAttribution } = require('./optimizer');

const app = express();
const httpServer = createServer(app);

// Socket.IO with CORS for Vite dev server
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
        methods: ['GET', 'POST']
    }
});

app.use(cors());
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
