/**
 * Sentinel Configuration
 * =====================
 * Centralized configuration for the Automated Sentinel system.
 */

const sentinelConfig = {
    // Kill switch - if false, Sentinel won't execute any actions
    enabled: false,

    // Dry run mode - if true, logs actions but doesn't persist them
    dryRun: true,

    // Risk thresholds for tiered strategy
    thresholds: {
        nudge: 0.85,    // 85-90% risk → AUTO_NUDGE
        support: 0.90,  // 90-95% risk → AUTO_SUPPORT
        offer: 0.95     // >95% risk → AUTO_OFFER
    },

    // Cron interval (default: every 60 minutes)
    intervalMinutes: 60,

    // Memory optimization: max users per batch call
    chunkSize: 100,

    // Max actions per run (rate limiting)
    maxActionsPerRun: 10,

    // Cooldown: skip if ANY intervention in last N hours
    cooldownHours: 24,

    // Human priority: skip if MANUAL intervention in last N hours
    humanPriorityHours: 12,

    // Stats tracking
    stats: {
        lastRun: null,
        nextRun: null,
        actionsToday: 0,
        lastResetDate: new Date().toDateString()
    }
};

/**
 * Get current configuration
 */
function getConfig() {
    // Reset daily counter if new day
    const today = new Date().toDateString();
    if (sentinelConfig.stats.lastResetDate !== today) {
        sentinelConfig.stats.actionsToday = 0;
        sentinelConfig.stats.lastResetDate = today;
    }
    return { ...sentinelConfig };
}

/**
 * Update configuration
 */
function updateConfig(updates) {
    if (updates.enabled !== undefined) sentinelConfig.enabled = updates.enabled;
    if (updates.dryRun !== undefined) sentinelConfig.dryRun = updates.dryRun;
    if (updates.intervalMinutes !== undefined) sentinelConfig.intervalMinutes = updates.intervalMinutes;
    if (updates.thresholds) {
        sentinelConfig.thresholds = { ...sentinelConfig.thresholds, ...updates.thresholds };
    }
    return getConfig();
}

/**
 * Update stats
 */
function updateStats(updates) {
    sentinelConfig.stats = { ...sentinelConfig.stats, ...updates };
}

/**
 * Increment actions counter
 */
function incrementActions() {
    sentinelConfig.stats.actionsToday++;
}

module.exports = {
    getConfig,
    updateConfig,
    updateStats,
    incrementActions
};
