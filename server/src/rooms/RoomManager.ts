import crypto from 'crypto';
import { BaseGame, GameType } from '../engines/BaseGame';
import { BotController } from '../engines/ai/BotController';
import { ExplodingKittensGame } from '../engines/exploding-kittens/ExplodingKittensGame';
import { TienLenGame } from '../engines/tien-len/TienLenGame';
import { UnoMode, UnoRules } from '../engines/uno/types';
import { UnoGame } from '../engines/uno/UnoGame';

export interface RoomPlayer {
  id: string;
  sessionId: string;
  userId?: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isBot: boolean;
  isReady: boolean;
  connected: boolean;
  socketId: string | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface RoomSettings {
  gameType: GameType;
  turnTimeLimit: number;
  unoMode: UnoMode;
  unoRules: UnoRules;
  tienLenFirstTurnRule: boolean;
  tienLenCutTwoRule: boolean;
  ekExpansions: {
    implodingKittens: boolean;
    streakingKittens: boolean;
    barkingKittens: boolean;
    timebombMode: boolean;
  };
}

export interface Room {
  id: string; // 6 uppercase alphanumeric chars
  hostId: string;
  players: RoomPlayer[];
  settings: RoomSettings;
  inGame: boolean;
  gameInstance: BaseGame | null;
  botController: BotController | null;
  chatMessages: ChatMessage[];
  createdAt: number;
}

const BOT_NAMES = [
  '🤖 ByteBot', '🐱 MeowTron', '🃏 JokerAI', '⚡ QuickSilver',
  '🔥 NeoStrike', '🎯 Bullseye', '🎲 LuckyBot', '🐉 DragonMind'
];

const BOT_AVATARS = [
  'bot-1', 'bot-2', 'bot-3', 'bot-4', 'cat-1', 'cat-2', 'ninja', 'wizard'
];

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private sessionToRoomMap: Map<string, string> = new Map();

  public createRoom(hostSessionId: string, hostName: string, hostAvatar: string, socketId: string, userId?: string): Room {
    const roomId = this.generateRoomCode();
    const hostId = crypto.randomUUID();

    const hostPlayer: RoomPlayer = {
      id: hostId,
      sessionId: hostSessionId,
      userId,
      name: hostName || 'Player 1',
      avatar: hostAvatar || 'avatar-1',
      isHost: true,
      isBot: false,
      isReady: true,
      connected: true,
      socketId
    };

    const room: Room = {
      id: roomId,
      hostId,
      players: [hostPlayer],
      settings: {
        gameType: 'uno',
        turnTimeLimit: 30,
        unoMode: 'classic',
        unoRules: {
          freeStacking: true,
          jumpIn: true,
          sevenZero: true,
          unoPenalty: true,
          mercyLimit: 25,
          drawToMatch: false
        },
        tienLenFirstTurnRule: true,
        tienLenCutTwoRule: true,
        ekExpansions: {
          implodingKittens: false,
          streakingKittens: false,
          barkingKittens: false,
          timebombMode: false
        }
      },
      inGame: false,
      gameInstance: null,
      botController: null,
      chatMessages: [
        {
          id: crypto.randomUUID(),
          senderId: 'system',
          senderName: 'System',
          text: `Room ${roomId} created. Welcome!`,
          timestamp: Date.now(),
          isSystem: true
        }
      ],
      createdAt: Date.now()
    };

    this.rooms.set(roomId, room);
    this.sessionToRoomMap.set(hostSessionId, roomId);

    return room;
  }

  public joinRoom(
    roomId: string,
    sessionId: string,
    playerName: string,
    avatar: string,
    socketId: string,
    userId?: string
  ): { success: boolean; room?: Room; player?: RoomPlayer; message?: string } {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) {
      return { success: false, message: 'Room not found.' };
    }

    // Check if player is reconnecting with existing sessionId
    const existing = room.players.find(p => p.sessionId === sessionId);
    if (existing) {
      existing.connected = true;
      existing.socketId = socketId;
      if (userId) existing.userId = userId;
      if (playerName) existing.name = playerName;
      if (avatar) existing.avatar = avatar;

      if (room.gameInstance) {
        room.gameInstance.handleReconnect(existing.id);
      }

      this.addChatMessage(room.id, 'System', `${existing.name} reconnected.`, true);
      return { success: true, room, player: existing };
    }

    // New player joining
    if (room.inGame) {
      return { success: false, message: 'Game in this room is already in progress.' };
    }

    const maxCapacities: Record<GameType, number> = {
      'uno': 8,
      'exploding-kittens': 5,
      'tien-len': 4
    };

    const maxAllowed = maxCapacities[room.settings.gameType];
    if (room.players.length >= maxAllowed) {
      return { success: false, message: `Room is full for ${room.settings.gameType.toUpperCase()} (max ${maxAllowed} players).` };
    }

