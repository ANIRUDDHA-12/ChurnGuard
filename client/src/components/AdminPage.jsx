import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ExclamationTriangleIcon,
    EnvelopeIcon,
    TicketIcon,
    GiftIcon,
    ArrowLeftIcon,
    UserGroupIcon,
    ChartBarIcon,
    ArrowDownTrayIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import SentinelPanel from './SentinelPanel';
import ThemeToggle from './ThemeToggle';
import UserDrawer from './UserDrawer';
import { SERVER_URL, ML_API_URL } from '../config';

const API_BASE = ML_API_URL;
const SERVER_BASE = SERVER_URL;

// Reason badge colors
const reasonColors = {
    'High Friction': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    'Low Engagement': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    'Low Activity': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    'Support Issues': { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
    'Short Sessions': { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    'Underutilizing Features': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    'Stale Account': { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
    'Healthy User': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
};

// Risk level colors
const riskColors = {
    HIGH: { bg: 'bg-red-500/20', text: 'text-red-400', glow: 'shadow-red-500/20' },
    MEDIUM: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
    LOW: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
};

// Toast component
function Toast({ message, type, onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const icons = { success: '✓', error: '✕', info: '⚡' };

    return (
        <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className={`toast toast-${type}`}
        >
            <span className="toast-icon">{icons[type]}</span>
            <span className="toast-message">{message}</span>
        </motion.div>
    );
}

// High Risk Alert Banner
function HighRiskAlert({ count }) {
    if (count === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="high-risk-alert"
        >
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span>
                <strong>{count} users</strong> with &gt;80% churn risk require immediate attention
            </span>
        </motion.div>
    );
}

// Reason Badge component
function ReasonBadge({ reason }) {
    const colors = reasonColors[reason] || reasonColors['Healthy User'];

    return (
        <span className={`reason-badge ${colors.bg} ${colors.text} ${colors.border}`}>
            {reason}
        </span>
    );
}

// Risk Score Bar
function RiskScore({ probability, riskLevel }) {
    const colors = riskColors[riskLevel] || riskColors.LOW;
    const percentage = Math.round(probability * 100);

    return (
        <div className="risk-score">
            <div className="risk-bar-container">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`risk-bar ${colors.bg}`}
                />
            </div>
            <span className={`risk-percentage ${colors.text}`}>{percentage}%</span>
        </div>
    );
}

// Action Buttons
function ActionButtons({ userId, onAction, loading }) {
    const actions = [
        { type: 'nudge', icon: EnvelopeIcon, label: 'Nudge', color: 'blue' },
        { type: 'support', icon: TicketIcon, label: 'Support', color: 'purple' },
        { type: 'offer', icon: GiftIcon, label: 'Offer', color: 'emerald' },
    ];

    return (
        <div className="action-buttons">
            {actions.map(({ type, icon: Icon, label, color }) => (
                <motion.button
                    key={type}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onAction(userId, type)}
                    disabled={loading === type}
                    className={`action-btn action-btn-${color}`}
                    title={label}
                >
                    <Icon className="w-4 h-4" />
                </motion.button>
            ))}
        </div>
    );
}

// User Row component
function UserRow({ user, index, onAction, loadingAction, onSelect }) {
    const riskColor = riskColors[user.risk_level] || riskColors.LOW;

    return (
        <motion.tr
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="user-row"
        >
            <td className="user-cell">
                <div className="user-info">
                    <span
                        className="user-id"
                        onClick={onSelect}
                        style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                    >
                        {user.user_id}
                    </span>
                    <span className="user-stats">
                        {user.total_clicks} clicks • {user.support_tickets} tickets
                    </span>
                </div>
            </td>
            <td className="risk-cell">
                <RiskScore probability={user.churn_probability} riskLevel={user.risk_level} />
            </td>
            <td className="reason-cell">
                <ReasonBadge reason={user.primary_reason} />
            </td>
            <td className="actions-cell">
                <ActionButtons
                    userId={user.user_id}
                    onAction={onAction}
                    loading={loadingAction}
                />
            </td>
        </motion.tr>
    );
}

// Main Admin Page component
function AdminPage({ onBack, socket }) {
    const [users, setUsers] = useState([]);
    const [highRiskCount, setHighRiskCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingAction, setLoadingAction] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [error, setError] = useState(null);

    // Filter & Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [riskFilter, setRiskFilter] = useState('all');
    const [reasonFilter, setReasonFilter] = useState('all');

    // User drawer state
    const [selectedUser, setSelectedUser] = useState(null);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Filtered users based on search and filters
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            // Search filter
            if (searchTerm && !user.user_id.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }
            // Risk level filter
            if (riskFilter !== 'all' && user.risk_level !== riskFilter) {
                return false;
            }
            // Reason filter
            if (reasonFilter !== 'all' && user.primary_reason !== reasonFilter) {
                return false;
            }
            return true;
        });
    }, [users, searchTerm, riskFilter, reasonFilter]);

    // Get unique reasons for filter dropdown
    const uniqueReasons = useMemo(() => {
        const reasons = [...new Set(users.map(u => u.primary_reason))];
        return reasons.filter(Boolean);
    }, [users]);

    // Export to CSV
    const exportToCSV = useCallback(() => {
        const headers = ['User ID', 'Risk %', 'Risk Level', 'Primary Reason', 'Clicks', 'Tickets', 'Session Time'];
        const rows = filteredUsers.map(u => [
            u.user_id,
            Math.round(u.churn_probability * 100),
            u.risk_level,
            u.primary_reason,
            u.total_clicks,
            u.support_tickets,
            u.avg_session_time
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `churnguard-risk-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        addToast('CSV exported successfully', 'success');
    }, [filteredUsers, addToast]);

    // Fetch users with risk predictions
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/users/risk?limit=50`);

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            setUsers(data.users || []);
            setHighRiskCount(data.high_risk_count || 0);
            setError(null);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError(err.message);
            addToast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    // Handle intervention action
    const handleAction = useCallback(async (userId, actionType) => {
        setLoadingAction(actionType);

        try {
            const response = await fetch(`${SERVER_BASE}/api/intervene`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, actionType }),
            });

            const data = await response.json();

            if (data.success) {
                const actionLabels = {
                    nudge: '📧 Re-engagement email sent',
                    support: '🎫 Flagged for priority support',
                    offer: '💎 Discount offer applied',
                };
                addToast(actionLabels[actionType] || 'Action completed', 'success');
            } else {
                throw new Error(data.error || 'Action failed');
            }
        } catch (err) {
            console.error('Error performing action:', err);
            addToast(`Failed: ${err.message}`, 'error');
        } finally {
            setLoadingAction(null);
        }
    }, [addToast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    return (
        <div className="admin-page">
            {/* Header */}
            <header className="admin-header">
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
                        <h1>Intervention Command Center</h1>
                        <span className="header-subtitle">Churn Risk Management Dashboard</span>
                    </div>
                </div>
                <div className="header-stats">
                    <div className="stat-item">
                        <UserGroupIcon className="w-5 h-5" />
                        <span>{users.length} Users</span>
                    </div>
                    <div className="stat-item stat-danger">
                        <ExclamationTriangleIcon className="w-5 h-5" />
                        <span>{highRiskCount} High Risk</span>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            {/* Sentinel Panel */}
            <SentinelPanel socket={socket} />

            {/* Filter & Search Bar */}
            <div className="filter-bar">
                <input
                    type="text"
                    placeholder="Search by User ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="all">All Risk Levels</option>
                    <option value="HIGH">High Risk</option>
                    <option value="MEDIUM">Medium Risk</option>
                    <option value="LOW">Low Risk</option>
                </select>
                <select
                    value={reasonFilter}
                    onChange={(e) => setReasonFilter(e.target.value)}
                    className="filter-select"
                >
                    <option value="all">All Reasons</option>
                    {uniqueReasons.map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                    ))}
                </select>
                <button onClick={exportToCSV} className="export-btn">
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            {/* High Risk Alert */}
            <HighRiskAlert count={highRiskCount} />

            {/* Main Content */}
            <div className="admin-content">
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner" />
                        <span>Loading user risk data...</span>
                    </div>
                ) : error ? (
                    <div className="error-state">
                        <ExclamationTriangleIcon className="w-8 h-8" />
                        <span>{error}</span>
                        <button onClick={fetchUsers} className="retry-button">Retry</button>
                    </div>
                ) : (
                    <div className="risk-table-container">
                        <table className="risk-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Risk Score</th>
                                    <th>Primary Reason</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {filteredUsers.map((user, index) => (
                                        <UserRow
                                            key={user.id}
                                            user={user}
                                            index={index}
                                            onAction={handleAction}
                                            loadingAction={loadingAction}
                                            onSelect={() => setSelectedUser(user)}
                                        />
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Toast Container */}
            <div className="toast-container">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <Toast
                            key={toast.id}
                            message={toast.message}
                            type={toast.type}
                            onClose={() => removeToast(toast.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* User Detail Drawer */}
            {selectedUser && (
                <UserDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />
            )}
        </div>
    );
}

export default AdminPage;
