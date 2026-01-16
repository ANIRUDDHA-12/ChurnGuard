/**
 * Automated Sentinel
 * ==================
 * Background service that automatically intervenes for high-risk users.
 * 
 * Features:
 * - Tiered strategy (>95% Offer, >90% Support, >85% Nudge)
 * - 100-user chunking for 8GB RAM optimization
 * - 24h cooldown for any intervention
 * - 12h human priority (skip if manual intervention)
 * - Dry run mode for safe testing
 */

const cron = require('node-cron');
const { getConfig, updateStats, incrementActions } = require('./lib/sentinelConfig');
const { supabase } = require('./lib/supabase');

// ML API base URL
const ML_API_BASE = 'http://localhost:8000';

// Will be set by index.js
let io = null;

/**
 * Initialize Sentinel with Socket.IO instance
 */
function initSentinel(socketIO) {
    io = socketIO;
    console.log('🛡️ Sentinel initialized');
}

/**
 * Determine action type based on risk level (Tiered Strategy)
 */
function getActionType(probability, thresholds) {
    if (probability >= thresholds.offer) return 'AUTO_OFFER';
    if (probability >= thresholds.support) return 'AUTO_SUPPORT';
    if (probability >= thresholds.nudge) return 'AUTO_NUDGE';
    return null;
}

/**
 * Fetch users with risk predictions in chunks
 */
async function fetchUsersInChunks(chunkSize) {
    try {
        const response = await fetch(`${ML_API_BASE}/users/risk?limit=${chunkSize}`);
        if (!response.ok) throw new Error('ML API error');
        const data = await response.json();
        return data.users || [];
    } catch (error) {
        console.error('❌ Sentinel: Failed to fetch users:', error.message);
        return [];
    }
}

/**
 * Check if user has any intervention in last N hours
 */
async function hasRecentIntervention(userId, hours) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('interventions')
        .select('id, created_at, source')
        .eq('user_id', userId)
        .gte('created_at', cutoff)
        .limit(1);

    if (error) {
        console.error('❌ Sentinel: Intervention check failed:', error.message);
        return true; // Err on side of caution
    }

    return data && data.length > 0;
}

/**
 * Check if user has manual intervention in last N hours
 */
async function hasManualIntervention(userId, hours) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('interventions')
        .select('id')
        .eq('user_id', userId)
        .eq('source', 'manual')
        .gte('created_at', cutoff)
        .limit(1);

    if (error) return true;
    return data && data.length > 0;
}

/**
 * Persist intervention to database
 */
async function persistIntervention(userId, actionType, dryRun) {
    if (dryRun) {
        console.log(`🔸 DRY RUN: Would execute ${actionType} for ${userId}`);
        return { success: true, dryRun: true };
    }

    try {
        const { data, error } = await supabase
            .from('interventions')
            .insert({
                user_id: userId,
                action_type: actionType.replace('AUTO_', '').toLowerCase(),
                status: 'completed',
                source: 'sentinel',
                metadata: { triggeredBy: 'sentinel', timestamp: new Date().toISOString() },
                completed_at: new Date().toISOString()
            })
            .select();

        if (error) {
            console.error('❌ Sentinel: Insert failed:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true, data: data[0] };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Emit socket event for real-time dashboard updates
 */
function emitSentinelAction(userId, action, risk, dryRun) {
    if (io) {
        io.emit('SENTINEL_ACTION', {
            userId,
            action,
            risk: Math.round(risk * 100),
            dryRun,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Main Sentinel execution cycle
 */
async function runSentinelCycle() {
    const config = getConfig();

    if (!config.enabled) {
        console.log('⏸️ Sentinel: Disabled, skipping cycle');
        return;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`🛡️ SENTINEL CYCLE STARTED ${config.dryRun ? '(DRY RUN)' : ''}`);
    console.log('='.repeat(50));

    const startTime = Date.now();
    let actionsThisCycle = 0;

    try {
        // Fetch users with risk predictions
        const users = await fetchUsersInChunks(config.chunkSize);
        console.log(`📊 Fetched ${users.length} users`);

        // Filter by threshold and process
        for (const user of users) {
            // Check rate limit
            if (actionsThisCycle >= config.maxActionsPerRun) {
                console.log(`⚠️ Rate limit reached (${config.maxActionsPerRun}), stopping`);
                break;
            }

            // Determine action type
            const actionType = getActionType(user.churn_probability, config.thresholds);
            if (!actionType) continue;

            // Check cooldown (24h any intervention)
            const hasCooldown = await hasRecentIntervention(user.user_id, config.cooldownHours);
            if (hasCooldown) {
                console.log(`⏳ Skipping ${user.user_id}: Cooldown active`);
                continue;
            }

            // Check human priority (12h manual intervention)
            const hasManual = await hasManualIntervention(user.user_id, config.humanPriorityHours);
            if (hasManual) {
                console.log(`👤 Skipping ${user.user_id}: Human priority`);
                continue;
            }

            // Execute intervention
            const riskPercent = Math.round(user.churn_probability * 100);
            console.log(`🎯 ${actionType} → ${user.user_id} (${riskPercent}% risk)`);

            const result = await persistIntervention(user.user_id, actionType, config.dryRun);

            if (result.success) {
                actionsThisCycle++;
                if (!config.dryRun) incrementActions();
                emitSentinelAction(user.user_id, actionType, user.churn_probability, config.dryRun);
            }
        }

    } catch (error) {
        console.error('❌ Sentinel cycle error:', error.message);
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ Cycle complete: ${actionsThisCycle} actions in ${duration}ms`);
    console.log('='.repeat(50) + '\n');

    // Update stats
    updateStats({
        lastRun: new Date().toISOString(),
        nextRun: new Date(Date.now() + config.intervalMinutes * 60 * 1000).toISOString()
    });

    // Emit status update
    if (io) {
        io.emit('SENTINEL_STATUS', {
            running: false,
            lastRun: new Date().toISOString(),
            actionsThisCycle,
            dryRun: config.dryRun
        });
    }
}

/**
 * Start the Sentinel scheduler
 */
function startSentinel() {
    const config = getConfig();

    // Schedule: every N minutes
    const cronExpression = `*/${config.intervalMinutes} * * * *`;

    cron.schedule(cronExpression, () => {
        runSentinelCycle();
    });

    console.log(`🛡️ Sentinel scheduler started (every ${config.intervalMinutes} min)`);

    // Set next run time
    updateStats({
        nextRun: new Date(Date.now() + config.intervalMinutes * 60 * 1000).toISOString()
    });
}

/**
 * Manual trigger for testing
 */
function triggerManualRun() {
    console.log('🛡️ Manual Sentinel trigger');
    runSentinelCycle();
}

module.exports = {
    initSentinel,
    startSentinel,
    triggerManualRun,
    runSentinelCycle
};
