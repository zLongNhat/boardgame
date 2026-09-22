import { Server, Socket } from 'socket.io';
import { UserManager } from '../auth/UserManager';
import { Room, RoomManager, sanitizeRoomBet, MIN_ROOM_BET, MAX_ROOM_BET } from '../rooms/RoomManager';
import { WorkManager } from '../engines/work/WorkManager';
import { TaiXiuEngine } from '../engines/tai-xiu/TaiXiuEngine';
import { MinesEngine } from '../engines/mines/MinesEngine';
import { GoalsEngine } from '../engines/goals/GoalsEngine';
import { CasinoEngine } from '../engines/casino/CasinoEngine';

export function registerSocketHandlers(
  io: Server,
  roomManager: RoomManager,
  userManager: UserManager,
  workManager?: WorkManager,
  taiXiuEngine?: TaiXiuEngine,
  minesEngine?: MinesEngine,
  goalsEngine?: GoalsEngine,
  casinoEngine?: CasinoEngine
) {
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
    // Handle Room Creation (phòng luôn tính phí — kèm tiền cược)
    socket.on('create_room', (data, callback) => {
      const { sessionId, playerName, avatar, userId, betAmount } = data;
      const bet = sanitizeRoomBet(betAmount);
      if (betAmount !== undefined && (Math.floor(Number(betAmount)) < MIN_ROOM_BET || Math.floor(Number(betAmount)) > MAX_ROOM_BET)) {
        if (typeof callback === 'function') {
          callback({ success: false, message: `Mức cược phòng từ ${MIN_ROOM_BET} đến ${MAX_ROOM_BET} 🪙.` });
        }
        return;
      }
      // Kiểm tra số dư chủ phòng trước khi tạo (trừ thật lúc start game)
      if (userId) {
        const bal = userManager.getBalance(userId);
        if (bal < bet) {
          if (typeof callback === 'function') {
            callback({ success: false, message: `Không đủ tiền tạo phòng ${bet} 🪙 (đang có ${bal} 🪙). Hãy đi làm kiếm thêm!` });
          }
          return;
        }
      }
      const room = roomManager.createRoom(sessionId, playerName, avatar, socket.id, userId, bet);
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

    // Handle Start Game (kèm cược phòng multiplayer)
    socket.on('start_game', (data, callback) => {
      const { roomId, requesterId } = data;
      const roomBefore = roomManager.getRoom(roomId);
      const betAmount = Math.floor(Number(roomBefore?.settings?.betAmount || 0));

      // Thu tiền cược phòng trước khi start: chỉ trừ tài khoản đã đăng nhập, bỏ qua Guest/Bot
      let payers: Array<{ playerId: string; userId: string }> = [];
      if (roomBefore && betAmount > 0) {
        payers = roomBefore.players
          .filter(p => !p.isBot && p.userId)
          .map(p => ({ playerId: p.id, userId: p.userId! }));

        for (const p of payers) {
          const bal = userManager.getBalance(p.userId);
          if (bal < betAmount) {
            const offender = roomBefore.players.find(x => x.id === p.playerId);
            if (typeof callback === 'function') {
              callback({ success: false, message: `Không đủ tiền cược phòng: ${offender?.name || 'người chơi'} cần ${betAmount} 🪙 (đang có ${bal} 🪙).` });
            }
            return;
          }
        }

        for (const p of payers) {
          const r = userManager.deductBalance(p.userId, betAmount, `Room bet ${roomId} (${roomBefore.settings.gameType})`);
          if (!r.success) {
            // Hoàn tiền những người đã trừ nếu có lỗi giữa chừng
            for (const done of payers) {
              if (done.userId === p.userId) break;
              userManager.addBalance(done.userId, betAmount, `Refund room bet ${roomId}`);
            }
            if (typeof callback === 'function') callback({ success: false, message: r.message || 'Lỗi trừ tiền cược phòng.' });
            return;
          }
        }
      }

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
            // Trả thưởng pot cho người thắng đã đăng nhập (Guest/Bot không nhận)
            const potBet = Math.floor(Number(r.settings?.betAmount || 0));
            if (potBet > 0 && payers.length > 0 && winnerUserIds.length > 0) {
              const potTotal = potBet * payers.length;
              const share = Math.floor(potTotal / winnerUserIds.length);
              for (const uid of winnerUserIds) {
                userManager.addBalance(uid, share, `Room win ${r.id} (${r.settings.gameType}) pot ${potTotal}`);
              }
              roomManager.addChatMessage(r.id, 'System', `🏆 Pot ${potTotal} 🪙 → ${winnerUserIds.length} người thắng, mỗi người +${share} 🪙.`, true);
            }
            io.emit('leaderboard_updated', userManager.getLeaderboard('all'));
          }
          broadcastRoomState(r);
        }
      });

      // Nếu start thất bại sau khi đã trừ tiền → hoàn tiền
      if (!res.success && betAmount > 0 && payers.length > 0) {
        for (const p of payers) {
          userManager.addBalance(p.userId, betAmount, `Refund room bet ${roomId} (start failed)`);
        }
      }

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
      // Leave taixiu room on disconnect
      socket.leave('taixiu-room');
    });

    // ========== WORK SYSTEM ==========
    if (workManager) {
      socket.on('work:request-word', (data: any, callback: Function) => {
        const userId = data?.userId;
        if (!userId) return callback({ success: false, message: 'Chưa đăng nhập' });
        const result = workManager.requestWord(userId, data?.lang);
        callback(result);
      });

      socket.on('work:submit-word', (data: any, callback: Function) => {
        const { userId, word } = data || {};
        if (!userId) return callback({ success: false, message: 'Chưa đăng nhập' });
        const result = workManager.submitWord(userId, word);
        callback(result);
      });
    }

    // ========== TÀI XỈU ==========
    if (taiXiuEngine) {
      socket.on('taixiu:join', (_data: any, callback?: Function) => {
        socket.join('taixiu-room');
        const state = taiXiuEngine.getState();
        if (typeof callback === 'function') callback({ success: true, state });
        else socket.emit('taixiu:state', state);
      });

      socket.on('taixiu:leave', () => {
        socket.leave('taixiu-room');
      });

      socket.on('taixiu:place-bet', (data: any, callback: Function) => {
        const { userId, displayName, betType, amount } = data || {};
        if (!userId) {
          if (typeof callback === 'function') return callback({ success: false, message: 'Chưa đăng nhập' });
          return;
        }
        const result = taiXiuEngine.placeBet(userId, displayName || 'Player', betType, amount);
        if (typeof callback !== 'function') return;
        if (!result.success) return callback(result);
        const newBalance = userManager.getBalance(userId);
        callback({ ...result, newBalance });
      });
    }

    // ========== MINES ==========
    if (minesEngine) {
      socket.on('mines:start', (data: any, callback: Function) => {
        const { userId, betAmount, mineCount, clientSeed } = data || {};
        if (!userId) return callback({ success: false, message: 'Chưa đăng nhập' });
        const result = minesEngine.startGame(userId, betAmount, mineCount, clientSeed);
        callback(result);
      });

      socket.on('mines:reveal', (data: any, callback: Function) => {
        const { gameId, tileIndex } = data || {};
        const result = minesEngine.revealTile(gameId, tileIndex);
        callback(result);
      });

      socket.on('mines:cashout', (data: any, callback: Function) => {
        const { gameId } = data || {};
        const result = minesEngine.cashOut(gameId);
        callback(result);
      });

      socket.on('mines:get-active', (data: any, callback: Function) => {
        const { userId } = data || {};
        const state = minesEngine.getActiveGame(userId);
        callback({ state });
      });
    }

    // ========== GOALS ==========
    if (goalsEngine) {
      socket.on('goals:start', (data: any, callback: Function) => {
        try {
          const { userId, betAmount, fieldSize, clientSeed } = data || {};
          if (!userId) return callback({ success: false, message: 'Chưa đăng nhập' });
          const state = goalsEngine.startGame(userId, betAmount, fieldSize, clientSeed);
          callback({ success: true, state });
        } catch (err: any) {
          callback({ success: false, message: err.message });
        }
      });

      socket.on('goals:select-row', (data: any, callback: Function) => {
        try {
          const { gameId, rowIndex } = data || {};
          const state = goalsEngine.selectRow(gameId, rowIndex);
          callback({ success: true, state });
        } catch (err: any) {
          callback({ success: false, message: err.message });
        }
      });

      socket.on('goals:cashout', (data: any, callback: Function) => {
        try {
          const { gameId } = data || {};
          const state = goalsEngine.cashOut(gameId);
          const payout = state.currentPayout;
          callback({ success: true, state, payout });
        } catch (err: any) {
          callback({ success: false, message: err.message });
        }
      });

      socket.on('goals:get-active', (data: any, callback: Function) => {
        const { userId } = data || {};
        const state = goalsEngine.getActiveGame(userId);
        callback({ state });
      });
    }
    // ========== CASINO (Roulette, Aviator, Chicken, Hi-Lo, Coinflip, RPS) ==========
    if (casinoEngine) {
      const needLogin = (data: any, callback: Function) => {
        if (!data?.userId) {
          callback({ success: false, message: 'Chưa đăng nhập' });
          return null;
        }
        return data.userId as string;
      };

      socket.on('casino:roulette:bet', (data: any, callback: Function) => {
        const userId = needLogin(data, callback);
        if (!userId) return;
        callback(casinoEngine.rouletteBet(userId, data?.betType, data?.number, Number(data?.amount)));
      });

      socket.on('casino:coinflip:bet', (data: any, callback: Function) => {
        const userId = needLogin(data, callback);
        if (!userId) return;
        callback(casinoEngine.coinflipBet(userId, data?.choice, Number(data?.amount)));
      });

      socket.on('casino:rps:bet', (data: any, callback: Function) => {
        const userId = needLogin(data, callback);
        if (!userId) return;
        callback(casinoEngine.rpsBet(userId, data?.choice, Number(data?.amount)));
      });

      socket.on('casino:chicken:start', (data: any, callback: Function) => {
        const userId = needLogin(data, callback);
        if (!userId) return;
        callback(casinoEngine.chickenStart(userId, Number(data?.amount), data?.difficulty));
      });

      socket.on('casino:chicken:advance', (data: any, callback: Function) => {
        const userId = needLogin(data, callback);
        if (!userId) return;
        callback(casinoEngine.chickenAdvance(userId));
      });

      socket.on('casino:chicken:cashout', (data: any, callback: Function) => {
        const userId = needLogin(data, callback);
        if (!userId) return;
        callback(casinoEngine.chickenCashout(userId));
      });

      socket.on('casino:hilo:start', (data: any, callback: Function) => {
        const userId = needLogin(data, callback);
        if (!userId) return;
        callback(casinoEngine.hiloStart(userId, Number(data?.amount)));
      });

      socket.on('casino:hilo:pick', (data: any, callback: Function) => {
        const userId = needLogin(data, callback);
        if (!userId) return;
        callback(casinoEngine.hiloPick(userId, data?.choice));
      });

      socket.on('casino:hilo:cashout', (data: any, callback: Function) => {
        const userId = needLogin(data, callback);
        if (!userId) return;
        callback(casinoEngine.hiloCashout(userId));
      });

      socket.on('aviator:join', () => {
        socket.join('aviator-room');
        socket.emit('aviator:state', casinoEngine.aviatorPublic());
      });

      socket.on('aviator:leave', () => {
        socket.leave('aviator-room');
      });

      socket.on('aviator:bet', (data: any, callback: Function) => {
        const { userId, displayName, amount } = data || {};
        if (!userId) return callback({ success: false, message: 'Chưa đăng nhập' });
        callback(casinoEngine.aviatorBet(userId, displayName || 'Player', Number(amount)));
      });

      socket.on('aviator:cashout', (data: any, callback: Function) => {
        const { userId } = data || {};
        if (!userId) return callback({ success: false, message: 'Chưa đăng nhập' });
        callback(casinoEngine.aviatorCashout(userId));
      });
    }
  });
}
