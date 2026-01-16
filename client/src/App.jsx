import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

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

  const styles = {
    success: {
      bg: 'bg-emerald-500/90',
      icon: '✓',
      border: 'border-emerald-400/30',
    },
    error: {
      bg: 'bg-red-500/90',
      icon: '✕',
      border: 'border-red-400/30',
    },
    info: {
      bg: 'bg-indigo-500/90',
      icon: '⚡',
      border: 'border-indigo-400/30',
    },
  }[type] || { bg: 'bg-indigo-500/90', icon: '⚡', border: 'border-indigo-400/30' };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 100, opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`${styles.bg} ${styles.border} border text-white px-5 py-4 rounded-xl 
                  shadow-2xl shadow-black/20 backdrop-blur-md flex items-center gap-3
                  min-w-[280px]`}
    >
      <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
        {styles.icon}
      </span>
      <span className="font-medium text-sm">{message}</span>
    </motion.div>
  );
}

// Action button component
function ActionButton({ icon, label, action, onClick, disabled }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(action)}
      disabled={disabled}
      className="btn-glow relative group 
                 bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80
                 border border-slate-700/40 rounded-2xl 
                 px-10 py-8
                 hover:border-indigo-500/40 
                 transition-all duration-500 ease-out
                 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
                 flex flex-col items-center justify-center gap-4
                 min-w-[180px] min-h-[160px]
                 backdrop-blur-sm"
    >
      {/* Icon container with glow */}
      <div className="relative">
        <span className="text-5xl block group-hover:scale-110 transition-transform duration-300 ease-out">
          {icon}
        </span>
        <div className="absolute inset-0 blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)' }} />
      </div>

      {/* Label */}
      <span className="text-slate-200 font-semibold text-lg tracking-wide 
                       group-hover:text-white transition-colors duration-300">
        {label}
      </span>

      {/* Animated underline */}
      <span className="absolute bottom-4 left-1/2 -translate-x-1/2 
                       w-0 h-0.5 rounded-full
                       bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
                       group-hover:w-2/3 transition-all duration-500 ease-out" />
    </motion.button>
  );
}

// Connection status indicator
function ConnectionStatus({ isConnected }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 
                 bg-slate-800/40 backdrop-blur-xl
                 border border-slate-700/30 rounded-full 
                 px-5 py-2.5
                 shadow-lg shadow-black/10"
    >
      <div className="relative">
        <div
          className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${isConnected ? 'bg-emerald-400 connected-pulse' : 'bg-red-400'
            }`}
        />
      </div>
      <span className={`text-sm font-medium tracking-wide transition-colors duration-300 ${isConnected ? 'text-emerald-400' : 'text-red-400'
        }`}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </motion.div>
  );
}

// Stats card component
function StatCard({ value, label, icon, color }) {
  const colorClasses = {
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
  }[color] || 'text-indigo-400';

  return (
    <div className="flex flex-col items-center gap-2 px-6 py-4">
      <div className={`text-4xl font-bold stat-value ${colorClasses}`}>
        {icon || value}
      </div>
      <div className="text-xs text-slate-500 uppercase tracking-widest font-medium">
        {label}
      </div>
    </div>
  );
}

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [toasts, setToasts] = useState([]);
  const [actionCount, setActionCount] = useState(0);

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

  // Handle action button click
  const handleAction = useCallback((action) => {
    if (!isConnected) {
      addToast('Not connected to server', 'error');
      return;
    }

    socket.emit('USER_ACTION', {
      action,
      metadata: {
        timestamp: new Date().toISOString(),
        sessionId: socket.id,
      },
    });

    setActionCount((prev) => prev + 1);
    addToast(`Emitting "${action}" action...`, 'info');
  }, [isConnected, addToast]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/40 backdrop-blur-xl bg-slate-900/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          {/* Logo & Branding */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 
                            flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-xl">🛡️</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold gradient-text">
                ChurnGuard
              </h1>
              <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">
                Phase 1 • Real-Time
              </span>
            </div>
          </motion.div>

          <ConnectionStatus isConnected={isConnected} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center mb-16 max-w-2xl"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-100 mb-6 leading-tight">
            SaaS Action
            <span className="block gradient-text text-glow">Simulator</span>
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed">
            Click any action button to emit a real-time event to the server.
            <br />
            <span className="text-slate-500">Watch your terminal for live logs.</span>
          </p>
        </motion.div>

        {/* Action Buttons Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: 'easeOut' }}
          className="flex flex-wrap justify-center gap-8 mb-16"
        >
          <ActionButton
            icon="🔍"
            label="Search"
            action="search"
            onClick={handleAction}
            disabled={!isConnected}
          />
          <ActionButton
            icon="📤"
            label="Export"
            action="export"
            onClick={handleAction}
            disabled={!isConnected}
          />
          <ActionButton
            icon="🎧"
            label="Support"
            action="support"
            onClick={handleAction}
            disabled={!isConnected}
          />
        </motion.div>

        {/* Stats Panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="glass-strong rounded-2xl flex items-center divide-x divide-slate-700/30
                     shadow-2xl shadow-black/20"
        >
          <StatCard
            value={actionCount}
            label="Actions Sent"
            color="indigo"
          />
          <StatCard
            icon={isConnected ? '🟢' : '🔴'}
            label="Status"
            color="emerald"
          />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/30 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-slate-600 text-sm">
            Real-time powered by Socket.IO
          </span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">Session:</span>
            <code className="font-mono text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg">
              {socket.id || '—'}
            </code>
          </div>
        </div>
      </footer>

      {/* Toast Container */}
      <div className="fixed top-6 right-6 flex flex-col gap-3 z-50">
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
