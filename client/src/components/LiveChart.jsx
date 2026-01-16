import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;

    return (
        <div className="chart-tooltip">
            <p className="tooltip-time">{label}</p>
            <p className="tooltip-value">{payload[0].value} actions</p>
        </div>
    );
}

function LiveChart({ data = [], title = "Action Count Over Time" }) {
    // Generate chart data from activities or use sample data
    const chartData = useMemo(() => {
        if (data.length === 0) {
            // Generate sample data for empty state
            const now = new Date();
            return Array.from({ length: 12 }, (_, i) => ({
                time: new Date(now - (11 - i) * 5 * 60000).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                count: Math.floor(Math.random() * 20) + 5,
            }));
        }

        // Group activities by 5-minute intervals
        const grouped = {};
        data.forEach((activity) => {
            const time = new Date(activity.timestamp);
            const key = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            grouped[key] = (grouped[key] || 0) + 1;
        });

        return Object.entries(grouped).map(([time, count]) => ({ time, count }));
    }, [data]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="live-chart"
        >
            {/* Header */}
            <div className="chart-header">
                <h3 className="chart-title">{title}</h3>
                <div className="chart-legend">
                    <span className="legend-dot" />
                    <span className="legend-text">Total Actions</span>
                </div>
            </div>

            {/* Chart */}
            <div className="chart-container">
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="time"
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            fill="url(#colorCount)"
                            animationDuration={500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}

export default LiveChart;
