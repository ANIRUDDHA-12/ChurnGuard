/**
 * Optimizer - Attribution Worker
 * ===============================
 * Daily cron job that evaluates intervention effectiveness.
 * 
 * Logic:
 * - Fetches interventions from 48h ago (enough time for impact)
 * - Gets current churn risk for each user
 * - Calculates risk_delta (current - at_intervention)
 * - Marks outcome as SUCCESS/FAILURE based on criteria
 */

const cron = require('node-cron');
const { supabase } = require('./lib/supabase');

const ML_API_BASE = 'http://localhost:8000';

// Will be set by index.js
let io = null;

/**
 * Initialize optimizer with Socket.IO
 */
function initOptimizer(socketIO) {
    io = socketIO;
    console.log('📊 Optimizer initialized');
}

/**
 * Get current risk for a user from ML API
 */
async function getCurrentRisk(userId) {
    try {
        // Fetch user data from Supabase
        const { data: userData, error } = await supabase
            .from('user_segments')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error || !userData) {
            console.log(`⚠️ User not found: ${userId}`);
            return null;
        }

        // Call ML API for prediction
        const response = await fetch(`${ML_API_BASE}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                total_clicks: userData.total_clicks,
                avg_session_time: userData.avg_session_time,
                support_tickets: userData.support_tickets,
                days_since_signup: userData.days_since_signup,
                feature_usage_score: userData.feature_usage_score
            })
        });

        if (!response.ok) return null;

        const prediction = await response.json();
        return {
            churnProbability: prediction.churn_probability,
            isChurned: userData.is_churned
        };
    } catch (err) {
        console.error(`❌ Error getting risk for ${userId}:`, err.message);
        return null;
    }
}

/**
 * Determine outcome based on risk delta
 */
function determineOutcome(riskAtIntervention, currentRisk, isChurned) {
    // If user churned, it's a failure
    if (isChurned) {
        return 'failure';
    }

    // Calculate delta (negative = improvement)
    const delta = currentRisk - riskAtIntervention;

    // If risk dropped by more than 20%, it's a success
    if (delta <= -0.20) {
        return 'success';
    }

    // Otherwise still pending (not enough change)
    return 'pending';
}

/**
 * Run the attribution cycle
 */
async function runAttributionCycle() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 OPTIMIZER ATTRIBUTION CYCLE STARTED');
    console.log('='.repeat(50));

    const startTime = Date.now();
    let processed = 0;
    let successes = 0;
    let failures = 0;

    try {
        // Get interventions from ~48 hours ago that haven't been attributed
        const cutoffStart = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString();
        const cutoffEnd = new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString();

        const { data: interventions, error } = await supabase
            .from('interventions')
            .select('*')
            .is('attributed_at', null)
            .gte('created_at', cutoffStart)
            .lte('created_at', cutoffEnd)
            .limit(100);

        if (error) {
            console.error('❌ Error fetching interventions:', error.message);
            return;
        }

        console.log(`📋 Found ${interventions?.length || 0} interventions to attribute`);

        if (!interventions || interventions.length === 0) {
            console.log('✅ No interventions to process');
            return;
        }

        // Process each intervention
        for (const intervention of interventions) {
            const riskData = await getCurrentRisk(intervention.user_id);

            if (!riskData) {
                console.log(`⏭️ Skipping ${intervention.user_id}: No risk data`);
                continue;
            }

            const riskAtIntervention = intervention.risk_at_intervention || 0.5;
            const currentRisk = riskData.churnProbability;
            const riskDelta = currentRisk - riskAtIntervention;
            const outcome = determineOutcome(riskAtIntervention, currentRisk, riskData.isChurned);

            // Update intervention record
            const { error: updateError } = await supabase
                .from('interventions')
                .update({
                    outcome,
                    risk_delta: riskDelta,
                    current_risk: currentRisk,
                    attributed_at: new Date().toISOString()
                })
                .eq('id', intervention.id);

            if (updateError) {
                console.error(`❌ Update failed for ${intervention.id}:`, updateError.message);
                continue;
            }

            processed++;
            if (outcome === 'success') successes++;
            if (outcome === 'failure') failures++;

            const deltaStr = riskDelta >= 0 ? `+${(riskDelta * 100).toFixed(1)}%` : `${(riskDelta * 100).toFixed(1)}%`;
            console.log(`📈 ${intervention.user_id}: ${outcome.toUpperCase()} (${deltaStr})`);
        }

    } catch (err) {
        console.error('❌ Attribution cycle error:', err.message);
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ Cycle complete: ${processed} processed, ${successes} successes, ${failures} failures (${duration}ms)`);
    console.log('='.repeat(50) + '\n');

    // Emit update to dashboard
    if (io) {
        io.emit('OPTIMIZER_UPDATE', {
            processed,
            successes,
            failures,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Start the optimizer scheduler (runs daily at midnight)
 */
function startOptimizer() {
    // Run at midnight every day
    cron.schedule('0 0 * * *', () => {
        runAttributionCycle();
    });

    console.log('📊 Optimizer scheduler started (daily at midnight)');
}

/**
 * Manual trigger for testing
 */
function triggerManualAttribution() {
    console.log('📊 Manual attribution trigger');
    runAttributionCycle();
}

module.exports = {
    initOptimizer,
    startOptimizer,
    triggerManualAttribution,
    runAttributionCycle
};
