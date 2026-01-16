import { motion, AnimatePresence } from 'framer-motion';

const actionColors = {
    search: { bg: 'bg-blue-500/20', dot: 'bg-blue-400', text: 'text-blue-300' },
    export: { bg: 'bg-emerald-500/20', dot: 'bg-emerald-400', text: 'text-emerald-300' },
    support: { bg: 'bg-purple-500/20', dot: 'bg-purple-400', text: 'text-purple-300' },
};

function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
}

function ActivityItem({ activity, index }) {
    const colors = actionColors[activity.action] || actionColors.search;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 'auto' }}
            exit={{ opacity: 0, x: 20, height: 0 }}
            transition={{
                duration: 0.3,
                delay: index * 0.05,
                height: { duration: 0.2 }
            }}
            className="activity-item"
        >
            <div className={`activity-dot ${colors.dot}`} />
            <div className="activity-content">
                <span className={`activity-action ${colors.text}`}>
                    {activity.action.charAt(0).toUpperCase() + activity.action.slice(1)}
                </span>
                {activity.details && (
                    <span className="activity-details">{activity.details}</span>
                )}
            </div>
            <span className="activity-time">{formatTimeAgo(activity.timestamp)}</span>
        </motion.div>
    );
}

function ActivityFeed({ activities = [], maxItems = 8 }) {
    const displayActivities = activities.slice(0, maxItems);

    return (
        <div className="activity-feed">
            {/* Header */}
            <div className="activity-header">
                <h3 className="activity-title">Activity Feed</h3>
                <div className="live-badge">
                    <span className="live-dot" />
                    <span className="live-text">Live</span>
                </div>
            </div>

            {/* Activity List */}
            <div className="activity-list">
                <AnimatePresence mode="popLayout">
                    {displayActivities.length > 0 ? (
                        displayActivities.map((activity, index) => (
                            <ActivityItem
                                key={activity.id}
                                activity={activity}
                                index={index}
                            />
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="activity-empty"
                        >
                            <span className="empty-icon">📭</span>
                            <span className="empty-text">No activity yet</span>
                            <span className="empty-hint">Click an action to get started</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default ActivityFeed;
