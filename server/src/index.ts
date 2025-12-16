import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Import Firebase (initializes on import)
import './config/firebase';

import { setupSocketHandlers } from './socket/handlers';
import authRoutes from './routes/auth';
import messageRoutes from './routes/messages';
import userRoutes from './routes/users';
import friendsRoutes from './routes/friends';
import mediaRoutes from './routes/media';
import dataRoutes from './routes/data';

const app = express();
const httpServer = createServer(app);

// Socket.io setup with CORS
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}));
app.use(express.json());

// Setup Socket.io handlers
setupSocketHandlers(io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/data', dataRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({
        message: 'SSCHATS Server is running',
        version: '1.0.0',
        status: 'healthy',
        database: 'Firebase Firestore'
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║       🚀 SSCHATS SERVER RUNNING 🚀        ║
╠═══════════════════════════════════════════╣
║  Port: ${PORT}                               ║
║  Mode: ${process.env.NODE_ENV || 'development'}                      ║
║  Database: Firebase Firestore             ║
╚═══════════════════════════════════════════╝
    `);
});
