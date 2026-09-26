import React, { useEffect, useState } from 'react';
import { Flame, RefreshCw, Sparkles, Trophy, Users } from 'lucide-react';
import { PublicUser } from '../../types/game';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../i18n/LanguageContext';

type LeaderboardTab = 'all' | 'uno' | 'exploding-kittens' | 'tien-len' | 'sam';

interface LeaderboardViewProps {
  onClose?: () => void;
}

const AVATAR_MAP: Record<string, string> = {
  'av-fox': '🦊',
  'av-cat': '🐱',
  'av-robot': '🤖',
  'av-dragon': '🐉',
  'av-wizard': '🧙',
  'av-ninja': '🥷',
  'av-tiger': '🐯',
  'av-bear': '🐻'
};

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('all');
  const [leaderboard, setLeaderboard] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = async (tab: LeaderboardTab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?gameType=${tab}`);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.leaderboard)) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error('[Leaderboard] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(activeTab);
  }, [activeTab]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/40 ring-2 ring-amber-300">
          🥇
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 flex items-center justify-center text-slate-950 font-black shadow-md ring-2 ring-slate-200">
          🥈
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-700 via-orange-600 to-amber-800 flex items-center justify-center text-white font-black shadow-md ring-2 ring-amber-600">
          🥉
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-xs">
        #{rank}
      </div>
    );
  };

  const getWinsForTab = (u: PublicUser, tab: LeaderboardTab) => {
    switch (tab) {
      case 'uno':
        return u.stats.unoWins;
      case 'exploding-kittens':
        return u.stats.explodingKittensWins;
      case 'tien-len':
        return u.stats.tienLenWins;
      case 'sam':
        return (u.stats as any).samWins || 0;
      default:
        return u.stats.totalWins;
    }
  };

  const getTabLabel = (tab: LeaderboardTab) => {
    switch (tab) {
      case 'uno':
        return t('lb.unoWinsCol');
      case 'exploding-kittens':
        return t('lb.ekWinsCol');
      case 'tien-len':
        return t('lb.tlWinsCol');
      case 'sam':
        return t('lb.samWinsCol');
      default:
        return t('lb.totalWinsCol');
    }
  };

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white shadow-xl shadow-amber-500/30">
            <Trophy className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {t('lb.title')}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-extrabold text-amber-300 uppercase tracking-wider">
                {t('lb.season')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('lb.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLeaderboard(activeTab)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50"
            title="Làm mới bảng xếp hạng"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('lb.refresh')}</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all"
            >
              {t('c.close')}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6 bg-slate-950/70 p-1.5 rounded-2xl border border-slate-800/80">
        {[
          { id: 'all', label: t('lb.tabAll') },
          { id: 'uno', label: t('lb.tabUno') },
          { id: 'exploding-kittens', label: t('lb.tabEk') },
          { id: 'tien-len', label: t('lb.tabTl') },
          { id: 'sam', label: t('lb.tabSam') }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as LeaderboardTab)}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="flex-1 overflow-y-auto max-h-[460px] pr-1 space-y-2.5">
        {loading && leaderboard.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold">{t('lb.loading')}</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-slate-950/30 rounded-2xl border border-slate-800/50">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold text-slate-400">{t('lb.empty')}</p>
            <p className="text-xs text-slate-500 mt-1">{t('lb.emptySub')}</p>
          </div>
        ) : (
          leaderboard.map((playerItem, index) => {
            const rank = index + 1;
            const isMe = user?.id === playerItem.id;
            const wins = getWinsForTab(playerItem, activeTab);
            const totalGames = playerItem.stats.totalGames || wins;
            const winRate = totalGames > 0 ? Math.round((playerItem.stats.totalWins / totalGames) * 100) : 0;
            const avatarEmoji = AVATAR_MAP[playerItem.avatar] || '👤';

            return (
              <div
                key={playerItem.id}
                className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isMe
                    ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500/50'
                    : rank === 1
                    ? 'bg-amber-950/20 border-amber-500/40 shadow-md'
                    : rank === 2
                    ? 'bg-slate-800/40 border-slate-700/80'
                    : rank === 3
                    ? 'bg-orange-950/20 border-orange-700/40'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Left: Rank + Avatar + Name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0">{getRankBadge(rank)}</div>

                  <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl flex-shrink-0 shadow">
                    {avatarEmoji}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-white truncate">
                        {playerItem.displayName}
                      </span>
                      {isMe && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-[10px] font-black text-white uppercase tracking-wider shadow">
                          {t('lb.you')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>@{playerItem.username}</span>
                      <span>•</span>
                      <span className="text-slate-400">{playerItem.stats.totalGames} {t('lb.matches')}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">{winRate}% {t('lb.winRate')}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Wins Highlight & Breakdown */}
                <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                  {/* Detailed breakdown on larger screens */}
                  <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 font-medium">
                    <span title="UNO Wins" className="flex items-center gap-1">
                      🔴 <strong className="text-slate-200">{playerItem.stats.unoWins}</strong>
                    </span>
                    <span title="Mèo Nổ Wins" className="flex items-center gap-1">
                      💣 <strong className="text-slate-200">{playerItem.stats.explodingKittensWins}</strong>
                    </span>
                    <span title="Tiến Lên Wins" className="flex items-center gap-1">
                      🎴 <strong className="text-slate-200">{playerItem.stats.tienLenWins}</strong>
                    </span>
                  </div>

                  {/* Primary Tab Wins Counter */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end font-black text-base sm:text-lg text-amber-400">
                      <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span>{wins}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {getTabLabel(activeTab)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('lb.footer')}</span>
        </div>
        <div className="text-slate-500 font-mono text-[11px]">
          {leaderboard.length} {t('lb.playersOnBoard')}
        </div>
      </div>
    </div>
  );
};
