import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

// Demo credentials
const DEMO_USERS = {
    admin: { password: 'admin123', role: 'admin', name: 'Admin User' },
    operator: { password: 'op123', role: 'operator', name: 'Operator User' },
    viewer: { password: 'view123', role: 'viewer', name: 'Viewer User' },
};

function LoginPage({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simulate network delay
        await new Promise(r => setTimeout(r, 800));

        const user = DEMO_USERS[username.toLowerCase()];
        if (user && user.password === password) {
            const session = {
                username: username.toLowerCase(),
                role: user.role,
                name: user.name,
                loggedInAt: new Date().toISOString(),
            };
            localStorage.setItem('churnguard_session', JSON.stringify(session));
            onLogin(session);
        } else {
            setError('Invalid username or password');
        }
        setLoading(false);
    };

    return (
        <div className="login-page">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="login-card"
            >
                <div className="login-logo">
                    <div className="logo-icon large">
                        <ShieldCheckIcon className="w-8 h-8" />
                    </div>
                    <h1>ChurnGuard</h1>
                    <p>Real-Time Churn Prevention</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <div className="password-input">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ?
                                    <EyeSlashIcon className="w-5 h-5" /> :
                                    <EyeIcon className="w-5 h-5" />
                                }
                            </button>
                        </div>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="login-error"
                        >
                            {error}
                        </motion.div>
                    )}

                    <motion.button
                        type="submit"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="login-btn"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </motion.button>
                </form>

                <div className="demo-credentials">
                    <p>Demo Credentials:</p>
                    <div className="credentials-list">
                        <span><strong>admin</strong> / admin123</span>
                        <span><strong>operator</strong> / op123</span>
                        <span><strong>viewer</strong> / view123</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default LoginPage;
