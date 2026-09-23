import cors from 'cors';
import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { UserManager } from './auth/UserManager';
import { RoomManager } from './rooms/RoomManager';
import { WorkManager } from './engines/work/WorkManager';
import { TaiXiuEngine } from './engines/tai-xiu/TaiXiuEngine';
import { MinesEngine } from './engines/mines/MinesEngine';
import { GoalsEngine } from './engines/goals/GoalsEngine';
import { CasinoEngine } from './engines/casino/CasinoEngine';
import { registerSocketHandlers } from './sockets/gameHandlers';
import { flushRemoteSaves } from './storage/redisRest';

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
const workManager = new WorkManager(userManager);
const taiXiuEngine = new TaiXiuEngine(userManager);
const minesEngine = new MinesEngine(userManager);
const goalsEngine = new GoalsEngine(userManager);
const casinoEngine = new CasinoEngine(userManager);

registerSocketHandlers(io, roomManager, userManager, workManager, taiXiuEngine, minesEngine, goalsEngine, casinoEngine);

// Start Aviator shared rounds
casinoEngine.aviatorStart();
casinoEngine.on('aviator', (state: any) => {
  io.to('aviator-room').emit('aviator:state', state);
});

// Wire TaiXiu state broadcasts to all connected sockets in the 'taixiu' room
taiXiuEngine.on('stateChange', (state: any) => {
  io.to('taixiu-room').emit('taixiu:state', state);
});

taiXiuEngine.on('phaseChange', (data: any) => {
  io.to('taixiu-room').emit('taixiu:phase-change', data);
});

taiXiuEngine.on('result', (data: any) => {
  io.to('taixiu-room').emit('taixiu:result', data);
});

taiXiuEngine.on('settled', (data: any) => {
  io.to('taixiu-room').emit('taixiu:settled', data);
});

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
  const { username, password, remember } = req.body;
  const result = userManager.login(username, password, remember !== false);
  if (!result.success) {
    return res.status(401).json(result);
  }
  return res.status(200).json(result);
});

// Auth: Logout (thu hồi token)
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    userManager.revokeToken(authHeader.substring(7));
  }
  return res.json({ success: true });
});

// Auth: Get Current Profile (includes balance)
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

// Balance: Get user balance
app.get('/api/user/balance', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  const token = authHeader.substring(7);
  const user = userManager.getUserByToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid session' });
  }
  res.json({ success: true, balance: user.balance });
});

// Tai Xiu: Get round history
app.get('/api/tai-xiu/history', (_req, res) => {
  const state = taiXiuEngine.getState();
  res.json({ success: true, history: state.history });
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

async function bootstrap() {
  // Restore player data from Redis (if configured) BEFORE accepting traffic
  await userManager.initRemote();
  await taiXiuEngine.initRemote();

  // Start the Tai Xiu auto-running engine
  taiXiuEngine.start();

  server.listen(PORT, () => {
    console.log(`[OmniDeck Server] Running on http://localhost:${PORT}`);
    console.log(`[TaiXiu] Auto-running engine started.`);
  });
}

bootstrap().catch(err => {
  console.error('[OmniDeck] Fatal boot error:', err);
  process.exit(1);
});

// Flush pending debounced saves to Redis before Render stops the instance
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, async () => {
    console.log(`[OmniDeck] ${signal} received — flushing remote saves...`);
    await flushRemoteSaves();
    process.exit(0);
  });
}
