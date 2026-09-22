import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface UserStats {
  unoWins: number;
  explodingKittensWins: number;
  tienLenWins: number;
  totalWins: number;
  totalGames: number;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  avatar: string;
  createdAt: number;
  stats: UserStats;
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  stats: UserStats;
}

export class UserManager {
  private dataFilePath: string;
  private users: Map<string, User> = new Map(); // id -> User
  private usernameIndex: Map<string, string> = new Map(); // lowercase username -> id
  private tokenToUserIdMap: Map<string, string> = new Map(); // token -> id

  constructor(customPath?: string) {
    this.dataFilePath = customPath || path.resolve(__dirname, '../../../data/users.json');
    this.ensureDataDir();
    this.loadUsers();
  }

  private ensureDataDir() {
    const dir = path.dirname(this.dataFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadUsers() {
    if (!fs.existsSync(this.dataFilePath)) {
      this.seedInitialUsers();
      this.saveUsers();
      return;
    }

    try {
      const raw = fs.readFileSync(this.dataFilePath, 'utf-8');
      const data: User[] = JSON.parse(raw);
      this.users.clear();
      this.usernameIndex.clear();
      for (const u of data) {
        this.users.set(u.id, u);
        this.usernameIndex.set(u.username.toLowerCase(), u.id);
      }
    } catch (err) {
      console.error('[UserManager] Error loading users:', err);
      this.seedInitialUsers();
    }
  }

  private saveUsers() {
    try {
      this.ensureDataDir();
      const list = Array.from(this.users.values());
      fs.writeFileSync(this.dataFilePath, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('[UserManager] Error saving users:', err);
    }
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
  }

  private seedInitialUsers() {
    // Initial seeded champions for an engaging leaderboard
    const seeds: Array<Omit<User, 'id' | 'passwordHash' | 'salt'> & { password: string }> = [
      {
        username: 'pro_card_master',
        displayName: '🃏 Hoàng Thần Bài',
        password: 'password123',
        avatar: 'av-dragon',
        createdAt: Date.now() - 86400000 * 5,
        stats: {
          unoWins: 18,
          explodingKittensWins: 14,
          tienLenWins: 22,
          totalWins: 54,
          totalGames: 68
        }
      },
      {
        username: 'kitten_bomb_expert',
        displayName: '💣 Mèo Nổ Sát Thủ',
        password: 'password123',
        avatar: 'av-cat',
        createdAt: Date.now() - 86400000 * 4,
        stats: {
          unoWins: 12,
          explodingKittensWins: 25,
          tienLenWins: 9,
          totalWins: 46,
          totalGames: 59
        }
      },
      {
        username: 'tien_len_de_nhat',
        displayName: '♠️ Tiến Lên Đệ Nhất',
        password: 'password123',
        avatar: 'av-ninja',
        createdAt: Date.now() - 86400000 * 3,
        stats: {
          unoWins: 8,
          explodingKittensWins: 11,
          tienLenWins: 24,
          totalWins: 43,
          totalGames: 52
        }
      },
      {
        username: 'uno_queen',
        displayName: '👑 Nữ Hoàng UNO',
        password: 'password123',
        avatar: 'av-fox',
        createdAt: Date.now() - 86400000 * 2,
        stats: {
          unoWins: 26,
          explodingKittensWins: 6,
          tienLenWins: 7,
          totalWins: 39,
          totalGames: 50
        }
      }
    ];

    for (const s of seeds) {
      const salt = crypto.randomBytes(16).toString('hex');
      const user: User = {
        id: crypto.randomUUID(),
        username: s.username,
        displayName: s.displayName,
        passwordHash: this.hashPassword(s.password, salt),
        salt,
        avatar: s.avatar,
        createdAt: s.createdAt,
        stats: s.stats
      };
      this.users.set(user.id, user);
      this.usernameIndex.set(user.username.toLowerCase(), user.id);
    }
  }

  public register(
    username: string,
    password: string,
    displayName?: string,
    avatar?: string
  ): { success: boolean; user?: PublicUser; token?: string; message?: string } {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, message: 'Tên đăng nhập phải có ít nhất 3 ký tự.' };
    }
    if (!password || password.length < 4) {
      return { success: false, message: 'Mật khẩu phải có ít nhất 4 ký tự.' };
    }
    if (this.usernameIndex.has(cleanUsername)) {
      return { success: false, message: 'Tên đăng nhập đã được sử dụng.' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);
    const id = crypto.randomUUID();

    const newUser: User = {
      id,
      username: cleanUsername,
      displayName: displayName?.trim() || username.trim(),
      passwordHash,
      salt,
      avatar: avatar || 'av-fox',
      createdAt: Date.now(),
      stats: {
        unoWins: 0,
        explodingKittensWins: 0,
        tienLenWins: 0,
        totalWins: 0,
        totalGames: 0
      }
    };

    this.users.set(id, newUser);
    this.usernameIndex.set(cleanUsername, id);
    this.saveUsers();

    const token = this.generateToken(id);
    return {
      success: true,
      user: this.toPublicUser(newUser),
      token
    };
  }

  public login(
    username: string,
    password: string
  ): { success: boolean; user?: PublicUser; token?: string; message?: string } {
    const cleanUsername = username.trim().toLowerCase();
    const userId = this.usernameIndex.get(cleanUsername);
    if (!userId) {
      return { success: false, message: 'Tài khoản không tồn tại.' };
    }

    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'Tài khoản không tồn tại.' };
    }

    const hash = this.hashPassword(password, user.salt);
    if (hash !== user.passwordHash) {
      return { success: false, message: 'Mật khẩu không chính xác.' };
    }

    const token = this.generateToken(user.id);
    return {
      success: true,
      user: this.toPublicUser(user),
      token
    };
  }

