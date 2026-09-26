import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gamepad2,
  Swords,
  Bomb,
  Dice5,
  Target,
  Pickaxe,
  Briefcase,
  Trophy,
  Coins,
  Crown,
  CircleDot,
  Plane,
  Bird,
  ArrowUpDown,
  Hand,
  Package,
  Zap,
  Sparkles,
  Gift,
  Send,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../i18n/LanguageContext';
import { DictKey } from '../../i18n/dict';
import type { AppView, PublicUser } from '../../types/game';
import { GiftcodeModal } from '../wallet/GiftcodeModal';
import { TransferModal } from '../wallet/TransferModal';
import { AuthModal } from '../auth/AuthModal';

interface NavigationPanelProps {
  onNavigate?: (view: AppView) => void;
}

const GAME_CARDS: Array<{
  id: string;
  title: string;
  icon: any;
  descKey: DictKey;
  badges: string[];
  bgGradient: string;
  to: string;
  pulse?: boolean;
}> = [
  { id: 'slots', title: 'Slot Nổ Hũ (PG Soft)', icon: Sparkles, descKey: 'card.slots.desc', badges: ['Wild Bounty', 'x1024 🔥'], bgGradient: 'from-amber-600 via-yellow-500 to-amber-700', to: '/slots', pulse: true },
  { id: 'uno', title: 'UNO', icon: Gamepad2, descKey: 'card.uno.desc', badges: ['Multiplayer', '🪙'], bgGradient: 'from-red-600 to-orange-500', to: '/play' },
  { id: 'exploding-kittens', title: 'Mèo Nổ', icon: Bomb, descKey: 'card.ek.desc', badges: ['Multiplayer', '🪙'], bgGradient: 'from-amber-500 to-yellow-500', to: '/play' },
  { id: 'tien-len', title: 'Tiến Lên', icon: Swords, descKey: 'card.tl.desc', badges: ['Multiplayer', '🪙'], bgGradient: 'from-emerald-500 to-teal-500', to: '/play' },
  { id: 'sam', title: 'Sâm Lốc', icon: Swords, descKey: 'card.sam.desc', badges: ['Multiplayer', 'Báo Sâm', '🪙'], bgGradient: 'from-rose-600 to-amber-600', to: '/play' },
  { id: 'cases', title: 'Mở Hòm CS2', icon: Package, descKey: 'card.cases.desc', badges: ['CS2 Skins', '🪙'], bgGradient: 'from-amber-600 to-orange-500', to: '/cases' },
  { id: 'battles', title: 'Case Battle', icon: Swords, descKey: 'card.battles.desc', badges: ['PVP CS2', 'Ăn Trọn'], bgGradient: 'from-rose-600 to-amber-600', to: '/battles', pulse: true },
  { id: 'upgrade', title: 'Nâng Cấp', icon: Zap, descKey: 'card.upgrade.desc', badges: ['SkinClub', '95% RTP'], bgGradient: 'from-purple-600 to-pink-500', to: '/upgrade' },
  { id: 'inventory', title: 'Kho Đồ', icon: Package, descKey: 'card.inventory.desc', badges: ['Tài Sản', 'Bán Xu'], bgGradient: 'from-indigo-600 to-blue-500', to: '/inventory' },
  { id: 'tai-xiu', title: 'Tài Xỉu', icon: Dice5, descKey: 'card.taixiu.desc', badges: ['Live Casino', '🪙'], bgGradient: 'from-purple-600 to-violet-500', to: '/tai-xiu' },
  { id: 'mines', title: 'Mines', icon: Pickaxe, descKey: 'card.mines.desc', badges: ['Solo', '🪙'], bgGradient: 'from-cyan-500 to-blue-500', to: '/mines' },
  { id: 'goals', title: 'Goals', icon: Target, descKey: 'card.goals.desc', badges: ['Solo', '🪙'], bgGradient: 'from-green-500 to-lime-500', to: '/goals' },
  { id: 'hustle', title: 'Đi Làm', icon: Briefcase, descKey: 'card.hustle.desc', badges: ['Kiếm Tiền', 'FREE'], bgGradient: 'from-slate-600 to-zinc-500', to: '/hustle' },
  { id: 'roulette', title: 'Roulette', icon: CircleDot, descKey: 'card.roulette.desc', badges: ['Live Casino', '🪙'], bgGradient: 'from-emerald-600 to-teal-500', to: '/roulette' },
  { id: 'aviator', title: 'Aviator', icon: Plane, descKey: 'card.aviator.desc', badges: ['Live', '🪙'], bgGradient: 'from-sky-600 to-blue-500', to: '/aviator' },
  { id: 'chicken', title: 'Chicken Cross', icon: Bird, descKey: 'card.chicken.desc', badges: ['Solo', '🪙'], bgGradient: 'from-lime-600 to-green-500', to: '/chicken' },
  { id: 'hilo', title: 'Hi-Lo', icon: ArrowUpDown, descKey: 'card.hilo.desc', badges: ['Solo', '🪙'], bgGradient: 'from-indigo-600 to-violet-500', to: '/hilo' },
  { id: 'coinflip', title: 'Coinflip', icon: Coins, descKey: 'card.coinflip.desc', badges: ['Solo', '🪙'], bgGradient: 'from-yellow-600 to-amber-500', to: '/coinflip' },
  { id: 'rps', title: 'Kéo Búa Bao', icon: Hand, descKey: 'card.rps.desc', badges: ['Solo', '🪙'], bgGradient: 'from-rose-600 to-pink-500', to: '/rps' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
};

const rankBadge = (i: number) =>
  `w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
    i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-300 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400'
  }`;

/** Navigation Panel — trung tâm điều hướng mọi dịch vụ (khung AppShell chung phía ngoài). */
export const NavigationPanel: React.FC<NavigationPanelProps> = () => {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [topMoney, setTopMoney] = useState<PublicUser[]>([]);
  const [topWins, setTopWins] = useState<PublicUser[]>([]);
  const [showGiftcodeModal, setShowGiftcodeModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const load = async (tab: string, set: (u: PublicUser[]) => void) => {
      try {
        const res = await fetch(`/api/leaderboard?gameType=${tab}`);
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.leaderboard)) {
          set(data.leaderboard.slice(0, 5));
        }
      } catch {
        // Bỏ qua lỗi mạng, panel game vẫn hiển thị
      }
    };
    load('money', setTopMoney);
    load('all', setTopWins);
  }, []);

  return (
    <div className="flex flex-col pb-8">
      {/* Hero Section */}
      <section className="relative py-10 sm:py-14 px-2 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl md:text-5xl font-black mb-3">
              {user ? (
                <>
                  {t('panel.hello')}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">{user.displayName}</span>!
                </>
              ) : (
                <>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">{t('panel.welcome')}</span>
                  {t('panel.chooseService')}
                </>
              )}
            </h2>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto font-medium">{t('panel.subtitle')}</p>
          </motion.div>
        </div>
      </section>

      {/* Quick Wallet Actions: Giftcode Promo & Coin Transfer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Giftcode Promo Banner */}
        <div
          onClick={() => setShowGiftcodeModal(true)}
          className="relative group rounded-3xl p-5 bg-gradient-to-br from-amber-600/30 via-yellow-600/20 to-orange-600/30 border border-yellow-500/40 hover:border-yellow-400 shadow-xl cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0 group-hover:scale-110 transition-transform">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white">Nhập Giftcode</h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-yellow-400 text-gray-950">
                    +100,000 🪙
                  </span>
                </div>
                <p className="text-xs text-yellow-200/80 mt-1">
                  Nhập mã đặc biệt <strong className="text-yellow-300 font-mono">DINHVANTRINH</strong> nhận ngay 100k vàng!
                </p>
              </div>
            </div>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-xl bg-yellow-400 text-gray-950 font-black text-xs shadow-md group-hover:bg-yellow-300 transition-colors whitespace-nowrap"
            >
              Đổi Thưởng
            </button>
          </div>
        </div>

        {/* Coin Transfer Banner */}
        <div
          onClick={() => {
            if (!user) setShowAuthModal(true);
            else setShowTransferModal(true);
          }}
          className="relative group rounded-3xl p-5 bg-gradient-to-br from-emerald-600/30 via-teal-600/20 to-indigo-600/30 border border-emerald-500/40 hover:border-emerald-400 shadow-xl cursor-pointer transition-all hover:scale-[1.01]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0 group-hover:scale-110 transition-transform">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white">Chuyển Tiền / Chuyển Xu</h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-500/40">
                    Miễn Phí
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 mt-1">
                  Chuyển coin tức thì cho bạn bè và người chơi khác trong hệ thống.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-gray-950 font-black text-xs shadow-md group-hover:bg-emerald-400 transition-colors whitespace-nowrap"
            >
              Chuyển Xu
            </button>
          </div>
        </div>
      </div>

      {/* Bảng xếp hạng tiền & thắng */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-gray-900/60 border border-gray-700/50 rounded-3xl p-5 shadow-2xl">
          <button onClick={() => navigate('/leaderboard')} className="w-full flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity">
            <div className="bg-gradient-to-br from-yellow-500 to-amber-600 p-2 rounded-xl shadow-lg shadow-yellow-500/20">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-amber-400">
              {t('panel.topMoney')} &rarr;
            </h3>
          </button>
          <div className="flex flex-col gap-2">
            {topMoney.length === 0 && <p className="text-xs text-gray-500 italic">{t('panel.noData')}</p>}
            {topMoney.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${user?.id === p.id ? 'bg-indigo-950/40 border-indigo-500/40' : 'bg-gray-950/40 border-gray-700/50'}`}>
                <span className={rankBadge(i)}>{i + 1}</span>
                <span className="font-bold text-sm text-white truncate flex-1">{p.displayName}</span>
                <span className="font-bold text-sm text-yellow-400 whitespace-nowrap">{(p.balance || 0).toLocaleString('vi-VN')} 🪙</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700/50 rounded-3xl p-5 shadow-2xl">
          <button onClick={() => navigate('/leaderboard')} className="w-full flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-teal-400">
              {t('panel.topWins')} &rarr;
            </h3>
          </button>
          <div className="flex flex-col gap-2">
            {topWins.length === 0 && <p className="text-xs text-gray-500 italic">{t('panel.noData')}</p>}
            {topWins.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${user?.id === p.id ? 'bg-indigo-950/40 border-indigo-500/40' : 'bg-gray-950/40 border-gray-700/50'}`}>
                <span className={rankBadge(i)}>{i + 1}</span>
                <span className="font-bold text-sm text-white truncate flex-1">{p.displayName}</span>
                <span className="font-bold text-sm text-emerald-400 whitespace-nowrap flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" /> {p.stats?.totalWins || 0} {t('panel.winsSuffix')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Game Cards Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {GAME_CARDS.map((game) => {
          const Icon = game.icon;
          return (
            <motion.div
              key={game.id}
              variants={itemVariants}
              whileHover={{ scale: 1.03, y: -6 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(game.to)}
              className={`relative group rounded-3xl overflow-hidden shadow-2xl cursor-pointer ${
                game.pulse ? 'ring-2 ring-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.3)] animate-pulse hover:animate-none' : ''
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${game.bgGradient} opacity-90 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="relative p-6 h-full flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20 mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-10 h-10 text-white drop-shadow-md" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-md tracking-wide">{game.title}</h3>
                <p className="text-sm text-gray-200 mb-6 flex-grow font-medium">{t(game.descKey)}</p>
                <div className="flex flex-wrap justify-center gap-2 mt-auto w-full">
                  {game.badges.map((badge, idx) => (
                    <span
                      key={idx}
                      className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm border ${
                        badge.includes('🪙') || badge.includes('FREE')
                          ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                          : 'bg-white/10 text-white/90 border-white/20'
                      }`}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} initialMode="login" onClose={() => setShowAuthModal(false)} />
      )}

      {showGiftcodeModal && (
        <GiftcodeModal
          isOpen={showGiftcodeModal}
          onClose={() => setShowGiftcodeModal(false)}
          onOpenAuth={() => setShowAuthModal(true)}
        />
      )}

      {showTransferModal && (
        <TransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onOpenAuth={() => setShowAuthModal(true)}
        />
      )}
    </div>
  );
};

/** @deprecated Dùng <NavigationPanel/> — giữ lại để tương thích. */
export const DashboardView: React.FC<{
  user?: any;
  onNavigate?: (view: AppView) => void;
  onLogout?: () => void;
  onOpenAuth?: () => void;
}> = () => {
  return <NavigationPanel />;
};

export default NavigationPanel;