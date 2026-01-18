/**
 * API Configuration
 * ==================
 * Centralized configuration for all API endpoints.
 * Uses environment variables for production deployment.
 */

// Server API (Node.js backend)
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// ML API (Python FastAPI)
export const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

// Socket.IO configuration
export const SOCKET_CONFIG = {
    url: SERVER_URL,
    options: {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    }
};

// Export for convenience
export default {
    SERVER_URL,
    ML_API_URL,
    SOCKET_CONFIG,
};
