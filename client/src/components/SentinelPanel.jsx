import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheckIcon,
    PlayIcon,
    PauseIcon,
    BoltIcon,
    ClockIcon,
    ChartBarIcon,
} from '@heroicons/react/24/outline';
import { SERVER_URL } from '../config';

const SERVER_BASE = SERVER_URL;

// Activity item component
function ActivityItem({ activity }) {
    const actionColors = {
        AUTO_NUDGE: 'text-blue-400',
        AUTO_SUPPORT: 'text-purple-400',
        AUTO_OFFER: 'text-emerald-400',
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="activity-item"
        >
            <span className="activity-time">{formatTime(activity.timestamp)}</span>
            <span className={`activity-action ${actionColors[activity.action] || 'text-gray-400'}`}>
                {activity.action}
            </span>
            <span className="activity-user">{activity.userId.slice(0, 12)}...</span>
            <span className="activity-risk">{activity.risk}%</span>
            {activity.dryRun && <span className="dry-run-badge">DRY RUN</span>}
        </motion.div>
    );
}

// Efficacy bar component
function EfficacyBar({ action, successRate, total }) {
    const actionLabels = {
        nudge: { label: 'Nudge', color: '#60a5fa' },
        support: { label: 'Support', color: '#a78bfa' },
        offer: { label: 'Offer', color: '#34d399' },
    };

    const config = actionLabels[action] || { label: action, color: '#94a3b8' };

    return (
        <div className="efficacy-bar-item">
            <div className="efficacy-label">
                <span>{config.label}</span>
                <span className="efficacy-rate">{successRate}%</span>
            </div>
            <div className="efficacy-bar-bg">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${successRate}%` }}
                    transition={{ duration: 0.5 }}
                    className="efficacy-bar-fill"
                    style={{ backgroundColor: config.color }}
                />
            </div>
            <span className="efficacy-total">{total} interventions</span>
        </div>
    );
}

function SentinelPanel({ socket }) {
    const [config, setConfig] = useState({
        enabled: false,
        dryRun: true,
        thresholds: { nudge: 0.85, support: 0.90, offer: 0.95 },
        intervalMinutes: 60,
        stats: { lastRun: null, nextRun: null, actionsToday: 0 }
    });
    const [activities, setActivities] = useState([]);
    const [efficacy, setEfficacy] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch initial config
    const fetchConfig = useCallback(async () => {
        try {
            const response = await fetch(`${SERVER_BASE}/api/sentinel/status`);
            const data = await response.json();
            if (data.success) {
                setConfig(data.sentinel);
            }
        } catch (err) {
            console.error('Failed to fetch sentinel config:', err);
        }
    }, []);

    // Fetch efficacy data
    const fetchEfficacy = useCallback(async () => {
        try {
            const response = await fetch(`${SERVER_BASE}/api/efficacy`);
            const data = await response.json();
            if (data.success) {
                setEfficacy(data.efficacy || []);
            }
        } catch (err) {
            console.error('Failed to fetch efficacy:', err);
        }
    }, []);

    // Toggle Sentinel enabled/disabled
    const toggleEnabled = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${SERVER_BASE}/api/sentinel/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !config.enabled })
            });
            const data = await response.json();
            if (data.success) {
                setConfig(data.sentinel);
            }
        } catch (err) {
            console.error('Failed to toggle sentinel:', err);
        }
        setLoading(false);
    };

    // Toggle Dry Run mode
    const toggleDryRun = async () => {
        try {
            const response = await fetch(`${SERVER_BASE}/api/sentinel/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dryRun: !config.dryRun })
            });
            const data = await response.json();
            if (data.success) {
                setConfig(data.sentinel);
            }
        } catch (err) {
            console.error('Failed to toggle dry run:', err);
        }
    };

    // Manual trigger
    const triggerRun = async () => {
        setLoading(true);
        try {
            await fetch(`${SERVER_BASE}/api/sentinel/run`, { method: 'POST' });
        } catch (err) {
            console.error('Failed to trigger run:', err);
        }
        setLoading(false);
    };

    // Socket listeners
    useEffect(() => {
        fetchConfig();
        fetchEfficacy();

        if (socket) {
            socket.on('SENTINEL_ACTION', (data) => {
                setActivities(prev => [data, ...prev].slice(0, 20));
            });

            socket.on('SENTINEL_CONFIG', (newConfig) => {
                setConfig(newConfig);
            });

            socket.on('SENTINEL_STATUS', (status) => {
                setConfig(prev => ({
                    ...prev,
                    stats: { ...prev.stats, lastRun: status.lastRun }
                }));
            });

            socket.on('OPTIMIZER_UPDATE', () => {
                fetchEfficacy();
            });
        }

        return () => {
            if (socket) {
                socket.off('SENTINEL_ACTION');
                socket.off('SENTINEL_CONFIG');
                socket.off('SENTINEL_STATUS');
                socket.off('OPTIMIZER_UPDATE');
            }
        };
    }, [socket, fetchConfig, fetchEfficacy]);

    const formatNextRun = () => {
        if (!config.stats?.nextRun) return 'Not scheduled';
        const next = new Date(config.stats.nextRun);
        const now = new Date();
        const diff = Math.max(0, Math.floor((next - now) / 60000));
        return `${diff} min`;
    };

    return (
        <div className="sentinel-panel">
            {/* Header */}
            <div className="sentinel-header">
                <div className="sentinel-title">
                    <ShieldCheckIcon className="w-5 h-5" />
                    <span>Sentinel</span>
                    <span className={`sentinel-status ${config.enabled ? 'active' : 'paused'}`}>
                        {config.enabled ? 'Active' : 'Paused'}
                    </span>
                </div>

                {/* Toggle Switch */}
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleEnabled}
                    disabled={loading}
                    className={`sentinel-toggle ${config.enabled ? 'enabled' : ''}`}
                >
                    {config.enabled ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                </motion.button>
            </div>

            {/* Controls */}
            <div className="sentinel-controls">
                <label className="control-item">
                    <input
                        type="checkbox"
                        checked={config.dryRun}
                        onChange={toggleDryRun}
                    />
                    <span>Dry Run</span>
                </label>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={triggerRun}
                    disabled={loading || !config.enabled}
                    className="run-now-btn"
                >
                    <BoltIcon className="w-4 h-4" />
                    Run Now
                </motion.button>
            </div>

            {/* Stats */}
            <div className="sentinel-stats">
                <div className="stat">
                    <ClockIcon className="w-4 h-4" />
                    <span>Next: {formatNextRun()}</span>
                </div>
                <div className="stat">
                    <span>Today: {config.stats?.actionsToday || 0} actions</span>
                </div>
            </div>

            {/* Efficacy Section */}
            <div className="efficacy-section">
                <h4>
                    <ChartBarIcon className="w-4 h-4" />
                    Intervention Efficacy
                </h4>
                {efficacy.length === 0 ? (
                    <div className="no-efficacy">No attributed interventions yet</div>
                ) : (
                    <div className="efficacy-bars">
                        {efficacy.map(item => (
                            <EfficacyBar
                                key={item.action}
                                action={item.action}
                                successRate={item.successRate}
                                total={item.total}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Activity Feed */}
            <div className="sentinel-activity">
                <h4>Live Activity</h4>
                <div className="activity-list">
                    {activities.length === 0 ? (
                        <div className="no-activity">No recent activity</div>
                    ) : (
                        <AnimatePresence>
                            {activities.map((activity, idx) => (
                                <ActivityItem key={`${activity.timestamp}-${idx}`} activity={activity} />
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SentinelPanel;
