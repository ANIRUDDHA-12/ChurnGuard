import { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

function MetricCard({ title, value, trend, trendDirection, icon, color = 'purple' }) {
    const prevValueRef = useRef(value);
    const displayValue = useSpring(prevValueRef.current, { damping: 30, stiffness: 100 });

    useEffect(() => {
        displayValue.set(value);
        prevValueRef.current = value;
    }, [value, displayValue]);

    const animatedValue = useTransform(displayValue, (v) => {
        if (typeof value === 'string') return value;
        return Math.round(v);
    });

    const colorClasses = {
        purple: 'metric-card-purple',
        blue: 'metric-card-blue',
        green: 'metric-card-green',
        cyan: 'metric-card-cyan',
    }[color];

    const trendColors = {
        up: 'trend-up',
        down: 'trend-down',
        neutral: 'trend-neutral',
    }[trendDirection || 'neutral'];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.3 }}
            className={`metric-card ${colorClasses}`}
        >
            {/* Trend Badge */}
            {trend && (
                <div className={`trend-badge ${trendColors}`}>
                    <span className="trend-arrow">
                        {trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→'}
                    </span>
                    <span className="trend-value">{trend}</span>
                </div>
            )}

            {/* Value */}
            <div className="metric-value">
                {icon ? (
                    <span className="metric-icon">{icon}</span>
                ) : (
                    <motion.span>{animatedValue}</motion.span>
                )}
            </div>

            {/* Title */}
            <div className="metric-title">{title}</div>

            {/* Glow Effect */}
            <div className="metric-glow" />
        </motion.div>
    );
}

export default MetricCard;
