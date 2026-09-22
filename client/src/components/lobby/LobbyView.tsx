import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  Copy,
  Flame,
  Gamepad2,
  LogIn,
  LogOut,
  Play,
  Plus,
  Send,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
  UserPlus,
  Users
} from 'lucide-react';
import { EKExpansions, GameType, RoomPlayer, RoomSettings, RoomState, UnoMode } from '../../types/game';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { LeaderboardView } from '../leaderboard/LeaderboardView';

interface LobbyViewProps {
  room: RoomState | null;
  player: RoomPlayer | null;
  connected: boolean;
  onCreateRoom: (name: string, avatar: string, userId?: string) => void;
  onJoinRoom: (roomId: string, name: string, avatar: string, userId?: string) => void;
  onAddBot: () => void;
  onRemoveBot: (id: string) => void;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onSetReady: (ready: boolean) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onSendMessage: (text: string) => void;
  errorMsg: string | null;
}

const AVATARS = [
  { id: 'av-fox', emoji: '🦊', label: 'Cáo Thông Thái' },
  { id: 'av-cat', emoji: '🐱', label: 'Mèo Cyber' },
  { id: 'av-robot', emoji: '🤖', label: 'Robo 3000' },
  { id: 'av-dragon', emoji: '🐉', label: 'Rồng Lửa' },
  { id: 'av-wizard', emoji: '🧙', label: 'Phù Thủy' },
  { id: 'av-ninja', emoji: '🥷', label: 'Ninja Bóng Đêm' },
  { id: 'av-tiger', emoji: '🐯', label: 'Hổ Quyền' },
  { id: 'av-bear', emoji: '🐻', label: 'Gấu Bão Tuyết' }
];

