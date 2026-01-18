import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowLeftIcon,
    ClipboardDocumentListIcon,
    ShieldCheckIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';
import { SERVER_URL } from '../config';

const SERVER_BASE = SERVER_URL;

// Action type colors
const actionColors = {
    intervention_created: '#60a5fa',
    intervention_completed: '#34d399',
    sentinel_triggered: '#a78bfa',
    email_sent: '#f472b6',
    config_changed: '#fbbf24',
    user_flagged: '#ef4444',
};

// Audit Log Row Component
function AuditRow({ log, index }) {
    const color = actionColors[log.action] || '#94a3b8';
    const time = new Date(log.created_at).toLocaleString();

    return (
        <motion.tr
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className="audit-row"
        >
            <td className="audit-time">
                <ClockIcon className="w-4 h-4" />
                {time}
            </td>
            <td>
                <span className="audit-action" style={{ color }}>
                    {log.action.replace(/_/g, ' ')}
                </span>
            </td>
            <td className="audit-actor">{log.actor}</td>
            <td className="audit-details">
                {JSON.stringify(log.details || {}).slice(0, 50)}...
            </td>
        </motion.tr>
    );
}

// Role Badge Component
function RoleBadge({ role, isActive, onClick }) {
    const roleColors = {
        admin: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
        operator: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' },
        viewer: { bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' },
    };
    const config = roleColors[role] || roleColors.viewer;

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`role-badge ${isActive ? 'active' : ''}`}
            style={{ background: isActive ? config.color : config.bg, color: isActive ? 'white' : config.color }}
        >
            <ShieldCheckIcon className="w-4 h-4" />
            {role.charAt(0).toUpperCase() + role.slice(1)}
        </motion.button>
    );
}

// Main Audit Page
function AuditPage({ onBack }) {
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [roles, setRoles] = useState([]);
    const [currentRole, setCurrentRole] = useState('admin');
    const [roleInfo, setRoleInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [logsRes, summaryRes, rolesRes] = await Promise.all([
                fetch(`${SERVER_BASE}/api/audit/logs?limit=30`),
                fetch(`${SERVER_BASE}/api/audit/summary`),
                fetch(`${SERVER_BASE}/api/roles`),
            ]);

            const logsData = await logsRes.json();
            const summaryData = await summaryRes.json();
            const rolesData = await rolesRes.json();

            if (logsData.success) setLogs(logsData.logs || []);
            if (summaryData.success) setSummary(summaryData.summary);
            if (rolesData.success) setRoles(rolesData.roles || []);
        } catch (err) {
            console.error('Failed to fetch audit data:', err);
        }
        setLoading(false);
    }, []);

    const fetchRoleInfo = async (role) => {
        try {
            const res = await fetch(`${SERVER_BASE}/api/role/${role}`);
            const data = await res.json();
            if (data.success) setRoleInfo(data);
        } catch (err) {
            console.error('Failed to fetch role info:', err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchRoleInfo(currentRole);
    }, [currentRole]);

    return (
        <div className="audit-page">
            {/* Header */}
            <header className="audit-header">
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
                        <h1>Audit & Access Control</h1>
                        <span className="header-subtitle">Enterprise Security Dashboard</span>
                    </div>
                </div>
                <ThemeToggle />
            </header>

            {loading ? (
                <div className="loading-state">
                    <div className="loading-spinner" />
                    <span>Loading audit data...</span>
                </div>
            ) : (
                <div className="audit-content">
                    {/* Summary Cards */}
                    <section className="audit-summary">
                        <div className="summary-card">
                            <span className="summary-value">{summary?.total || 0}</span>
                            <span className="summary-label">Actions Today</span>
                        </div>
                        <div className="summary-card">
                            <span className="summary-value">{logs.length}</span>
                            <span className="summary-label">Recent Logs</span>
                        </div>
                        <div className="summary-card">
                            <span className="summary-value">{roles.length}</span>
                            <span className="summary-label">Roles</span>
                        </div>
                    </section>

                    {/* RBAC Section */}
                    <section className="audit-section">
                        <h2>
                            <ShieldCheckIcon className="w-5 h-5" />
                            Role-Based Access Control
                        </h2>
                        <div className="roles-list">
                            {roles.map(role => (
                                <RoleBadge
                                    key={role}
                                    role={role}
                                    isActive={currentRole === role}
                                    onClick={() => setCurrentRole(role)}
                                />
                            ))}
                        </div>
                        {roleInfo && (
                            <div className="role-permissions">
                                <h3>Permissions for {currentRole}</h3>
                                <div className="permissions-grid">
                                    {roleInfo.permissions?.map(perm => (
                                        <span key={perm} className="permission-badge">
                                            ✓ {perm.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Audit Logs Table */}
                    <section className="audit-section">
                        <h2>
                            <ClipboardDocumentListIcon className="w-5 h-5" />
                            Recent Activity Logs
                        </h2>
                        {logs.length === 0 ? (
                            <div className="no-data">No audit logs yet. Actions will appear here.</div>
                        ) : (
                            <div className="audit-table-container">
                                <table className="audit-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Action</th>
                                            <th>Actor</th>
                                            <th>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log, index) => (
                                            <AuditRow key={log.id} log={log} index={index} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}

export default AuditPage;
