import { motion } from 'framer-motion';
import {
    MagnifyingGlassIcon,
    ArrowUpTrayIcon,
    ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

const actions = [
    { id: 'search', icon: MagnifyingGlassIcon, label: 'Search' },
    { id: 'export', icon: ArrowUpTrayIcon, label: 'Export' },
    { id: 'support', icon: ChatBubbleLeftRightIcon, label: 'Support' },
];

function QuickActions({ onAction, isConnected }) {
    return (
        <div className="quick-actions">
            {/* Header */}
            <div className="quick-actions-header">
                <h3 className="quick-actions-title">Quick Actions</h3>
            </div>

            {/* Action Grid */}
            <div className="actions-grid">
                {actions.map((action, index) => {
                    const Icon = action.icon;

                    return (
                        <motion.button
                            key={action.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onAction(action.id)}
                            disabled={!isConnected}
                            className="action-button"
                        >
                            <Icon className="action-icon" />
                            <span className="action-label">{action.label}</span>

                            {/* Hover glow */}
                            <div className="action-glow" />
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}

export default QuickActions;
