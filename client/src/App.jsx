import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// Components
import Sidebar from './components/Sidebar';
import MetricCard from './components/MetricCard';
import ActivityFeed from './components/ActivityFeed';
import QuickActions from './components/QuickActions';
import LiveChart from './components/LiveChart';
import AdminPage from './components/AdminPage';

// Socket.IO connection
const socket = io('http://localhost:3001', {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
});

// Toast notification component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: '✓',
    error: '✕',
    info: '⚡',
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 100, opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`toast toast-${type}`}
    >
      <span className="toast-icon">{icons[type] || '⚡'}</span>
      <span className="toast-message">{message}</span>
    </motion.div>
  );
}

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [toasts, setToasts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [metrics, setMetrics] = useState({
    totalActions: 0,
    activeUsers: 1,
    successRate: 100,
    avgResponse: 0,
  });
  const [activeNav, setActiveNav] = useState('dashboard');
  const [responseTimes, setResponseTimes] = useState([]);
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Add toast notification
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  // Remove toast notification
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Handle socket connection events
  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      addToast('Connected to ChurnGuard server', 'success');
    }

    function onDisconnect() {
      setIsConnected(false);
      addToast('Disconnected from server', 'error');
    }

    function onActionAck(data) {
      if (data.success) {
        // Calculate response time
        const responseTime = Date.now() - data.sentAt;
        setResponseTimes((prev) => [...prev.slice(-9), responseTime]);

        // Update success rate
        setMetrics((prev) => ({
          ...prev,
          successRate: Math.round(
            ((prev.totalActions * prev.successRate / 100) + 1) /
            (prev.totalActions + 1) * 100
          ),
        }));

        addToast(`Action "${data.action}" confirmed`, 'success');
      }
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('ACTION_ACK', onActionAck);

    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('ACTION_ACK', onActionAck);
    };
  }, [addToast]);

  // Calculate average response time
  useEffect(() => {
    if (responseTimes.length > 0) {
      const avg = Math.round(
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      );
      setMetrics((prev) => ({ ...prev, avgResponse: avg }));
    }
  }, [responseTimes]);

  // Handle action button click
  const handleAction = useCallback((action) => {
    if (!isConnected) {
      addToast('Not connected to server', 'error');
      return;
    }

    const timestamp = new Date().toISOString();
    const sentAt = Date.now();

    socket.emit('USER_ACTION', {
      action,
      metadata: {
        timestamp,
        sessionId: socket.id,
      },
      sentAt,
    });

    // Add to activity feed
    const newActivity = {
      id: Date.now(),
      action,
      timestamp,
      details: `Session: ${socket.id?.slice(0, 8)}...`,
    };

    setActivities((prev) => [newActivity, ...prev].slice(0, 50));
    setMetrics((prev) => ({
      ...prev,
      totalActions: prev.totalActions + 1,
    }));

    addToast(`Emitting "${action}" action...`, 'info');
  }, [isConnected, addToast]);

  // If on admin page, render AdminPage component
  if (currentPage === 'admin') {
    return <AdminPage onBack={() => setCurrentPage('dashboard')} socket={socket} />;
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <Sidebar
        isConnected={isConnected}
        activeNav={activeNav}
        onNavChange={setActiveNav}
      />

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-title">
            <h1>ChurnGuard Dashboard</h1>
            <span className="header-subtitle">
              Real-time user activity monitoring • Phase 4
            </span>
          </div>

          {/* Admin Link */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCurrentPage('admin')}
            className="admin-link"
          >
            <ExclamationTriangleIcon className="w-4 h-4" />
            Intervention Center
          </motion.button>
        </header>

        {/* Metrics Grid */}
        <div className="metrics-grid">
          <MetricCard
            title="Total Actions"
            value={metrics.totalActions}
            trend="+12%"
            trendDirection="up"
            color="purple"
          />
          <MetricCard
            title="Active Users"
            value={metrics.activeUsers}
            trend="-1"
            trendDirection="down"
            color="blue"
          />
          <MetricCard
            title="Success Rate"
            value={`${metrics.successRate}%`}
            color="green"
          />
          <MetricCard
            title="Avg Response"
            value={`${metrics.avgResponse}ms`}
            trend="-5ms"
            trendDirection="down"
            color="cyan"
          />
        </div>

        {/* Content Grid */}
        <div className="content-grid">
          {/* Activity Feed */}
          <ActivityFeed activities={activities} maxItems={8} />

          {/* Quick Actions */}
          <QuickActions onAction={handleAction} isConnected={isConnected} />
        </div>

        {/* Live Chart */}
        <LiveChart data={activities} title="Action Count Over Time" />
      </main>

      {/* Toast Container */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