  public getUserByToken(token: string): PublicUser | null {
    const userId = this.tokenToUserIdMap.get(token);
    if (!userId) return null;
    const user = this.users.get(userId);
    return user ? this.toPublicUser(user) : null;
  }

  public getUserById(id: string): PublicUser | null {
    const user = this.users.get(id);
    return user ? this.toPublicUser(user) : null;
  }

  public recordGameResult(
    gameType: 'uno' | 'exploding-kittens' | 'tien-len',
    participantUserIds: string[],
    winnerUserIds: string[]
  ) {
    let modified = false;

    // Increment total games for all participating registered players
    for (const uid of participantUserIds) {
      const user = this.users.get(uid);
      if (user) {
        user.stats.totalGames += 1;
        modified = true;
      }
    }

    // Increment win count for winners
    for (const wid of winnerUserIds) {
      const user = this.users.get(wid);
      if (user) {
        user.stats.totalWins += 1;
        if (gameType === 'uno') {
          user.stats.unoWins += 1;
        } else if (gameType === 'exploding-kittens') {
          user.stats.explodingKittensWins += 1;
        } else if (gameType === 'tien-len') {
          user.stats.tienLenWins += 1;
        }
        modified = true;
      }
    }

    if (modified) {
      this.saveUsers();
    }
  }

  public getLeaderboard(gameType: 'all' | 'uno' | 'exploding-kittens' | 'tien-len' = 'all'): PublicUser[] {
    const list = Array.from(this.users.values()).map(u => this.toPublicUser(u));

    if (gameType === 'uno') {
      list.sort((a, b) => b.stats.unoWins - a.stats.unoWins || b.stats.totalWins - a.stats.totalWins);
    } else if (gameType === 'exploding-kittens') {
      list.sort((a, b) => b.stats.explodingKittensWins - a.stats.explodingKittensWins || b.stats.totalWins - a.stats.totalWins);
    } else if (gameType === 'tien-len') {
      list.sort((a, b) => b.stats.tienLenWins - a.stats.tienLenWins || b.stats.totalWins - a.stats.totalWins);
    } else {
      list.sort((a, b) => b.stats.totalWins - a.stats.totalWins || b.stats.totalGames - a.stats.totalGames);
    }

    return list.slice(0, 50);
  }

  private generateToken(userId: string): string {
    const token = 'tok_' + crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
    this.tokenToUserIdMap.set(token, userId);
    return token;
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      stats: { ...user.stats }
    };
  }
}
