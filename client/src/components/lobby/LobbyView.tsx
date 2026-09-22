import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  Copy,
  Flame,
  Gamepad2,
  LogIn,
  Play,
  Plus,
  Send,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  Coins,
} from 'lucide-react';
import { EKExpansions, GameType, RoomPlayer, RoomSettings, RoomState, UnoMode } from '../../types/game';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../i18n/LanguageContext';
import { AuthModal } from '../auth/AuthModal';
import { LeaderboardView } from '../leaderboard/LeaderboardView';
import { ROOM_BET_OPTIONS, DEFAULT_ROOM_BET_UI } from '../../utils/roomBet';

interface LobbyViewProps {
  room: RoomState | null;
  player: RoomPlayer | null;
  connected: boolean;
  onCreateRoom: (name: string, avatar: string, userId?: string, betAmount?: number) => void;
  onJoinRoom: (roomId: string, name: string, avatar: string, userId?: string) => void;
  onAddBot: () => void;
  onRemoveBot: (id: string) => void;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onSetReady: (ready: boolean) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  onSendMessage: (text: string) => void;
  errorMsg: string | null;
  /** Mã phòng điền sẵn (deep-link /room/:id hoặc ?id=). */
  initialJoinCode?: string;
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
  errorMsg,
  initialJoinCode = ''
}) => {
  const { user } = useAuth();
  const { t } = useLang();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [welcomeTab, setWelcomeTab] = useState<'play' | 'leaderboard'>('play');

  const [playerName, setPlayerName] = useState('Player ' + Math.floor(100 + Math.random() * 900));
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
  const [joinCode, setJoinCode] = useState(initialJoinCode.toUpperCase());
  const [createBet, setCreateBet] = useState<number>(DEFAULT_ROOM_BET_UI);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Sync profile when user logs in
  useEffect(() => {
    if (user) {
      setPlayerName(user.displayName);
      if (user.avatar) setSelectedAvatar(user.avatar);
    }
  }, [user]);

  // Deep-link mã phòng (?id= / /room/:id)
  useEffect(() => {
    if (initialJoinCode) setJoinCode(initialJoinCode.toUpperCase());
  }, [initialJoinCode]);

  // If not in a room, display Welcome / Join / Create Screen + Leaderboard
  if (!room || !player) {
    const totalGames = user ? (user.stats.totalGames || user.stats.totalWins) : 0;
    const winRate = totalGames > 0 && user ? Math.round((user.stats.totalWins / totalGames) * 100) : 0;
    const canAffordCreate = !user || user.balance >= createBet;

    return (
      <div className="flex flex-col items-center justify-start font-sans">
        {/* Welcome Tab Switcher (Sảnh Chơi vs Bảng Xếp Hạng) */}
        <div className="w-full max-w-xl flex bg-gray-900/60 p-1.5 rounded-2xl border border-gray-700/50 mb-6 shadow-xl">
          <button
            onClick={() => setWelcomeTab('play')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              welcomeTab === 'play'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-purple-500/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            {t('play.tabPlay')}
          </button>
          <button
            onClick={() => setWelcomeTab('leaderboard')}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              welcomeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            {t('play.tabLb')}
          </button>
        </div>

        {/* Tab 1: Play & Room Creation */}
        {welcomeTab === 'play' && (
          <div className="max-w-xl w-full bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl">
            {/* User Win Status Callout */}
            {user ? (
              <div className="mb-6 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-xl">
                    👑
                  </div>
                  <div>
                    <div className="text-xs font-bold text-indigo-300">
                      {t('play.welcomeBack')}, {user.displayName}!
                    </div>
                    <div className="text-[11px] text-gray-300">
                      {t('play.totalWins')}: <strong className="text-amber-400">{user.stats.totalWins}</strong> ({user.stats.totalGames} {t('play.matches')}: <strong className="text-emerald-400">{winRate}%</strong>)
                    </div>
                    <div className="text-[11px] text-yellow-300 font-bold mt-0.5 flex items-center gap-1">
                      <Coins className="w-3 h-3" /> {user.balance.toLocaleString('vi-VN')} 🪙
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setWelcomeTab('leaderboard')}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition-colors"
                >
                  {t('play.viewRank')}
                </button>
              </div>
            ) : (
              <div className="mb-6 p-3.5 rounded-2xl bg-gray-950/60 border border-gray-700/50 flex items-center justify-between gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>{t('play.loginCallout')}</span>
                </div>
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setAuthModalOpen(true);
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-bold whitespace-nowrap underline underline-offset-2"
                >
                  {t('top.login')}
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
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  {t('play.nickname')}
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  className="w-full bg-gray-950/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                  placeholder={t('play.nicknamePh')}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  {t('play.avatar')}
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {AVATARS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => setSelectedAvatar(av.id)}
                      className={`h-12 flex items-center justify-center text-2xl rounded-xl border transition-all ${
                        selectedAvatar === av.id
                          ? 'border-indigo-500 bg-indigo-500/20 scale-105 shadow-md shadow-indigo-500/20'
                          : 'border-gray-700/50 bg-gray-950/40 hover:border-gray-600'
                      }`}
                      title={av.label}
                    >
                      {av.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mandatory Room Bet */}
            <div className="space-y-2 mb-6 p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/20">
              <span className="block text-xs font-semibold uppercase tracking-wider text-yellow-300">
                {t('play.roomBet')}
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {ROOM_BET_OPTIONS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCreateBet(amt)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      createBet === amt
                        ? 'border-yellow-500 bg-yellow-500/20 text-yellow-300 shadow-md shadow-yellow-500/20'
                        : 'border-gray-700/50 bg-gray-950/40 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">
                {t('play.betNote', { bet: createBet })}
                {user && !canAffordCreate && (
                  <span className="text-rose-400 font-bold"> {t('play.noBalance', { bal: user.balance })}</span>
                )}
              </p>
            </div>

            {/* Actions: Create or Join */}
            <div className="space-y-4">
              <button
                onClick={() => onCreateRoom(playerName, selectedAvatar, user?.id, createBet)}
                disabled={!connected || !playerName.trim() || !canAffordCreate}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-bold flex items-center justify-center gap-2.5 shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <Gamepad2 className="w-5 h-5" />
                {t('play.create')} • {createBet} 🪙
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-700/50"></div>
                <span className="flex-shrink mx-4 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  {t('play.orByCode')}
                </span>
                <div className="flex-grow border-t border-gray-700/50"></div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder={t('play.codePh')}
                  maxLength={6}
                  className="flex-1 bg-gray-950/60 border border-gray-700/50 rounded-xl px-4 py-3 text-white text-center tracking-widest font-mono uppercase text-lg placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  onClick={() => onJoinRoom(joinCode, playerName, selectedAvatar, user?.id)}
                  disabled={!connected || joinCode.length < 4}
                  className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-100 font-bold flex items-center gap-2 border border-gray-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  {t('play.join')}
                </button>
              </div>
            </div>

            {/* Game Features Preview */}
            <div className="mt-8 pt-6 border-t border-gray-700/50 grid grid-cols-3 gap-3 text-center text-xs text-gray-400">
                <div className="p-2 rounded-lg bg-gray-950/40">
                <span className="block font-bold text-amber-400 text-sm mb-0.5">UNO</span>
                {t('g.featUno')}
              </div>
              <div className="p-2 rounded-lg bg-gray-950/40">
                <span className="block font-bold text-rose-400 text-sm mb-0.5">Mèo Nổ</span>
                {t('g.featEk')}
              </div>
              <div className="p-2 rounded-lg bg-gray-950/40">
                <span className="block font-bold text-emerald-400 text-sm mb-0.5">Tiến Lên</span>
                {t('g.featTl')}
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
  const getMaxAllowed = (settings: RoomSettings): number => {
    if (settings.gameType === 'uno') return 8;
    if (settings.gameType === 'tien-len') return 4;
    if (settings.gameType === 'exploding-kittens') {
      let max = 5;
      const exp = settings.ekExpansions;
      if (exp?.implodingKittens) max += 1;
      if (exp?.streakingKittens) max += 2;
      if (exp?.barkingKittens) max += 2;
      return Math.min(10, max);
    }
    return 5;
  };
  const maxAllowed = getMaxAllowed(room.settings);

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
    <div className="flex flex-col font-sans">
      {/* Room Sub-header (Dashboard tokens) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-purple-500/20 font-black text-xl">
            🂡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">{t('room.waiting')}</h2>
              {user && (
                <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  🏆 {user.stats.totalWins} {t('room.wins')}
                </span>
              )}
              <span className="text-xs text-yellow-300 font-bold bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/30">
                {t('room.betPer', { bet: room.settings.betAmount })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{t('room.code')}</span>
              <button
                onClick={handleCopyCode}
                className="font-mono font-bold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-500/20 transition-all cursor-pointer"
                title="Bấm để sao chép"
              >
                {room.id}
                <Copy className="w-3 h-3" />
              </button>
              {copied && <span className="text-emerald-400 text-xs font-semibold">{t('room.copied')}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onLeaveRoom}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-rose-500/20 hover:text-rose-300 border border-gray-700/50 text-sm font-semibold text-gray-300 transition-colors cursor-pointer"
          >
            {t('room.leave')}
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
          <div className="bg-gray-900/60 border border-gray-700/50 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                {t('room.players')} ({room.players.length} / {maxAllowed})
              </h3>
              {isHost && room.players.length < maxAllowed && (
                <button
                  onClick={onAddBot}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('room.addBot')}
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
                        : 'bg-gray-950/40 border-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
                        {p.isBot ? '🤖' : avatarEmoji}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-gray-100">{p.name}</span>
                          {p.isHost && (
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {t('room.host')}
                            </span>
                          )}
                          {p.isBot && (
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              {t('room.bot')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${p.connected ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                          {p.connected ? (p.isReady ? t('room.ready') : t('room.notReady')) : t('room.offline')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {p.isReady && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                      {isHost && p.id !== player.id && (
                        <button
                          onClick={() => onRemoveBot(p.id)}
                          className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title={t('room.kick')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {Array.from({ length: Math.max(0, maxAllowed - room.players.length) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="p-3.5 rounded-2xl border border-dashed border-gray-700/50 bg-gray-950/20 flex items-center justify-center text-gray-600 text-xs font-semibold gap-2"
                >
                  <Users className="w-4 h-4 opacity-40" />
                  {t('room.emptySlot')}
                </div>
              ))}
            </div>
          </div>

          {/* Chat & Event Feed */}
          <div className="bg-gray-900/60 border border-gray-700/50 rounded-3xl p-5 shadow-2xl flex-1 flex flex-col min-h-[220px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              {t('room.chat')}
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1 max-h-48 text-xs">
              {room.chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`p-2 rounded-xl ${
                    m.isSystem ? 'bg-gray-950/40 text-gray-400 italic' : 'bg-gray-950/70 text-gray-200'
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
                placeholder={t('room.chatPh')}
                maxLength={100}
                className="flex-1 bg-gray-950/70 border border-gray-700/50 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
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
          <div className="bg-gray-900/60 border border-gray-700/50 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-700/50">
              <Settings className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold">{t('room.settings')}</h3>
            </div>

            {/* Game Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {t('room.chooseGame')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'uno', label: 'UNO', icon: '🃏' },
                  { type: 'exploding-kittens', label: 'Mèo Nổ', icon: '💣' },
                  { type: 'tien-len', label: 'Tiến Lên', icon: '♠️' }
                ].map((g) => (
                  <button
                    key={g.type}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ gameType: g.type as GameType })}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      room.settings.gameType === g.type
                        ? 'border-indigo-500 bg-indigo-500/20 shadow-md shadow-indigo-500/20'
                        : 'border-gray-700/50 bg-gray-950/40 hover:border-gray-600'
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
              <div className="space-y-4 pt-4 border-t border-gray-700/50">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    {t('g.unoMode')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { mode: 'classic', label: t('g.unoClassic') },
                      { mode: 'no-mercy', label: t('g.unoNomercy') },
                      { mode: 'flex', label: t('g.unoFlex') }
                    ].map((m) => (
                      <button
                        key={m.mode}
                        disabled={!isHost}
                        onClick={() => onUpdateSettings({ unoMode: m.mode as UnoMode })}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          room.settings.unoMode === m.mode
                            ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                            : 'border-gray-700/50 bg-gray-950/40 text-gray-400 hover:border-gray-600'
                        } ${!isHost && 'cursor-not-allowed'}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {t('g.unoExtra')}
                  </span>
                  {[
                    { key: 'jumpIn', label: t('g.ruleJump') },
                    { key: 'sevenZero', label: t('g.rule70') },
                    { key: 'freeStacking', label: t('g.ruleStack') },
                    { key: 'unoPenalty', label: t('g.rulePenalty') }
                  ].map((rule) => {
                    const k = rule.key as keyof typeof room.settings.unoRules;
                    const val = room.settings.unoRules[k];
                    return (
                      <label
                        key={rule.key}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          val
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
                            : 'bg-gray-950/40 border-gray-700/50 text-gray-400'
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
                          className="rounded text-indigo-600 focus:ring-0 bg-gray-900 border-gray-700"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {room.settings.gameType === 'tien-len' && (
              <div className="space-y-4 pt-4 border-t border-gray-700/50">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>{t('g.tlTitle')}</span>
                  </div>
                  <p className="text-[11px] text-emerald-300/80">
                    {t('g.tlDesc')}
                  </p>
                </div>

                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t('g.tlOptions')}
                </span>

                <div className="space-y-2">
                  <label
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      room.settings.tienLenCutTwoRule !== false
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-gray-950/40 border-gray-700/50 text-gray-400'
                    } ${!isHost && 'pointer-events-none opacity-80'}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold">{t('g.tlCut')}</span>
                      <span className="text-[11px] text-gray-400">{t('g.tlCutDesc')}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={room.settings.tienLenCutTwoRule !== false}
                      disabled={!isHost}
                      onChange={(e) => onUpdateSettings({ tienLenCutTwoRule: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-0 bg-gray-900 border-gray-700"
                    />
                  </label>

                  <label
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      room.settings.tienLenFirstTurnRule
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-gray-950/40 border-gray-700/50 text-gray-400'
                    } ${!isHost && 'pointer-events-none opacity-80'}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold">{t('g.tlFirst')}</span>
                      <span className="text-[11px] text-gray-400">{t('g.tlFirstDesc')}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={room.settings.tienLenFirstTurnRule}
                      disabled={!isHost}
                      onChange={(e) => onUpdateSettings({ tienLenFirstTurnRule: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-0 bg-gray-900 border-gray-700"
                    />
                  </label>
                </div>
              </div>
            )}

            {room.settings.gameType === 'exploding-kittens' && (
              <div className="space-y-4 pt-4 border-t border-gray-700/50">
                <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-400" />
                    {t('g.ekBase')}
                  </div>
                  <p className="text-[11px] text-orange-300/80">
                    {t('g.ekBaseDesc')}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {t('g.ekExpansions')}
                  </span>

                  {[
                    {
                      key: 'implodingKittens',
                      title: t('g.ek1t'),
                      desc: t('g.ek1d'),
                      badge: '☢️ Imploding (+1 người: tối đa 6)'
                    },
                    {
                      key: 'streakingKittens',
                      title: t('g.ek2t'),
                      desc: t('g.ek2d'),
                      badge: '🩲 Streaking (+2 người: tối đa 8)'
                    },
                    {
                      key: 'barkingKittens',
                      title: t('g.ek3t'),
                      desc: t('g.ek3d'),
                      badge: '🐶 Barking (+2 người: tối đa 10)'
                    },
                    {
                      key: 'timebombMode',
                      title: t('g.ekTimet'),
                      desc: t('g.ekTimeDesc'),
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
                            : 'bg-gray-950/40 border-gray-700/50 text-gray-400 hover:border-gray-600'
                        } ${!isHost && 'pointer-events-none opacity-80'}`}
                      >
                        <div className="space-y-0.5 pr-2">
                          <div className="font-bold flex items-center gap-2 text-white">
                            <span>{exp.title}</span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              {exp.badge}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400">{exp.desc}</div>
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
                          className="mt-1 rounded text-rose-600 focus:ring-0 bg-gray-900 border-gray-700 w-4 h-4 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Room Betting (bắt buộc — không còn FREE) */}
            <div className="space-y-2 pt-4 border-t border-gray-700/50">
              <span className="block text-xs font-semibold uppercase tracking-wider text-yellow-300">
                {t('room.betTitle')}
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {ROOM_BET_OPTIONS.map((amt) => (
                  <button
                    key={amt}
                    disabled={!isHost}
                    onClick={() => onUpdateSettings({ betAmount: amt })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      (room.settings.betAmount || 0) === amt
                        ? 'border-yellow-500 bg-yellow-500/20 text-yellow-300 shadow-md shadow-yellow-500/20'
                        : 'border-gray-700/50 bg-gray-950/40 text-gray-400 hover:border-gray-600'
                    } ${!isHost && 'cursor-not-allowed opacity-80'}`}
                    title={`Mỗi người cược ${amt} 🪙, thắng ăn pot`}
                  >
                    {amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">
                {t('room.betNote', { bet: room.settings.betAmount, pot: room.settings.betAmount * room.players.filter((p) => !p.isBot && p.userId).length })}
                {user && (room.settings.betAmount || 0) > user.balance && (
                  <span className="text-rose-400 font-bold"> {t('play.noBalance', { bal: user.balance })}</span>
                )}
              </p>
            </div>

            {/* Start / Ready Bar */}
            <div className="pt-4 border-t border-gray-700/50 flex gap-3">
              {isHost ? (
                <button
                  onClick={onStartGame}
                  disabled={room.players.length < 2}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  <Play className="w-5 h-5 fill-current" />
                  {t('room.start')} ({room.players.length} {t('room.playersCount')} • {room.settings.betAmount} 🪙)
                </button>
              ) : (
                <button
                  onClick={() => onSetReady(!player.isReady)}
                  className={`w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 transition-all ${
                    player.isReady
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
                  }`}
                >
                  <CheckCircle className="w-5 h-5" />
                  {player.isReady ? t('room.iReady') : t('room.beReady')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
