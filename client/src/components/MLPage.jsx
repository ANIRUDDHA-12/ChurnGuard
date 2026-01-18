import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeftIcon,
    UserGroupIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    ChartPieIcon,
} from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';
import { ML_API_URL } from '../config';

const ML_API_BASE = ML_API_URL;

// Segment colors
const segmentColors = {
    power_users: { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', icon: '⚡' },
    engaged: { bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', icon: '🎯' },
    new_users: { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', icon: '🌟' },
    at_risk: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', icon: '⚠️' },
    dormant: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', icon: '💤' },
};

// Segment Card Component
function SegmentCard({ segment, count, percentage }) {
    const config = segmentColors[segment] || segmentColors.engaged;
    const label = segment.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="segment-card"
            style={{ background: config.bg, borderColor: config.color }}
        >
            <span className="segment-icon">{config.icon}</span>
            <div className="segment-info">
                <span className="segment-name" style={{ color: config.color }}>{label}</span>
                <span className="segment-count">{count} users</span>
                <span className="segment-percent">{percentage}%</span>
            </div>
        </motion.div>
    );
}

// Drift Alert Component
function DriftAlert({ feature, severity, deviation }) {
    const severityColors = {
        high: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
        medium: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' },
    };
    const config = severityColors[severity] || severityColors.medium;

    return (
        <div className="drift-alert" style={{ background: config.bg }}>
            <ExclamationTriangleIcon className="w-5 h-5" style={{ color: config.color }} />
            <div className="drift-info">
                <span className="drift-feature">{feature.replace('_', ' ')}</span>
                <span className="drift-deviation">{deviation}σ deviation</span>
            </div>
            <span className="drift-severity" style={{ color: config.color }}>
                {severity.toUpperCase()}
            </span>
        </div>
    );
}

// Main ML Page
function MLPage({ onBack }) {
    const [segments, setSegments] = useState([]);
    const [drift, setDrift] = useState(null);
    const [modelStatus, setModelStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [retraining, setRetraining] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [segRes, driftRes, statusRes] = await Promise.all([
                fetch(`${ML_API_BASE}/segments`),
                fetch(`${ML_API_BASE}/model/drift`),
                fetch(`${ML_API_BASE}/model/retrain/status`),
            ]);

            const segData = await segRes.json();
            const driftData = await driftRes.json();
            const statusData = await statusRes.json();

            if (segData.success) setSegments(segData.segments || []);
            if (driftData.success) setDrift(driftData);
            if (statusData.success) setModelStatus(statusData);
        } catch (err) {
            console.error('Failed to fetch ML data:', err);
        }
        setLoading(false);
    }, []);

    const triggerRetrain = async () => {
        setRetraining(true);
        try {
            await fetch(`${ML_API_BASE}/model/retrain`, { method: 'POST' });
            // Simulate retraining delay
            setTimeout(() => {
                setRetraining(false);
                fetchData();
            }, 3000);
        } catch (err) {
            console.error('Failed to trigger retrain:', err);
            setRetraining(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="ml-page">
            {/* Header */}
            <header className="ml-header">
                <div className="header-left">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onBack}
                        className="back-button"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </motion.button>
                    <div className="header-title">
                        <h1>ML Intelligence</h1>
                        <span className="header-subtitle">User Segmentation & Model Health</span>
                    </div>
                </div>
                <ThemeToggle />
            </header>

            {loading ? (
                <div className="loading-state">
                    <div className="loading-spinner" />
                    <span>Loading ML insights...</span>
                </div>
            ) : (
                <div className="ml-content">
                    {/* User Segments */}
                    <section className="ml-section">
                        <h2>
                            <ChartPieIcon className="w-5 h-5" />
                            User Segments
                        </h2>
                        <div className="segments-grid">
                            {segments.map(seg => (
                                <SegmentCard
                                    key={seg.segment}
                                    segment={seg.segment}
                                    count={seg.count}
                                    percentage={seg.percentage}
                                />
                            ))}
                        </div>
                    </section>

                    {/* Feature Drift */}
                    <section className="ml-section">
                        <h2>
                            <ExclamationTriangleIcon className="w-5 h-5" />
                            Feature Drift Detection
                        </h2>
                        {drift?.drift_detected ? (
                            <div className="drift-alerts">
                                {drift.alerts.map((alert, idx) => (
                                    <DriftAlert
                                        key={idx}
                                        feature={alert.feature}
                                        severity={alert.severity}
                                        deviation={alert.deviation}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="no-drift">
                                <CheckCircleIcon className="w-8 h-8" style={{ color: '#34d399' }} />
                                <span>No feature drift detected</span>
                                <span className="drift-time">
                                    Last checked: {drift?.analyzed_at ? new Date(drift.analyzed_at).toLocaleString() : 'Unknown'}
                                </span>
                            </div>
                        )}
                    </section>

                    {/* Model Status */}
                    <section className="ml-section">
                        <h2>
                            <ArrowPathIcon className="w-5 h-5" />
                            Model Status
                        </h2>
                        <div className="model-status">
                            <div className="model-stat">
                                <span className="model-stat-label">Version</span>
                                <span className="model-stat-value">{modelStatus?.model_version || '1.0.0'}</span>
                            </div>
                            <div className="model-stat">
                                <span className="model-stat-label">Status</span>
                                <span className="model-stat-value status-active">
                                    {retraining ? 'Retraining...' : modelStatus?.status || 'Active'}
                                </span>
                            </div>
                            <div className="model-stat">
                                <span className="model-stat-label">Next Retrain</span>
                                <span className="model-stat-value">{modelStatus?.next_scheduled || 'Not scheduled'}</span>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={triggerRetrain}
                                disabled={retraining}
                                className="retrain-btn"
                            >
                                <ArrowPathIcon className={`w-4 h-4 ${retraining ? 'animate-spin' : ''}`} />
                                {retraining ? 'Retraining...' : 'Retrain Now'}
                            </motion.button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

export default MLPage;