export const LobbyView: React.FC<LobbyViewProps> = ({
  room,
  player,
  connected,
  onCreateRoom,
  onJoinRoom,
  onAddBot,
  onRemoveBot,
  onUpdateSettings,
  onSetReady,
  onStartGame,
  onLeaveRoom,
  onSendMessage,
  errorMsg
}) => {
  const { user, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [welcomeTab, setWelcomeTab] = useState<'play' | 'leaderboard'>('play');

  const [playerName, setPlayerName] = useState('Player ' + Math.floor(100 + Math.random() * 900));
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
  const [joinCode, setJoinCode] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Sync profile when user logs in
  useEffect(() => {
    if (user) {
      setPlayerName(user.displayName);
      if (user.avatar) setSelectedAvatar(user.avatar);
    }
  }, [user]);

  // If not in a room, display Welcome / Join / Create Screen + Leaderboard
  if (!room || !player) {
    const avatarEmoji = AVATARS.find((a) => a.id === (user?.avatar || selectedAvatar))?.emoji || '🦊';
    const totalGames = user ? (user.stats.totalGames || user.stats.totalWins) : 0;
    const winRate = totalGames > 0 && user ? Math.round((user.stats.totalWins / totalGames) * 100) : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-start p-4 sm:p-8 font-sans">
        {/* Top User Bar */}
        <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/30">
              🂡
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                OmniDeck <span className="text-amber-400 font-extrabold text-sm uppercase px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30">Sàn Đấu</span>
              </h1>
              <p className="text-xs text-slate-400">UNO • Mèo Nổ • Tiến Lên Miền Nam</p>
            </div>
          </div>

          {/* User Account / Auth Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-1.5 pr-3 shadow-lg">
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shadow">
                  {avatarEmoji}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs text-white">{user.displayName}</span>
                    <span className="text-[10px] text-slate-400 font-medium">@{user.username}</span>
                  </div>
                  {/* Wins Badges */}
                  <div className="flex items-center gap-2 text-[11px] font-bold text-amber-400">
                    <span title="Tổng chiến thắng" className="flex items-center gap-0.5">
                      🏆 {user.stats.totalWins}
                    </span>
                    <span className="text-slate-600">|</span>
                    <span title="UNO Wins" className="text-rose-400">🔴 {user.stats.unoWins}</span>
                    <span title="Mèo Nổ Wins" className="text-orange-400">💣 {user.stats.explodingKittensWins}</span>
                    <span title="Tiến Lên Wins" className="text-emerald-400">🎴 {user.stats.tienLenWins}</span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 ml-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Đăng xuất tài khoản"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                  Đăng Nhập
                </button>
                <button
                  onClick={() => {
                    setAuthMode('register');
                    setAuthModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Đăng Ký
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Welcome Tab Switcher (Sảnh Chơi vs Bảng Xếp Hạng) */}
        <div className="w-full max-w-xl flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 mb-6 shadow-xl">
          <button
            onClick={() => setWelcomeTab('play')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              welcomeTab === 'play'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            🎮 Vào Phòng Đấu
          </button>
          <button
            onClick={() => setWelcomeTab('leaderboard')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              welcomeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            🏆 Bảng Xếp Hạng Cao Thủ
          </button>
        </div>

        {/* Tab 1: Play & Room Creation */}
        {welcomeTab === 'play' && (
          <div className="max-w-xl w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-950/50">
            {/* User Win Status Callout */}
            {user ? (
              <div className="mb-6 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-xl">
                    👑
                  </div>
                  <div>
                    <div className="text-xs font-bold text-indigo-300">
                      Chào mừng quay lại, {user.displayName}!
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Tổng thắng: <strong className="text-amber-400">{user.stats.totalWins} ván</strong> ({user.stats.totalGames} trận đã chơi, TLT: <strong className="text-emerald-400">{winRate}%</strong>)
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setWelcomeTab('leaderboard')}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-colors"
                >
                  Xem Rank
                </button>
              </div>
            ) : (
              <div className="mb-6 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Đăng nhập để lưu chuỗi thắng &amp; xuất hiện trên Bảng Xếp Hạng!</span>
                </div>
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setAuthModalOpen(true);
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-bold whitespace-nowrap underline underline-offset-2"
                >
                  Đăng Nhập
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                {errorMsg}
              </div>
            )}

            {/* Profile Setup */}
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Biệt Danh Của Bạn
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                  placeholder="Nhập tên của bạn..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Chọn Ảnh Đại Diện
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {AVATARS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => setSelectedAvatar(av.id)}
                      className={`h-12 flex items-center justify-center text-2xl rounded-xl border transition-all ${
                        selectedAvatar === av.id
                          ? 'border-indigo-500 bg-indigo-500/20 scale-105 shadow-md shadow-indigo-500/20'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                      title={av.label}
                    >
                      {av.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions: Create or Join */}
            <div className="space-y-4">
              <button
                onClick={() => onCreateRoom(playerName, selectedAvatar, user?.id)}
                disabled={!connected || !playerName.trim()}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <Gamepad2 className="w-5 h-5" />
                Tạo Phòng Mới
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  hoặc vào bằng mã phòng
                </span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="MÃ 6 KÝ TỰ"
                  maxLength={6}
                  className="flex-1 bg-slate-950/60 border border-slate-700/80 rounded-xl px-4 py-3 text-white text-center tracking-widest font-mono uppercase text-lg placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  onClick={() => onJoinRoom(joinCode, playerName, selectedAvatar, user?.id)}
                  disabled={!connected || joinCode.length < 4}
                  className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold flex items-center gap-2 border border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Vào Phòng
                </button>
              </div>
            </div>

            {/* Game Features Preview */}
            <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-3 text-center text-xs text-slate-400">
              <div className="p-2 rounded-lg bg-slate-950/40">
                <span className="block font-bold text-amber-400 text-sm mb-0.5">UNO</span>
                Cộng dồn &amp; Flex
              </div>
              <div className="p-2 rounded-lg bg-slate-950/40">
                <span className="block font-bold text-rose-400 text-sm mb-0.5">Mèo Nổ</span>
                Chặn 3s &amp; Gỡ Bom
              </div>
              <div className="p-2 rounded-lg bg-slate-950/40">
                <span className="block font-bold text-emerald-400 text-sm mb-0.5">Tiến Lên</span>
                Đôi thông &amp; Tứ quý
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Full Leaderboard Display on Welcome Screen */}
        {welcomeTab === 'leaderboard' && (
          <div className="w-full max-w-3xl">
            <LeaderboardView />
          </div>
        )}

        {/* Auth Modal */}
        <AuthModal
          isOpen={authModalOpen}
          initialMode={authMode}
          onClose={() => setAuthModalOpen(false)}
        />
      </div>
    );
  }

  // Active Room Lobby View
  const isHost = player.isHost;
  const maxCapacities: Record<GameType, number> = {
    'uno': 8,
    'exploding-kittens': 5,
    'tien-len': 4
  };
  const maxAllowed = maxCapacities[room.settings.gameType];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput);
    setChatInput('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 font-sans">
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-600/30">
            🂡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Phòng Chờ</h2>
              {user && (
                <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  🏆 {user.stats.totalWins} Thắng
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Mã phòng:</span>
              <button
                onClick={handleCopyCode}
                className="font-mono font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-500/20 transition-all cursor-pointer"
                title="Bấm để sao chép"
              >
                {room.id}
                <Copy className="w-3 h-3" />
              </button>
              {copied && <span className="text-emerald-400 text-xs font-semibold">Đã sao chép!</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLeaveRoom}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700 text-sm font-semibold text-slate-300 transition-colors cursor-pointer"
          >
            Rời Phòng
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm">
          {errorMsg}
        </div>
      )}

      {/* Main Lobby Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column: Player Slots (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Người Chơi ({room.players.length} / {maxAllowed})
              </h3>
              {isHost && room.players.length < maxAllowed && (
                <button
                  onClick={onAddBot}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Thêm Bot AI
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {room.players.map((p) => {
                const avatarEmoji = AVATARS.find((a) => a.id === p.avatar)?.emoji || '👤';
                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                      p.id === player.id
                        ? 'bg-indigo-950/40 border-indigo-500/40 shadow-md shadow-indigo-950/30'
                        : 'bg-slate-950/40 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                        {p.isBot ? '🤖' : avatarEmoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-100">{p.name}</span>
                          {p.isHost && (
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Chủ phòng
                            </span>
                          )}
                          {p.isBot && (
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              Bot
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${p.connected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          {p.connected ? (p.isReady ? 'Sẵn sàng' : 'Chưa sẵn sàng') : 'Mất kết nối'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {p.isReady && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                      {isHost && p.id !== player.id && (
                        <button
                          onClick={() => onRemoveBot(p.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Đuổi khỏi phòng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Empty placeholder slots */}
              {Array.from({ length: Math.max(0, maxAllowed - room.players.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="p-3.5 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/20 flex items-center justify-center text-slate-600 text-xs font-semibold gap-2"
                >
                  <Users className="w-4 h-4 opacity-40" />
                  Vị trí trống
                </div>
              ))}
            </div>
          </div>

          {/* Chat & Event Feed */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-xl flex-1 flex flex-col min-h-[220px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              Trò Chuyện &amp; Nhật Ký Phòng
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1 max-h-48 text-xs">
              {room.chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`p-2 rounded-xl ${
                    m.isSystem ? 'bg-slate-950/40 text-slate-400 italic' : 'bg-slate-950/70 text-slate-200'
                  }`}
                >
                  <span className="font-bold mr-1.5 text-indigo-300">{m.senderName}:</span>
                  <span>{m.text}</span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nhập tin nhắn..."
                maxLength={100}
                className="flex-1 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Game Selection & Rules (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Settings className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold">Cài Đặt Trận Đấu</h3>
            </div>

            {/* Game Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Chọn Trò Chơi
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'uno', label: 'UNO', icon: '🃏', color: 'from-amber-500 to-red-500' },
                  { type: 'exploding-kittens', label: 'Mèo Nổ', icon: '💣', color: 'from-orange-500 to-rose-500' },
                  { type: 'tien-len', label: 'Tiến Lên', icon: '♠️', color: 'from-emerald-500 to-teal-500' }
                ].map((g) => (
                  <button
                    key={g.type}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ gameType: g.type as GameType })}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      room.settings.gameType === g.type
                        ? 'border-indigo-500 bg-indigo-500/20 shadow-md shadow-indigo-500/20'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    } ${!isHost && 'cursor-not-allowed opacity-80'}`}
                  >
                    <div className="text-2xl mb-1">{g.icon}</div>
                    <div className="text-xs font-bold text-white">{g.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Game-Specific Settings */}
            {room.settings.gameType === 'uno' && (
              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Chế Độ UNO
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { mode: 'classic', label: 'Cơ Bản' },
                      { mode: 'no-mercy', label: 'Tàn Bạo (+10)' },
                      { mode: 'flex', label: 'Flex Đổi Mặt' }
                    ].map((m) => (
                      <button
                        key={m.mode}
                        disabled={!isHost}
                        onClick={() => onUpdateSettings({ unoMode: m.mode as UnoMode })}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          room.settings.unoMode === m.mode
                            ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                            : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                        } ${!isHost && 'cursor-not-allowed'}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Luật Phụ Bổ Sung
                  </span>
                  {[
                    { key: 'jumpIn', label: 'Cướp lượt (Jump-in khi trùng lá)' },
                    { key: 'sevenZero', label: 'Luật 7-0 (Đổi bài / Chuyền bài)' },
                    { key: 'freeStacking', label: 'Cộng dồn phạt (+2, +4, +6...)' },
                    { key: 'unoPenalty', label: 'Bắt phạt khi quên hô UNO' }
                  ].map((rule) => {
                    const k = rule.key as keyof typeof room.settings.unoRules;
                    const val = room.settings.unoRules[k];
                    return (
                      <label
                        key={rule.key}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          val
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400'
                        } ${!isHost && 'pointer-events-none opacity-80'}`}
                      >
                        <span>{rule.label}</span>
                        <input
                          type="checkbox"
                          checked={val as boolean}
                          disabled={!isHost}
                          onChange={(e) =>
                            onUpdateSettings({
                              unoRules: {
                                ...room.settings.unoRules,
                                [k]: e.target.checked
                              }
                            })
                          }
                          className="rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {room.settings.gameType === 'tien-len' && (
              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Luật Chơi Tiến Lên
                </span>
                <label
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    room.settings.tienLenFirstTurnRule
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  } ${!isHost && 'pointer-events-none opacity-80'}`}
                >
                  <span>Lượt đầu tiên bắt buộc phải có 3 Bích (3♠)</span>
                  <input
                    type="checkbox"
                    checked={room.settings.tienLenFirstTurnRule}
                    disabled={!isHost}
                    onChange={(e) => onUpdateSettings({ tienLenFirstTurnRule: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                </label>
              </div>
            )}

            {room.settings.gameType === 'exploding-kittens' && (
              <div className="space-y-4 pt-4 border-t border-slate-800/80">
                <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-400" />
                    Cơ Chế Mèo Nổ Cơ Bản
                  </div>
                  <p className="text-[11px] text-orange-300/80">
                    Bao gồm chuỗi phản ứng thẻ Chặn Nope (3 giây) và cửa sổ gỡ bom đưa lại bài vào bộ bài tương tác (10 giây).
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Bản Mở Rộng &amp; Chế Độ Chơi (Bật / Tắt)
                  </span>

                  {[
                    {
                      key: 'implodingKittens',
                      title: 'Bản Mở Rộng 1: Imploding Kittens',
                      desc: 'Mèo Phát Nổ ngửa mặt, Tấn Công Mục Tiêu, Đảo Chiều, Rút Đáy, Mèo Hoang, Sửa Tương Lai 3X.',
                      badge: '☢️ Imploding'
                    },
                    {
                      key: 'streakingKittens',
                      title: 'Bản Mở Rộng 2: Streaking Kittens',
                      desc: 'Mèo Đi Dạo (ôm bí mật 1 Mèo Nổ, ai trộm nổ tung!), Siêu Bỏ Qua, Bom Nguyên Tử, Lời Nguyền Đít Mèo, Soi 5X.',
                      badge: '🩲 Streaking'
                    },
                    {
                      key: 'barkingKittens',
                      title: 'Bản Mở Rộng 3: Barking Kittens',
                      desc: 'Mèo Sủa (đòi thẻ Gỡ Bom), Tấn Công Bản Thân 3X, Chôn Bài, Cái Đó Của Tôi, Chia Sẻ Tương Lai.',
                      badge: '🐶 Barking'
                    },
                    {
                      key: 'timebombMode',
                      title: 'Chế Độ Bom Hẹn Giờ (Timebomb - 15s)',
                      desc: 'Giới hạn thời gian mỗi lượt chỉ 15 giây (thay vì 30s) cực kỳ kịch tính và dồn dập!',
                      badge: '⏱️ 15s Fast'
                    }
                  ].map((exp) => {
                    const k = exp.key as keyof EKExpansions;
                    const val = !!room.settings.ekExpansions?.[k];
                    return (
                      <label
                        key={exp.key}
                        className={`flex items-start justify-between p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                          val
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                        } ${!isHost && 'pointer-events-none opacity-80'}`}
                      >
                        <div className="space-y-0.5 pr-2">
                          <div className="font-bold flex items-center gap-2 text-white">
                            <span>{exp.title}</span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              {exp.badge}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">{exp.desc}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={val}
                          disabled={!isHost}
                          onChange={(e) => {
                            const current = room.settings.ekExpansions || {
                              implodingKittens: false,
                              streakingKittens: false,
                              barkingKittens: false,
                              timebombMode: false
                            };
                            onUpdateSettings({
                              ekExpansions: {
                                ...current,
                                [k]: e.target.checked
                              }
                            });
                          }}
                          className="mt-1 rounded text-rose-600 focus:ring-0 bg-slate-900 border-slate-700 w-4 h-4 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Start / Ready Bar */}
            <div className="pt-4 border-t border-slate-800 flex gap-3">
              {isHost ? (
                <button
                  onClick={onStartGame}
                  disabled={room.players.length < 2}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Bắt Đầu Trận Đấu ({room.players.length} Người chơi)
                </button>
              ) : (
                <button
                  onClick={() => onSetReady(!player.isReady)}
                  className={`w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 transition-all ${
                    player.isReady
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  {player.isReady ? 'Đã Sẵn Sàng! (Bấm để hủy)' : 'Bấm Để Sẵn Sàng'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
