import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    HomeIcon,
    BoltIcon,
    ChartBarIcon,
    CpuChipIcon,
    ShieldCheckIcon,
    Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const navItems = [
    { id: 'dashboard', icon: HomeIcon, label: 'Dashboard' },
    { id: 'activity', icon: BoltIcon, label: 'Activity' },
    { id: 'analytics', icon: ChartBarIcon, label: 'Analytics' },
    { id: 'ml', icon: CpuChipIcon, label: 'ML Intelligence' },
    { id: 'audit', icon: ShieldCheckIcon, label: 'Audit & Access' },
    { id: 'settings', icon: Cog6ToothIcon, label: 'Settings' },
];

function Sidebar({ isConnected, activeNav = 'dashboard', onNavChange }) {
    const [hoveredItem, setHoveredItem] = useState(null);

    return (
        <motion.aside
            initial={{ x: -70, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="sidebar"
        >
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="logo-icon">
                    <span className="logo-letter">C</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeNav === item.id;
                    const isHovered = hoveredItem === item.id;

                    return (
                        <motion.button
                            key={item.id}
                            onClick={() => onNavChange?.(item.id)}
                            onMouseEnter={() => setHoveredItem(item.id)}
                            onMouseLeave={() => setHoveredItem(null)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="activeIndicator"
                                    className="active-indicator"
                                />
                            )}
                            <Icon className="nav-icon" />

                            {/* Tooltip */}
                            {isHovered && (
                                <motion.div
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="nav-tooltip"
                                >
                                    {item.label}
                                </motion.div>
                            )}
                        </motion.button>
                    );
                })}
            </nav>

            {/* Connection Status */}
            <div className="sidebar-footer">
                <div className={`connection-dot ${isConnected ? 'connected' : ''}`} />
                <span className="connection-label">
                    {isConnected ? 'Live' : 'Offline'}
                </span>
            </div>
        </motion.aside>
    );
}

export default Sidebar;
