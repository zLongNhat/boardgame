import cors from 'cors';
import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { UserManager } from './auth/UserManager';
import { RoomManager } from './rooms/RoomManager';
import { registerSocketHandlers } from './sockets/gameHandlers';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const userManager = new UserManager();
const roomManager = new RoomManager();
registerSocketHandlers(io, roomManager, userManager);

// API health endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Auth: Register
app.post('/api/auth/register', (req, res) => {
  const { username, password, displayName, avatar } = req.body;
  const result = userManager.register(username, password, displayName, avatar);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.status(201).json(result);
});

// Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const result = userManager.login(username, password);
  if (!result.success) {
    return res.status(401).json(result);
  }
  return res.status(200).json(result);
});

// Auth: Get Current Profile
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const token = authHeader.substring(7);
  const user = userManager.getUserByToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
  return res.json({ success: true, user });
});

// Leaderboard: Get Top Players by Game or Overall
app.get('/api/leaderboard', (req, res) => {
  const gameType = (req.query.gameType as any) || 'all';
  const list = userManager.getLeaderboard(gameType);
  res.json({ success: true, leaderboard: list });
});

// Serve client build in production
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Fallback all non-API routes to client index.html for SPA routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('OmniDeck Server is running. Client build will be served here once built.');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[OmniDeck Server] Running on http://localhost:${PORT}`);
});

