import { Server, Socket } from 'socket.io';
import { UserManager } from '../auth/UserManager';
import { Room, RoomManager, sanitizeRoomBet, MIN_ROOM_BET, MAX_ROOM_BET } from '../rooms/RoomManager';
import { WorkManager } from '../engines/work/WorkManager';
import { TaiXiuEngine } from '../engines/tai-xiu/TaiXiuEngine';
import { MinesEngine } from '../engines/mines/MinesEngine';
import { GoalsEngine } from '../engines/goals/GoalsEngine';
import { CasinoEngine } from '../engines/casino/CasinoEngine';
import { CaseEngine } from '../engines/cases/CaseEngine';
import { UpgradeEngine } from '../engines/upgrade/UpgradeEngine';
import { BattleEngine } from '../engines/cases/BattleEngine';
import { SlotsManager } from '../engines/slots/SlotsManager';
import { GiftcodeManager } from '../auth/GiftcodeManager';

export function registerSocketHandlers(
  io: Server,
  roomManager: RoomManager,
  userManager: UserManager,
  workManager?: WorkManager,
  taiXiuEngine?: TaiXiuEngine,
  minesEngine?: MinesEngine,
  goalsEngine?: GoalsEngine,
  casinoEngine?: CasinoEngine,
  caseEngine?: CaseEngine,
  upgradeEngine?: UpgradeEngine,
  battleEngine?: BattleEngine,
  slotsManager?: SlotsManager,
  giftcodeManager?: GiftcodeManager
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
    connected: p.connected,
    hasPaidBet: p.hasPaidBet
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
      // Kiểm tra và trừ tiền chủ phòng ngay khi tạo phòng (nếu là user đã đăng nhập)
      if (userId && bet > 0) {
        const bal = userManager.getBalance(userId);
        if (bal < bet) {
          if (typeof callback === 'function') {
            callback({ success: false, message: `Không đủ tiền tạo phòng ${bet} 🪙 (đang có ${bal} 🪙). Hãy đi làm kiếm thêm!` });
          }
          return;
        }
        const deductRes = userManager.deductBalance(userId, bet, `Tạo phòng cược ${bet} 🪙`);
        if (!deductRes.success) {
          if (typeof callback === 'function') {
            callback({ success: false, message: deductRes.message || 'Không thể trừ tiền tạo phòng.' });
          }
          return;
        }
      }

      const room = roomManager.createRoom(sessionId, playerName, avatar, socket.id, userId, bet);
      if (userId && bet > 0) {
        if (!room.paidUsers) room.paidUsers = {};
        room.paidUsers[userId] = bet;
        if (room.players[0]) {
          room.players[0].hasPaidBet = true;
        }
        socket.emit('balance_updated', { balance: userManager.getBalance(userId) });
      }

      socket.join(room.id);

      if (typeof callback === 'function') {
        callback({ success: true, room: formatRoomDTO(room), player: formatPlayerDTO(room.players[0]) });
      }
      broadcastRoomState(room);
    });

    // Handle Join Room (trừ tiền cược ngay khi tham gia)
    socket.on('join_room', (data, callback) => {
      const { roomId, sessionId, playerName, avatar, userId } = data;
      const targetRoom = roomManager.getRoom(roomId);
      if (!targetRoom) {
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Không tìm thấy phòng chơi.' });
        }
        return;
      }

      const existing = targetRoom.players.find(p => p.sessionId === sessionId);
      const betAmount = Math.floor(Number(targetRoom.settings?.betAmount || 0));

      // Nếu là người chơi mới tham gia (không phải reconnect), kiểm tra số dư trước
      if (!existing && userId && betAmount > 0) {
        const bal = userManager.getBalance(userId);
        if (bal < betAmount) {
          if (typeof callback === 'function') {
            callback({ success: false, message: `Không đủ tiền vào phòng! Cần ${betAmount} 🪙 (bạn đang có ${bal} 🪙). Hãy làm việc kiếm thêm!` });
          }
          return;
        }
      }

      const res = roomManager.joinRoom(roomId, sessionId, playerName, avatar, socket.id, userId);

      if (res.success && res.room && res.player) {
        // Trừ tiền người mới vào phòng
        if (!existing && userId && betAmount > 0) {
          const deductRes = userManager.deductBalance(userId, betAmount, `Cược vào phòng ${res.room.id}`);
          if (!deductRes.success) {
            roomManager.leaveRoom(res.room.id, res.player.id);
            if (typeof callback === 'function') {
              callback({ success: false, message: deductRes.message || 'Không thể trừ tiền cược vào phòng.' });
            }
            return;
          }
          if (!res.room.paidUsers) res.room.paidUsers = {};
          res.room.paidUsers[userId] = betAmount;
          res.player.hasPaidBet = true;
          socket.emit('balance_updated', { balance: userManager.getBalance(userId) });
        } else if (existing && userId && res.room.paidUsers?.[userId]) {
          res.player.hasPaidBet = true;
        }

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
        if (userId && room.paidUsers?.[userId]) {
          player.hasPaidBet = true;
        }
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

    // Handle Remove Bot / Kick Player (hoàn tiền nếu đã trừ cược trước game)
    socket.on('remove_bot', (data, callback) => {
      const { roomId, requesterId, targetPlayerId } = data;
      const roomBefore = roomManager.getRoom(roomId);
      const targetPlayer = roomBefore?.players.find(p => p.id === targetPlayerId);
      const wasInGame = roomBefore?.inGame;

      const res = roomManager.removeBotOrKick(roomId, requesterId, targetPlayerId);

      // Nếu bị kick trước khi game bắt đầu và đã nộp cược -> hoàn tiền cho người bị kick
      if (res.success && !wasInGame && targetPlayer?.userId && roomBefore?.paidUsers?.[targetPlayer.userId]) {
        const refundAmt = roomBefore.paidUsers[targetPlayer.userId];
        delete roomBefore.paidUsers[targetPlayer.userId];
        userManager.addBalance(targetPlayer.userId, refundAmt, `Hoàn tiền bị kick khỏi phòng ${roomId}`);
        if (targetPlayer.socketId) {
          io.to(targetPlayer.socketId).emit('balance_updated', { balance: userManager.getBalance(targetPlayer.userId) });
        }
      }

      const room = roomManager.getRoom(roomId);
      if (room) broadcastRoomState(room);
      if (typeof callback === 'function') callback(res);
    });

    // Handle Update Settings
    socket.on('update_settings', (data, callback) => {
      const { roomId, requesterId, settings } = data;
      const room = roomManager.getRoom(roomId);
      if (room && settings?.betAmount !== undefined) {
        const newBet = Math.floor(Number(settings.betAmount));
        if (room.players.length > 1 && newBet !== room.settings.betAmount) {
          if (typeof callback === 'function') {
            callback({ success: false, message: 'Không thể đổi mức cược khi đã có người chơi khác trong phòng.' });
          }
          return;
        }
        // Nếu chủ phòng ở một mình, điều chỉnh số dư theo chênh lệch
        if (room.players.length === 1 && newBet !== room.settings.betAmount && room.players[0].userId) {
          const hostUid = room.players[0].userId;
          const oldPaid = room.paidUsers?.[hostUid] || 0;
          const diff = newBet - oldPaid;
          if (diff > 0) {
            const hostBal = userManager.getBalance(hostUid);
            if (hostBal < diff) {
              if (typeof callback === 'function') {
                callback({ success: false, message: `Không đủ tiền tăng cược thêm ${diff} 🪙 (đang có ${hostBal} 🪙).` });
              }
              return;
            }
            userManager.deductBalance(hostUid, diff, `Tăng mức cược phòng ${roomId}`);
          } else if (diff < 0) {
            userManager.addBalance(hostUid, Math.abs(diff), `Giảm mức cược phòng ${roomId}`);
          }
          if (!room.paidUsers) room.paidUsers = {};
          room.paidUsers[hostUid] = newBet;
          socket.emit('balance_updated', { balance: userManager.getBalance(hostUid) });
        }
      }

      const res = roomManager.updateSettings(roomId, requesterId, settings);
      const updatedRoom = roomManager.getRoom(roomId);
      if (updatedRoom) broadcastRoomState(updatedRoom);
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

    // Handle Start Game (trả thưởng x15 - x30 lần cược cho người thắng)
    socket.on('start_game', (data, callback) => {
      const { roomId, requesterId } = data;
      const roomBefore = roomManager.getRoom(roomId);
      if (!roomBefore) {
        if (typeof callback === 'function') callback({ success: false, message: 'Phòng không tồn tại.' });
        return;
      }
      const betAmount = Math.floor(Number(roomBefore.settings?.betAmount || 0));

      // Đảm bảo tất cả người chơi thật (đã đăng nhập) đều đã trừ tiền cược trước khi trận bắt đầu
      if (betAmount > 0) {
        if (!roomBefore.paidUsers) roomBefore.paidUsers = {};
        const unpaidHumans = roomBefore.players.filter(p => !p.isBot && p.userId && !roomBefore.paidUsers?.[p.userId]);

        for (const p of unpaidHumans) {
          const bal = userManager.getBalance(p.userId!);
          if (bal < betAmount) {
            if (typeof callback === 'function') {
              callback({ success: false, message: `Người chơi ${p.name} không đủ tiền cược: cần ${betAmount} 🪙 (đang có ${bal} 🪙).` });
            }
            return;
          }
        }

        for (const p of unpaidHumans) {
          const r = userManager.deductBalance(p.userId!, betAmount, `Room bet ${roomId} (${roomBefore.settings.gameType})`);
          if (r.success) {
            roomBefore.paidUsers[p.userId!] = betAmount;
            p.hasPaidBet = true;
            if (p.socketId) io.to(p.socketId).emit('balance_updated', { balance: userManager.getBalance(p.userId!) });
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
            const winnerPlayers = r.players.filter(p => winners.includes(p.id));
            const winnerUserIds = winnerPlayers.filter(p => p.userId).map(p => p.userId!);
            userManager.recordGameResult(r.settings.gameType, participantUserIds, winnerUserIds);

            const potBet = Math.floor(Number(r.settings?.betAmount || 0));
            if (potBet > 0 && winnerUserIds.length > 0) {
              // Tiền thắng từ tạo phòng gấp 15-30 lần mức cược
              const multiplier = 15 + Math.floor(Math.random() * 16); // 15 đến 30
              const totalPrize = potBet * multiplier;
              const perWinner = Math.floor(totalPrize / winnerUserIds.length);

              for (const uid of winnerUserIds) {
                userManager.addBalance(uid, perWinner, `Thắng phòng ${r.id} (${r.settings.gameType}) x${multiplier} cược`);
                const winP = r.players.find(p => p.userId === uid);
                if (winP?.socketId) {
                  io.to(winP.socketId).emit('balance_updated', { balance: userManager.getBalance(uid) });
                }
              }

              const winnerNames = winnerPlayers.map(p => p.name).join(', ');
              roomManager.addChatMessage(
                r.id,
                'System',
                `🏆 CHIẾN THẮNG VANG DỘI! ${winnerNames} đã thắng và nhận thưởng gấp ${multiplier} LẦN cược (+${perWinner.toLocaleString()} 🪙)! 🎉`,
                true
              );
            } else if (winnerPlayers.length > 0) {
              const winnerNames = winnerPlayers.map(p => p.name).join(', ');
              roomManager.addChatMessage(
                r.id,
                'System',
                `🏆 Trận đấu kết thúc! Người chiến thắng: ${winnerNames}.`,
                true
              );
            }

            io.emit('leaderboard_updated', userManager.getLeaderboard('all'));
          }

          // Reset trạng thái thanh toán cược cho ván chơi tiếp theo
          r.paidUsers = {};
          for (const p of r.players) {
            p.hasPaidBet = false;
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
      if (room) {
        room.paidUsers = {};
        for (const p of room.players) {
          p.hasPaidBet = false;
        }
        broadcastRoomState(room);
      }
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

    // Handle Leave Room (hoàn trả tiền nếu rời trước khi trận bắt đầu)
    socket.on('leave_room', (data, callback) => {
      const { roomId, playerId } = data;
      const roomBefore = roomManager.getRoom(roomId);
      const playerObj = roomBefore?.players.find(p => p.id === playerId);
      const wasInGame = roomBefore?.inGame;

      const res = roomManager.leaveRoom(roomId, playerId);
      socket.leave(roomId);

      // Nếu rời phòng trước khi bắt đầu trận và đã trừ tiền cược -> hoàn trả tiền
      if (!wasInGame && playerObj?.userId && roomBefore?.paidUsers?.[playerObj.userId]) {
        const refundAmt = roomBefore.paidUsers[playerObj.userId];
        delete roomBefore.paidUsers[playerObj.userId];
        userManager.addBalance(playerObj.userId, refundAmt, `Hoàn tiền rời phòng ${roomId}`);
        socket.emit('balance_updated', { balance: userManager.getBalance(playerObj.userId) });
      }

      // Nếu phòng bị giải tán (res.roomDeleted), hoàn tiền cho tất cả người chơi còn lại đã nộp tiền
      if (res.roomDeleted && roomBefore?.paidUsers) {
        for (const [uid, amt] of Object.entries(roomBefore.paidUsers)) {
          if (amt > 0) {
            userManager.addBalance(uid, amt, `Hoàn tiền giải tán phòng ${roomId}`);
            const uPlayer = roomBefore.players.find(p => p.userId === uid);
            if (uPlayer?.socketId) {
              io.to(uPlayer.socketId).emit('balance_updated', { balance: userManager.getBalance(uid) });
            }
          }
        }
        roomBefore.paidUsers = {};
      }

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

    // ========== CS2 CASE OPENING ==========
    if (caseEngine) {
      socket.on('cases:get', (_data: any, callback: Function) => {
        if (typeof callback === 'function') {
          callback({ success: true, cases: caseEngine.getCases() });
        }
      });

      socket.on('cases:open', (data: any, callback: Function) => {
        const { userId, caseId } = data || {};
        if (!userId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Chưa đăng nhập.' });
          return;
        }
        const result = caseEngine.openCase(userId, caseId);
        if (result.success && result.newBalance !== undefined) {
          socket.emit('balance_updated', { balance: result.newBalance });
        }
        if (typeof callback === 'function') {
          callback(result);
        }
      });
    }

    // ========== INVENTORY SYSTEM ==========
    socket.on('inventory:get', (data: any, callback: Function) => {
      const { userId } = data || {};
      if (!userId) {
        if (typeof callback === 'function') callback({ success: false, message: 'Chưa đăng nhập.' });
        return;
      }
      const inventory = userManager.getInventory(userId);
      if (typeof callback === 'function') {
        callback({ success: true, inventory });
      }
    });

    socket.on('inventory:sell', (data: any, callback: Function) => {
      const { userId, itemId } = data || {};
      if (!userId || !itemId) {
        if (typeof callback === 'function') callback({ success: false, message: 'Thiếu thông tin người chơi hoặc vật phẩm.' });
        return;
      }
      const res = userManager.sellItem(userId, itemId);
      if (res.success && res.newBalance !== undefined) {
        socket.emit('balance_updated', { balance: res.newBalance });
      }
      if (typeof callback === 'function') {
        callback(res);
      }
    });

    socket.on('inventory:sell-all', (data: any, callback: Function) => {
      const { userId } = data || {};
      if (!userId) {
        if (typeof callback === 'function') callback({ success: false, message: 'Chưa đăng nhập.' });
        return;
      }
      const res = userManager.sellAllItems(userId);
      if (res.success && res.newBalance !== undefined) {
        socket.emit('balance_updated', { balance: res.newBalance });
      }
      if (typeof callback === 'function') {
        callback(res);
      }
    });

    // ========== SKINCLUB UPGRADE ==========
    if (upgradeEngine) {
      socket.on('upgrade:play', (data: any, callback: Function) => {
        const { userId, betType, betAmount, itemInstanceId, targetValue, rollDirection } = data || {};
        if (!userId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Chưa đăng nhập.' });
          return;
        }
        const result = upgradeEngine.playUpgrade({
          userId,
          betType,
          betAmount,
          itemInstanceId,
          targetValue,
          rollDirection
        });
        if (result.success && result.newBalance !== undefined) {
          socket.emit('balance_updated', { balance: result.newBalance });
        }
        if (typeof callback === 'function') {
          callback(result);
        }
      });
    }

    // ========== CS2 CASE BATTLES ==========
    if (battleEngine) {
      socket.on('battle:list', (_data: any, callback: Function) => {
        if (typeof callback === 'function') {
          callback({ success: true, battles: battleEngine.listBattles() });
        }
      });

      socket.on('battle:get', (data: any, callback: Function) => {
        const { battleId } = data || {};
        const battle = battleEngine.getBattle(battleId);
        if (typeof callback === 'function') {
          callback({ success: Boolean(battle), battle });
        }
      });

      socket.on('battle:subscribe', (data: any) => {
        const { battleId } = data || {};
        if (battleId) {
          socket.join(`battle:${battleId}`);
        }
      });

      socket.on('battle:unsubscribe', (data: any) => {
        const { battleId } = data || {};
        if (battleId) {
          socket.leave(`battle:${battleId}`);
        }
      });

      socket.on('battle:create', (data: any, callback: Function) => {
        const { creatorId, caseIds, maxPlayers, mode } = data || {};
        if (!creatorId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Chưa đăng nhập.' });
          return;
        }
        const res = battleEngine.createBattle(creatorId, caseIds, maxPlayers, mode);
        if (res.success && res.battle) {
          socket.join(`battle:${res.battle.id}`);
          const newBalance = userManager.getBalance(creatorId);
          socket.emit('balance_updated', { balance: newBalance });
        }
        if (typeof callback === 'function') {
          callback(res);
        }
      });

      socket.on('battle:join', (data: any, callback: Function) => {
        const { battleId, userId } = data || {};
        if (!userId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Chưa đăng nhập.' });
          return;
        }
        const res = battleEngine.joinBattle(battleId, userId);
        if (res.success && res.battle) {
          socket.join(`battle:${battleId}`);
          const newBalance = userManager.getBalance(userId);
          socket.emit('balance_updated', { balance: newBalance });
        }
        if (typeof callback === 'function') {
          callback(res);
        }
      });

      socket.on('battle:add-bot', (data: any, callback: Function) => {
        const { battleId, requesterId } = data || {};
        const res = battleEngine.addBot(battleId, requesterId);
        if (typeof callback === 'function') {
          callback(res);
        }
      });

      socket.on('battle:cancel', (data: any, callback: Function) => {
        const { battleId, requesterId } = data || {};
        const res = battleEngine.cancelBattle(battleId, requesterId);
        if (res.success) {
          const newBalance = userManager.getBalance(requesterId);
          socket.emit('balance_updated', { balance: newBalance });
        }
        if (typeof callback === 'function') {
          callback(res);
        }
      });
    }

    // Slots handlers
    if (slotsManager) {
      socket.on('slots:list', (callback: Function) => {
        if (typeof callback === 'function') {
          callback({ success: true, games: slotsManager.getGames() });
        }
      });

      socket.on('slots:free-spins', (data: any, callback: Function) => {
        const { slotId, userId } = data || {};
        if (!userId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Chưa đăng nhập.' });
          return;
        }
        const freeSpins = slotsManager.getFreeSpins(slotId || 'wild-bounty-showdown', userId);
        if (typeof callback === 'function') {
          callback({ success: true, freeSpins });
        }
      });

      socket.on('slots:spin', (data: any, callback: Function) => {
        const { slotId, userId, betAmount, buyFeature } = data || {};
        if (!userId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Vui lòng đăng nhập để chơi.' });
          return;
        }
        const bet = Math.max(1, Math.floor(Number(betAmount) || 10));
        const res = slotsManager.spin(userId, slotId || 'wild-bounty-showdown', bet, { buyFeature: !!buyFeature });
        if (res.success && res.result) {
          socket.emit('balance_updated', { balance: res.result.newBalance });
        }
        if (typeof callback === 'function') {
          callback(res);
        }
      });

      socket.on('slots:offer-get', (data: any, callback: Function) => {
        const { slotId, userId } = data || {};
        if (!userId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Chưa đăng nhập.' });
          return;
        }
        const offer = slotsManager.getOffer(slotId || 'caishen-wins', userId);
        if (typeof callback === 'function') {
          callback({ success: true, offer });
        }
      });

      socket.on('slots:mults', (data: any, callback: Function) => {
        const { slotId, userId } = data || {};
        if (!userId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Chưa đăng nhập.' });
          return;
        }
        const mults = slotsManager.getMults(slotId || 'cocktail-nights', userId);
        if (typeof callback === 'function') {
          callback({ success: true, mults });
        }
      });

      socket.on('slots:offer-resolve', (data: any, callback: Function) => {
        const { slotId, userId, action } = data || {};
        if (!userId) {
          if (typeof callback === 'function') callback({ success: false, message: 'Vui lòng đăng nhập để chơi.' });
          return;
        }
        if (action !== 'accept' && action !== 'gamble-spins' && action !== 'gamble-mult') {
          if (typeof callback === 'function') callback({ success: false, message: 'Hành động không hợp lệ.' });
          return;
        }
        const res = slotsManager.resolveOffer(slotId || 'caishen-wins', userId, action);
        if (typeof callback === 'function') {
          callback(res);
        }
      });
    }

    // User subscription for real-time notifications (e.g. money transfer received)
    socket.on('user:subscribe', (data: any) => {
      const { userId } = data || {};
      if (userId) {
        socket.join(`user:${userId}`);
      }
    });

    // Wallet: Transfer coins between users
    socket.on('wallet:transfer', (data: any, callback: Function) => {
      const { senderId, recipientQuery, amount, note } = data || {};
      const result = userManager.transferBalance(senderId, recipientQuery, amount, note);
      if (result.success && result.transaction && result.recipientUser) {
        // Update sender balance on current socket
        socket.emit('balance_updated', { balance: result.senderNewBalance });

        // Update recipient balance & push real-time received notification if online
        io.to(`user:${result.recipientUser.id}`).emit('balance_updated', {
          balance: result.recipientNewBalance
        });
        io.to(`user:${result.recipientUser.id}`).emit('wallet:received', {
          senderName: result.transaction.senderDisplayName,
          senderUsername: result.transaction.senderUsername,
          amount: result.transaction.amount,
          note: result.transaction.note,
          newBalance: result.recipientNewBalance,
          timestamp: result.transaction.timestamp
        });
      }
      if (typeof callback === 'function') {
        callback(result);
      }
    });

    // Wallet: Get user transfer history
    socket.on('wallet:get-history', (data: any, callback: Function) => {
      const { userId } = data || {};
      if (!userId) {
        if (typeof callback === 'function') callback({ success: false, message: 'Thiếu userId.' });
        return;
      }
      const transactions = userManager.getUserTransactions(userId);
      if (typeof callback === 'function') {
        callback({ success: true, transactions });
      }
    });

    // Wallet: Search players by username or display name
    socket.on('wallet:search-users', (data: any, callback: Function) => {
      const { query, excludeUserId } = data || {};
      const users = userManager.searchUsers(query || '', excludeUserId);
      if (typeof callback === 'function') {
        callback({ success: true, users });
      }
    });

    // Giftcode: Redeem giftcode (e.g. dinhvantrinh)
    socket.on('giftcode:redeem', (data: any, callback: Function) => {
      const { userId, code } = data || {};
      if (!giftcodeManager) {
        if (typeof callback === 'function') callback({ success: false, message: 'Hệ thống Giftcode đang bảo trì.' });
        return;
      }
      const result = giftcodeManager.redeem(userId, code);
      if (result.success && result.newBalance !== undefined) {
        socket.emit('balance_updated', { balance: result.newBalance });
      }
      if (typeof callback === 'function') {
        callback(result);
      }
    });
  });
}