    const newPlayer: RoomPlayer = {
      id: crypto.randomUUID(),
      sessionId,
      userId,
      name: playerName || `Player ${room.players.length + 1}`,
      avatar: avatar || `avatar-${(room.players.length % 6) + 1}`,
      isHost: false,
      isBot: false,
      isReady: false,
      connected: true,
      socketId
    };

    room.players.push(newPlayer);
    this.sessionToRoomMap.set(sessionId, room.id);
    this.addChatMessage(room.id, 'System', `${newPlayer.name} joined the room.`, true);

    return { success: true, room, player: newPlayer };
  }

  public addBot(roomId: string, requesterId: string): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: 'Room not found.' };
    if (room.hostId !== requesterId) return { success: false, message: 'Only the host can add bots.' };
    if (room.inGame) return { success: false, message: 'Cannot add bots while game is running.' };

    const maxCapacities: Record<GameType, number> = {
      'uno': 8,
      'exploding-kittens': 5,
      'tien-len': 4
    };

    const maxAllowed = maxCapacities[room.settings.gameType];
    if (room.players.length >= maxAllowed) {
      return { success: false, message: `Maximum player capacity (${maxAllowed}) reached.` };
    }

    const botNum = room.players.filter(p => p.isBot).length;
    const botName = BOT_NAMES[botNum % BOT_NAMES.length] || `Bot ${botNum + 1}`;
    const botAvatar = BOT_AVATARS[botNum % BOT_AVATARS.length] || 'bot-1';

    const botPlayer: RoomPlayer = {
      id: crypto.randomUUID(),
      sessionId: `bot-${crypto.randomUUID()}`,
      name: botName,
      avatar: botAvatar,
      isHost: false,
      isBot: true,
      isReady: true,
      connected: true,
      socketId: null
    };

    room.players.push(botPlayer);
    this.addChatMessage(room.id, 'System', `${botName} was added to the room.`, true);

    return { success: true };
  }

  public removeBotOrKick(roomId: string, requesterId: string, targetPlayerId: string): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: 'Room not found.' };
    if (room.hostId !== requesterId) return { success: false, message: 'Only host can kick players or bots.' };
    if (room.inGame) return { success: false, message: 'Cannot kick players during an active game.' };
    if (targetPlayerId === room.hostId) return { success: false, message: 'Host cannot kick themselves.' };

    const idx = room.players.findIndex(p => p.id === targetPlayerId);
    if (idx === -1) return { success: false, message: 'Player not found in room.' };

    const [removed] = room.players.splice(idx, 1);
    this.sessionToRoomMap.delete(removed.sessionId);
    this.addChatMessage(room.id, 'System', `${removed.name} was removed from the room.`, true);

    return { success: true };
  }

  public leaveRoom(roomId: string, playerId: string): { success: boolean; roomDeleted?: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: true, roomDeleted: true };

    const idx = room.players.findIndex(p => p.id === playerId);
    if (idx === -1) return { success: true };

    const [removedPlayer] = room.players.splice(idx, 1);
    this.sessionToRoomMap.delete(removedPlayer.sessionId);

    // If game was active, notify game engine of player leaving
    if (room.inGame && room.gameInstance) {
      room.gameInstance.handleDisconnect(playerId);
    }

    const remainingHumans = room.players.filter(p => !p.isBot);

    // If no human players left or room empty, clean up room and destroy bots
    if (remainingHumans.length === 0 || room.players.length === 0) {
      if (room.botController) {
        room.botController.destroy();
      }
      this.rooms.delete(room.id);
      return { success: true, roomDeleted: true };
    }

    // If host left, transfer host role to the next human player
    if (removedPlayer.isHost) {
      const nextHost = remainingHumans[0] || room.players[0];
      if (nextHost) {
        nextHost.isHost = true;
        room.hostId = nextHost.id;
        this.addChatMessage(room.id, 'System', `${nextHost.name} là chủ phòng mới.`, true);
      }
    }

    this.addChatMessage(room.id, 'System', `${removedPlayer.name} đã rời phòng.`, true);
    return { success: true, roomDeleted: false };
  }

  public updateSettings(roomId: string, requesterId: string, newSettings: Partial<RoomSettings>): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: 'Room not found.' };
    if (room.hostId !== requesterId) return { success: false, message: 'Only host can change room settings.' };
    if (room.inGame) return { success: false, message: 'Cannot change settings during a match.' };

    room.settings = {
      ...room.settings,
      ...newSettings,
      unoRules: {
        ...room.settings.unoRules,
        ...(newSettings.unoRules || {})
      }
    };

    // If game type changed, adjust uno mode or prune excess players if necessary
    this.addChatMessage(room.id, 'System', `Room settings updated for ${room.settings.gameType.toUpperCase()}.`, true);
    return { success: true };
  }

  public setPlayerReady(roomId: string, playerId: string, isReady: boolean): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: 'Room not found.' };

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, message: 'Player not in room.' };

    player.isReady = isReady;
    return { success: true };
  }

  public startGame(
    roomId: string,
    requesterId: string,
    callbacks: {
      onBroadcastState: (room: Room) => void;
      onPrivateMessage: (playerId: string, event: string, payload: any) => void;
      onGameOver: (room: Room, winners: string[]) => void;
    }
  ): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: 'Room not found.' };
    if (room.hostId !== requesterId) return { success: false, message: 'Only host can start the game.' };
    if (room.inGame) return { success: false, message: 'Game is already running.' };

    const count = room.players.length;
    if (count < 2) {
      return { success: false, message: 'Need at least 2 players (human or bots) to start!' };
    }

    const minMax: Record<GameType, { min: number; max: number }> = {
      'uno': { min: 2, max: 8 },
      'exploding-kittens': { min: 2, max: 5 },
      'tien-len': { min: 2, max: 4 }
    };

    const limits = minMax[room.settings.gameType];
    if (count < limits.min || count > limits.max) {
      return {
        success: false,
        message: `${room.settings.gameType.toUpperCase()} requires ${limits.min} to ${limits.max} players.`
      };
    }

    // Clean up any old bot controller
    if (room.botController) {
      room.botController.destroy();
      room.botController = null;
    }

    const enginePlayers = room.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isBot: p.isBot
    }));

    // Instantiate game engine
    let game: BaseGame;
    switch (room.settings.gameType) {
      case 'uno':
        game = new UnoGame(enginePlayers, {
          mode: room.settings.unoMode,
          rules: room.settings.unoRules,
          turnTimeLimit: room.settings.turnTimeLimit
        });
        break;

      case 'exploding-kittens':
        game = new ExplodingKittensGame(enginePlayers, room.settings.turnTimeLimit, room.settings.ekExpansions);
        break;

      case 'tien-len':
        game = new TienLenGame(enginePlayers, {
          turnTimeLimit: room.settings.turnTimeLimit,
          firstTurnRule: room.settings.tienLenFirstTurnRule,
          cutTwoOutOfTurnRule: room.settings.tienLenCutTwoRule
        });
        break;
    }

    room.gameInstance = game;
    room.inGame = true;

    // Create Bot Controller for AI players
    const botIds = room.players.filter(p => p.isBot).map(p => p.id);
    const botController = new BotController(game, botIds);
    room.botController = botController;

    // Attach callbacks
    game.setCallbacks({
      onStateChange: () => {
        callbacks.onBroadcastState(room);
        botController.notifyStateChange();
      },
      onPrivateMessage: (playerId, event, payload) => {
        callbacks.onPrivateMessage(playerId, event, payload);
      },
      onGameOver: (winners) => {
        callbacks.onGameOver(room, winners);
      }
    });

    game.start();
    botController.notifyStateChange();

    this.addChatMessage(room.id, 'System', `Game started! Good luck have fun!`, true);
    return { success: true };
  }

  public restartGame(roomId: string, requesterId: string): { success: boolean; message?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: 'Room not found.' };
    if (room.hostId !== requesterId) return { success: false, message: 'Only host can return to lobby / restart.' };

    if (room.gameInstance) {
      room.gameInstance.clearTurnTimer();
      room.gameInstance = null;
    }
    if (room.botController) {
      room.botController.destroy();
      room.botController = null;
    }

    room.inGame = false;
    for (const p of room.players) {
      p.isReady = p.isBot; // Bots are always ready
    }

    this.addChatMessage(room.id, 'System', `Returned to lobby.`, true);
    return { success: true };
  }

  public handleSocketDisconnect(socketId: string) {
    for (const room of this.rooms.values()) {
      const player = room.players.find(p => p.socketId === socketId);
      if (player) {
        player.connected = false;
        player.socketId = null;

        if (room.gameInstance) {
          room.gameInstance.handleDisconnect(player.id);
        }

        this.addChatMessage(room.id, 'System', `${player.name} disconnected.`, true);
        break;
      }
    }
  }

  public addChatMessage(roomId: string, senderName: string, text: string, isSystem: boolean = false, senderId: string = 'system') {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId,
      senderName,
      text,
      timestamp: Date.now(),
      isSystem
    };

    room.chatMessages.push(msg);
    if (room.chatMessages.length > 80) {
      room.chatMessages.shift();
    }
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  public getRoomBySession(sessionId: string): Room | undefined {
    const roomId = this.sessionToRoomMap.get(sessionId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars 0/O, 1/I
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(crypto.randomInt(0, chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }
}
