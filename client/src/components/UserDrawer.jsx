import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';

function UserDrawer({ user, onClose }) {
    if (!user) return null;

    const stats = [
        { label: 'User ID', value: user.user_id },
        { label: 'Churn Probability', value: `${Math.round(user.churn_probability * 100)}%` },
        { label: 'Risk Level', value: user.risk_level },
        { label: 'Primary Reason', value: user.primary_reason },
        { label: 'Total Clicks', value: user.total_clicks },
        { label: 'Avg Session Time', value: `${user.avg_session_time} min` },
        { label: 'Support Tickets', value: user.support_tickets },
        { label: 'Days Since Signup', value: user.days_since_signup },
        { label: 'Feature Usage', value: `${user.feature_usage_score}/10` },
    ];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="drawer-overlay"
                onClick={onClose}
            />
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="drawer"
            >
                <div className="drawer-header">
                    <h2>User Details</h2>
                    <button className="drawer-close" onClick={onClose}>
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="drawer-section">
                    <h3>User Metrics</h3>
                    {stats.map((stat, idx) => (
                        <div key={idx} className="drawer-stat">
                            <span className="drawer-stat-label">{stat.label}</span>
                            <span className="drawer-stat-value">{stat.value}</span>
                        </div>
                    ))}
                </div>

                <div className="drawer-section">
                    <h3>Recommendation</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {user.recommendation}
                    </p>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

export default UserDrawer;
