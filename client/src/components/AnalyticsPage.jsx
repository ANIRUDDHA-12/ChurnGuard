import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeftIcon,
    ChartBarIcon,
    CurrencyDollarIcon,
    UserGroupIcon,
    ArrowTrendingUpIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';

const SERVER_BASE = 'http://localhost:3001';

// Summary Card Component
function SummaryCard({ icon: Icon, label, value, subValue, color }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="summary-card"
        >
            <div className={`summary-icon ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="summary-content">
                <span className="summary-value">{value}</span>
                <span className="summary-label">{label}</span>
                {subValue && <span className="summary-sub">{subValue}</span>}
            </div>
        </motion.div>
    );
}

// Simple Bar Chart Component
function BarChart({ data, valueKey, labelKey, color = '#6366f1' }) {
    const maxValue = Math.max(...data.map(d => d[valueKey]), 1);

    return (
        <div className="bar-chart">
            {data.map((item, idx) => (
                <div key={idx} className="bar-item">
                    <span className="bar-label">{item[labelKey]}</span>
                    <div className="bar-track">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(item[valueKey] / maxValue) * 100}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className="bar-fill"
                            style={{ backgroundColor: color }}
                        />
                    </div>
                    <span className="bar-value">{item[valueKey]}%</span>
                </div>
            ))}
        </div>
    );
}

// ROI Card Component
function ROICard({ data }) {
    const actionColors = {
        nudge: '#60a5fa',
        support: '#a78bfa',
        offer: '#34d399',
    };

    return (
        <div className="roi-cards">
            {data.map((item, idx) => (
                <motion.div
                    key={item.action}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="roi-card"
                >
                    <div className="roi-header">
                        <span
                            className="roi-action"
                            style={{ color: actionColors[item.action] || '#94a3b8' }}
                        >
                            {item.action.charAt(0).toUpperCase() + item.action.slice(1)}
                        </span>
                        <span className={`roi-badge ${item.netROI >= 0 ? 'positive' : 'negative'}`}>
                            {item.netROI >= 0 ? '+' : ''}{item.roiPercent}% ROI
                        </span>
                    </div>
                    <div className="roi-stats">
                        <div className="roi-stat">
                            <span className="roi-stat-label">Interventions</span>
                            <span className="roi-stat-value">{item.total}</span>
                        </div>
                        <div className="roi-stat">
                            <span className="roi-stat-label">Successes</span>
                            <span className="roi-stat-value success">{item.successes}</span>
                        </div>
                        <div className="roi-stat">
                            <span className="roi-stat-label">Revenue Saved</span>
                            <span className="roi-stat-value">${item.savedRevenue.toLocaleString()}</span>
                        </div>
                        <div className="roi-stat">
                            <span className="roi-stat-label">Net ROI</span>
                            <span className={`roi-stat-value ${item.netROI >= 0 ? 'success' : 'danger'}`}>
                                ${item.netROI.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

// Trend Line Component (Simple SVG)
function TrendLine({ data }) {
    if (!data || data.length === 0) {
        return <div className="no-data">No trend data available</div>;
    }

    const width = 600;
    const height = 200;
    const padding = 40;

    const maxValue = Math.max(...data.map(d => d.successRate), 100);
    const points = data.map((d, i) => ({
        x: padding + (i / (data.length - 1 || 1)) * (width - padding * 2),
        y: height - padding - (d.successRate / maxValue) * (height - padding * 2)
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
        <div className="trend-chart">
            <svg viewBox={`0 0 ${width} ${height}`} className="trend-svg">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(v => {
                    const y = height - padding - (v / maxValue) * (height - padding * 2);
                    return (
                        <g key={v}>
                            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--border-subtle)" strokeDasharray="4" />
                            <text x={padding - 10} y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">{v}%</text>
                        </g>
                    );
                })}

                {/* Line path */}
                <path d={pathD} fill="none" stroke="var(--accent-primary)" strokeWidth="2" />

                {/* Data points */}
                {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--accent-primary)" />
                ))}

                {/* X-axis labels */}
                {data.map((d, i) => (
                    <text
                        key={i}
                        x={points[i].x}
                        y={height - 10}
                        fill="var(--text-muted)"
                        fontSize="9"
                        textAnchor="middle"
                    >
                        {d.date.slice(5)}
                    </text>
                ))}
            </svg>
        </div>
    );
}

// Main Analytics Page
function AnalyticsPage({ onBack }) {
    const [summary, setSummary] = useState(null);
    const [trends, setTrends] = useState([]);
    const [roi, setRoi] = useState([]);
    const [cohorts, setCohorts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const [summaryRes, trendsRes, roiRes, cohortsRes] = await Promise.all([
                fetch(`${SERVER_BASE}/api/analytics/summary`),
                fetch(`${SERVER_BASE}/api/analytics/trends`),
                fetch(`${SERVER_BASE}/api/analytics/roi`),
                fetch(`${SERVER_BASE}/api/analytics/cohorts`),
            ]);

            const summaryData = await summaryRes.json();
            const trendsData = await trendsRes.json();
            const roiData = await roiRes.json();
            const cohortsData = await cohortsRes.json();

            if (summaryData.success) setSummary(summaryData.summary);
            if (trendsData.success) setTrends(trendsData.trends);
            if (roiData.success) setRoi(roiData.roi);
            if (cohortsData.success) setCohorts(cohortsData.cohorts);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    return (
        <div className="analytics-page">
            {/* Header */}
            <header className="analytics-header">
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
                        <h1>Analytics Dashboard</h1>
                        <span className="header-subtitle">Intervention Performance & ROI</span>
                    </div>
                </div>
                <ThemeToggle />
            </header>

            {loading ? (
                <div className="loading-state">
                    <div className="loading-spinner" />
                    <span>Loading analytics...</span>
                </div>
            ) : (
                <div className="analytics-content">
                    {/* Summary Cards */}
                    <section className="summary-section">
                        <SummaryCard
                            icon={ChartBarIcon}
                            label="Total Interventions"
                            value={summary?.totalInterventions || 0}
                            color="blue"
                        />
                        <SummaryCard
                            icon={CheckCircleIcon}
                            label="Successful"
                            value={summary?.successfulInterventions || 0}
                            subValue={`${summary?.successRate || 0}% success rate`}
                            color="green"
                        />
                        <SummaryCard
                            icon={UserGroupIcon}
                            label="Total Users"
                            value={summary?.totalUsers || 0}
                            color="purple"
                        />
                        <SummaryCard
                            icon={CurrencyDollarIcon}
                            label="Revenue Saved"
                            value={`$${(summary?.estimatedRevenueSaved || 0).toLocaleString()}`}
                            subValue="Based on $500 LTV"
                            color="gold"
                        />
                    </section>

                    {/* Trend Chart */}
                    <section className="chart-section">
                        <h2>
                            <ArrowTrendingUpIcon className="w-5 h-5" />
                            Intervention Success Trend
                        </h2>
                        <TrendLine data={trends} />
                    </section>

                    {/* ROI by Action Type */}
                    <section className="chart-section">
                        <h2>
                            <CurrencyDollarIcon className="w-5 h-5" />
                            ROI by Intervention Type
                        </h2>
                        {roi.length === 0 ? (
                            <div className="no-data">No ROI data available yet</div>
                        ) : (
                            <ROICard data={roi} />
                        )}
                    </section>

                    {/* Cohort Analysis */}
                    <section className="chart-section">
                        <h2>
                            <UserGroupIcon className="w-5 h-5" />
                            Churn Rate by Cohort
                        </h2>
                        {cohorts.length === 0 ? (
                            <div className="no-data">No cohort data available</div>
                        ) : (
                            <BarChart
                                data={cohorts}
                                valueKey="churnRate"
                                labelKey="cohort"
                                color="#ef4444"
                            />
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}

export default AnalyticsPage;
