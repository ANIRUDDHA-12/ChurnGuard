const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// Socket.IO with CORS for Vite dev server
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('✅ A user connected:', socket.id);

    // Listen for USER_ACTION events
    socket.on('USER_ACTION', (data) => {
        const timestamp = new Date().toISOString();
        console.log(`🎯 [${timestamp}] USER_ACTION received:`, {
            socketId: socket.id,
            action: data.action,
            metadata: data.metadata || {}
        });

        // Acknowledge the action back to the client
        socket.emit('ACTION_ACK', {
            success: true,
            action: data.action,
            timestamp
        });
    });

    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║   🛡️  ChurnGuard Server Running           ║
  ║   📡 Socket.IO listening on port ${PORT}     ║
  ║   🔗 http://localhost:${PORT}               ║
  ╚═══════════════════════════════════════════╝
  `);
});
