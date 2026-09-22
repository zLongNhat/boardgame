import { Server, Socket } from 'socket.io';
import { UserManager } from '../auth/UserManager';
import { Room, RoomManager } from '../rooms/RoomManager';

export function registerSocketHandlers(io: Server, roomManager: RoomManager, userManager: UserManager) {
  const formatPlayerDTO = (p: any) => ({
    id: p.id,
    sessionId: p.sessionId,
    userId: p.userId,
    name: p.name,
    avatar: p.avatar,
    isHost: p.isHost,
    isBot: p.isBot,
    isReady: p.isReady,
    connected: p.connected
  });

  const formatRoomDTO = (room: Room) => ({
    id: room.id,
    hostId: room.hostId,
    players: room.players.map(formatPlayerDTO),
    settings: room.settings,
    inGame: room.inGame,
    chatMessages: room.chatMessages
  });

  const broadcastRoomState = (room: Room) => {
    // 1. Broadcast public room metadata (lobby view, player list, chat)
    io.to(room.id).emit('room_updated', formatRoomDTO(room));

    // 2. Server-authoritative state masking: emit tailored state to each connected player
    if (room.inGame && room.gameInstance) {
      for (const player of room.players) {
        if (!player.isBot && player.socketId) {
          const maskedState = room.gameInstance.getMaskedState(player.id);
          io.to(player.socketId).emit('game_state', maskedState);
        }
      }
    }
  };

  const sendPrivateMessage = (room: Room, targetPlayerId: string, event: string, payload: any) => {
    const player = room.players.find(p => p.id === targetPlayerId);
    if (player && player.socketId) {
      io.to(player.socketId).emit(event, payload);
    }
  };

  io.on('connection', (socket: Socket) => {
    // Handle Room Creation
    socket.on('create_room', (data, callback) => {
      const { sessionId, playerName, avatar, userId } = data;
      const room = roomManager.createRoom(sessionId, playerName, avatar, socket.id, userId);
      socket.join(room.id);

      if (typeof callback === 'function') {
        callback({ success: true, room: formatRoomDTO(room), player: formatPlayerDTO(room.players[0]) });
      }
      broadcastRoomState(room);
    });

    // Handle Join Room
    socket.on('join_room', (data, callback) => {
      const { roomId, sessionId, playerName, avatar, userId } = data;
      const res = roomManager.joinRoom(roomId, sessionId, playerName, avatar, socket.id, userId);

      if (res.success && res.room && res.player) {
        socket.join(res.room.id);
        if (typeof callback === 'function') {
          callback({ success: true, room: formatRoomDTO(res.room), player: formatPlayerDTO(res.player) });
        }
        broadcastRoomState(res.room);
      } else {
        if (typeof callback === 'function') {
          callback({ success: false, message: res.message });
        }
      }
    });

    // Handle Session Reconnection
    socket.on('reconnect_session', (data, callback) => {
      const { sessionId, userId } = data;
      const room = roomManager.getRoomBySession(sessionId);
      if (!room) {
        if (typeof callback === 'function') callback({ success: false });
        return;
      }

      const player = room.players.find(p => p.sessionId === sessionId);
      if (player) {
        player.connected = true;
        player.socketId = socket.id;
        if (userId) player.userId = userId;
        socket.join(room.id);

        if (room.gameInstance) {
          room.gameInstance.handleReconnect(player.id);
        }

        if (typeof callback === 'function') {
          callback({ success: true, room: formatRoomDTO(room), player: formatPlayerDTO(player) });
        }
        broadcastRoomState(room);
      } else {
        if (typeof callback === 'function') callback({ success: false });
      }
    });

    // Handle Fetch Leaderboard via Socket
    socket.on('get_leaderboard', (data, callback) => {
      const gameType = data?.gameType || 'all';
      const leaderboard = userManager.getLeaderboard(gameType);
      if (typeof callback === 'function') {
        callback({ success: true, leaderboard });
      }
    });

    // Handle Add Bot
    socket.on('add_bot', (data, callback) => {
      const { roomId, requesterId } = data;
      const res = roomManager.addBot(roomId, requesterId);
      const room = roomManager.getRoom(roomId);
      if (room) broadcastRoomState(room);
      if (typeof callback === 'function') callback(res);
    });

    // Handle Remove Bot / Kick Player
    socket.on('remove_bot', (data, callback) => {
      const { roomId, requesterId, targetPlayerId } = data;
      const res = roomManager.removeBotOrKick(roomId, requesterId, targetPlayerId);
      const room = roomManager.getRoom(roomId);
      if (room) broadcastRoomState(room);
      if (typeof callback === 'function') callback(res);
    });

    // Handle Update Settings
    socket.on('update_settings', (data, callback) => {
      const { roomId, requesterId, settings } = data;
      const res = roomManager.updateSettings(roomId, requesterId, settings);
      const room = roomManager.getRoom(roomId);
      if (room) broadcastRoomState(room);
      if (typeof callback === 'function') callback(res);
    });

    // Handle Ready Toggle
    socket.on('set_ready', (data, callback) => {
      const { roomId, playerId, isReady } = data;
      const res = roomManager.setPlayerReady(roomId, playerId, isReady);
      const room = roomManager.getRoom(roomId);
      if (room) broadcastRoomState(room);
      if (typeof callback === 'function') callback(res);
    });

    // Handle Start Game
    socket.on('start_game', (data, callback) => {
      const { roomId, requesterId } = data;
      const res = roomManager.startGame(roomId, requesterId, {
        onBroadcastState: (r) => broadcastRoomState(r),
        onPrivateMessage: (playerId, event, payload) => {
          const roomObj = roomManager.getRoom(roomId);
          if (roomObj) sendPrivateMessage(roomObj, playerId, event, payload);
        },
        onGameOver: (r, winners) => {
          if (winners && winners.length > 0) {
            const participantUserIds = r.players.filter(p => p.userId).map(p => p.userId!);
            const winnerUserIds = r.players.filter(p => winners.includes(p.id) && p.userId).map(p => p.userId!);
            userManager.recordGameResult(r.settings.gameType, participantUserIds, winnerUserIds);
            io.emit('leaderboard_updated', userManager.getLeaderboard('all'));
          }
          broadcastRoomState(r);
        }
      });

      const room = roomManager.getRoom(roomId);
      if (room) broadcastRoomState(room);
      if (typeof callback === 'function') callback(res);
    });

    // Handle Restart Game (Return to Lobby)
    socket.on('restart_game', (data, callback) => {
      const { roomId, requesterId } = data;
      const res = roomManager.restartGame(roomId, requesterId);
      const room = roomManager.getRoom(roomId);
      if (room) broadcastRoomState(room);
      if (typeof callback === 'function') callback(res);
    });

    // Handle Player Game Action
    socket.on('game_action', (data, callback) => {
      const { roomId, playerId, action } = data;
      const room = roomManager.getRoom(roomId);
      if (!room || !room.gameInstance) {
        if (typeof callback === 'function') callback({ success: false, message: 'No active game in room.' });
        return;
      }

      const res = room.gameInstance.handleAction(playerId, action);
      broadcastRoomState(room);
      if (typeof callback === 'function') callback(res);
    });

    // Handle In-Game Chat / Message
    socket.on('send_chat', (data) => {
      const { roomId, senderId, senderName, text } = data;
      if (!text || !text.trim()) return;
      roomManager.addChatMessage(roomId, senderName, text.trim(), false, senderId);
      const room = roomManager.getRoom(roomId);
      if (room) broadcastRoomState(room);
    });

    // Handle Leave Room
    socket.on('leave_room', (data, callback) => {
      const { roomId, playerId } = data;
      const res = roomManager.leaveRoom(roomId, playerId);
      socket.leave(roomId);
      const room = roomManager.getRoom(roomId);
      if (room) {
        broadcastRoomState(room);
      }
      if (typeof callback === 'function') callback(res);
    });

    // Handle Disconnect
    socket.on('disconnect', () => {
      roomManager.handleSocketDisconnect(socket.id);
      // Broadcast state update to any affected rooms
      for (const r of (roomManager as any).rooms.values()) {
        broadcastRoomState(r);
      }
    });
  });
}
