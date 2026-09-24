import React, { useState } from 'react';
import { Sparkles, Play, Flame, Zap, ChevronRight } from 'lucide-react';
import { SlotGameInfo } from '../../types/game';

interface Props {
  onSelectGame: (gameId: string) => void;
}

const FEATURED_GAMES: (SlotGameInfo & { status: 'live' | 'upcoming'; badge: string })[] = [
  {
    id: 'wild-bounty-showdown',
    name: 'Wild Bounty Showdown',
    tagline: 'Nữ Thợ Săn Viễn Tây - Nhân Đôi Hệ Số Lên Đến x1,024!',
    provider: 'PG Soft',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    reels: [3, 4, 5, 5, 4, 3],
    rtp: '96.75%',
    maxWin: '5,000x',
    volatility: 'Cao',
    status: 'live',
    badge: 'ĐANG HOT 🔥',
    features: [
      '3,600 Cách Chiến Thắng',
      'Nổ Liên Hoàn (Cascading Reels)',
      'Viền Vàng Hóa WILD',
      'Nhân Đôi Hệ Số x1 ➔ x1,024',
      'Free Spins Khởi Điểm x8'
    ]
  },
  {
    id: 'fortune-ox',
    name: 'Fortune Ox',
    tagline: 'Trâu Vàng May Mắn - Nhân Thập Bội x10 Toàn Bảng',
    provider: 'PG Soft',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    reels: [3, 4, 3],
    rtp: '96.75%',
    maxWin: '2,000x',
    volatility: 'Trung bình',
    status: 'upcoming',
    badge: 'SẮP RA MẮT ⏳',
    features: ['Respin Khóa Cuộn', 'Hệ Số Nhân x10 Toàn Màn Hình']
  },
  {
    id: 'mahjong-ways',
    name: 'Mahjong Ways',
    tagline: 'Mạt Chược Gốc PG Soft - 1,024 Ways, Top Phát 100x',
    provider: 'PG Soft',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    reels: [4, 4, 4, 4, 4],
    rtp: '96.92%',
    maxWin: '25,000x',
    volatility: 'Trung bình',
    status: 'live',
    badge: 'BẢN GỐC 🀄',
    features: ['1,024 Cách Thắng', 'Mạ Vàng Hóa WILD', 'Hệ Số x1 ➔ x5']
  },
  {
    id: 'mahjong-ways-2',
    name: 'Mahjong Ways 2',
    tagline: 'Mạt Chược PG Soft - 2,000 Ways, Hệ Số x5 & Free Spins x10',
    provider: 'PG Soft',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    reels: [4, 5, 5, 5, 4],
    rtp: '96.95%',
    maxWin: '25,000x',
    volatility: 'Trung bình',
    status: 'live',
    badge: 'ĐANG HOT 🀄',
    features: ['2,000 Cách Thắng', 'Mạ Vàng Hóa WILD', 'Hệ Số x1 ➔ x5']
  },
  {
    id: 'treasures-of-aztec',
    name: 'Treasures of Aztec',
    tagline: 'Kho Báu Maya Aztec - Kim Tự Tháp Nổ Bão Multiplier',
    provider: 'PG Soft',
    banner: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    reels: [5, 6, 6, 6, 6, 5],
    rtp: '96.71%',
    maxWin: '100,000x',
    volatility: 'Cao',
    status: 'upcoming',
    badge: 'SẮP RA MẮT ⏳',
    features: ['32,400 Ways to Win', 'Tăng Hệ Số Không Giới Hạn']
  }
];

export const SlotsHubView: React.FC<Props> = ({ onSelectGame }) => {
  const [filter, setFilter] = useState<'all' | 'pgsoft' | 'hot'>('all');

  const filteredGames = FEATURED_GAMES.filter(g => {
    if (filter === 'hot') return g.status === 'live';
    return true;
  });

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 text-white pb-12">
      {/* Featured Banner Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950 via-stone-900 to-gray-950 border border-amber-600/40 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-black mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>KHU VỰC SLOT NỔ HŨ CHÍNH THỨC</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500">
            Wild Bounty Showdown
          </h1>
          <p className="text-sm text-gray-300 mt-2 mb-6">
            Siêu phẩm slot miền Tây PG Soft đình đám với 3,600 cách thắng, cơ chế nổ liên hoàn nhân đôi hệ số tới{' '}
            <strong className="text-yellow-400">x1,024</strong> và Vòng Quay Miễn Phí khởi điểm x8!
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onSelectGame('wild-bounty-showdown')}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 text-gray-950 shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>CHƠI NGAY BÂY GIỜ</span>
            </button>
            <div className="flex items-center gap-3 text-xs text-amber-300/90 font-bold bg-black/40 px-4 py-2.5 rounded-2xl border border-amber-600/30">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" /> Max x1,024
              </span>
              <span>•</span>
              <span>RTP 96.75%</span>
            </div>
          </div>
        </div>

        {/* Decorative Visual Background Elements */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none flex items-center justify-center">
          <span className="text-[180px] filter blur-sm">🤠</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              filter === 'all'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-gray-900 text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            Tất Cả Game ({FEATURED_GAMES.length})
          </button>
          <button
            onClick={() => setFilter('hot')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              filter === 'hot'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'bg-gray-900 text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            Đang Hoạt Động (3)
          </button>
          <button
            onClick={() => setFilter('pgsoft')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              filter === 'pgsoft'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'bg-gray-900 text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            Nhà Cung Cấp PG Soft
          </button>
        </div>
      </div>

      {/* Slot Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGames.map(game => {
          const isLive = game.status === 'live';

          return (
            <div
              key={game.id}
              className={`group relative flex flex-col justify-between rounded-3xl border p-5 transition-all duration-300 ${
                isLive
                  ? 'bg-gradient-to-b from-stone-900/90 to-gray-950 border-amber-600/40 hover:border-amber-400/80 shadow-lg hover:shadow-amber-500/10'
                  : 'bg-gray-950/60 border-gray-800/80 opacity-75'
              }`}
            >
              <div>
                {/* Header Card Badges */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-gray-800/80 text-gray-400 border border-gray-700">
                    {game.provider}
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isLive
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                        : 'bg-gray-800 text-gray-500 border border-gray-700'
                    }`}
                  >
                    {game.badge}
                  </span>
                </div>

                {/* Title & Tagline */}
                <h3 className="text-lg font-black text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                  {game.name}
                </h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{game.tagline}</p>

                {/* Stats Bar */}
                <div className="grid grid-cols-3 gap-2 my-4 p-2.5 rounded-xl bg-black/40 border border-gray-800/60 text-center">
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold">RTP</div>
                    <div className="text-xs font-black text-amber-300">{game.rtp}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Thắng Max</div>
                    <div className="text-xs font-black text-emerald-400">{game.maxWin}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold">Biến Động</div>
                    <div className="text-xs font-black text-purple-400">{game.volatility}</div>
                  </div>
                </div>

                {/* Key Features List */}
                <div className="space-y-1 mb-5">
                  {game.features.slice(0, 3).map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-gray-300">
                      <Zap className="w-3 h-3 text-amber-400 flex-shrink-0" />
                      <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              {isLive ? (
                <button
                  onClick={() => onSelectGame(game.id)}
                  className="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-950 hover:brightness-110 active:scale-95 shadow-lg shadow-amber-500/20 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>VÀO CHƠI NGAY</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-wider text-center bg-gray-900/60 text-gray-500 border border-gray-800 cursor-not-allowed">
                  SẮP PHÁT HÀNH
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
