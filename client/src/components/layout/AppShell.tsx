import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Gamepad2,
  Dices,
  Pickaxe,
  Target,
  Briefcase,
  Trophy,
  Coins,
  LogOut,
  User,
  UserPlus,
  LayoutGrid,
  Plane,
  CircleDot,
  Bird,
  ArrowUpDown,
  Hand,
  Languages,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../i18n/LanguageContext';
import { DictKey } from '../../i18n/dict';
import { AuthModal } from '../auth/AuthModal';

const TABS: Array<{ to: string; label: DictKey; icon: any; end: boolean }> = [
  { to: '/dashboard', label: 'nav.dashboard', icon: LayoutGrid, end: true },
  { to: '/play', label: 'nav.play', icon: Gamepad2, end: false },
  { to: '/hustle', label: 'nav.hustle', icon: Briefcase, end: true },
  { to: '/leaderboard', label: 'nav.leaderboard', icon: Trophy, end: true },
  { to: '/tai-xiu', label: 'nav.taixiu', icon: Dices, end: true },
  { to: '/mines', label: 'nav.mines', icon: Pickaxe, end: true },
  { to: '/goals', label: 'nav.goals', icon: Target, end: true },
  { to: '/roulette', label: 'nav.roulette', icon: CircleDot, end: true },
  { to: '/aviator', label: 'nav.aviator', icon: Plane, end: true },
  { to: '/chicken', label: 'nav.chicken', icon: Bird, end: true },
  { to: '/hilo', label: 'nav.hilo', icon: ArrowUpDown, end: true },
  { to: '/coinflip', label: 'nav.coinflip', icon: Coins, end: true },
  { to: '/rps', label: 'nav.rps', icon: Hand, end: true },
];

export const LangToggle: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
      title="Tiếng Việt / English"
      className={`flex items-center gap-1.5 rounded-full border border-gray-700/50 bg-gray-800/80 hover:bg-gray-700 font-black transition-colors ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs'}`}
    >
      <Languages className="w-4 h-4 text-indigo-300" />
      <span className={lang === 'vi' ? 'text-white' : 'text-gray-500'}>VI</span>
      <span className="text-gray-600">|</span>
      <span className={lang === 'en' ? 'text-white' : 'text-gray-500'}>EN</span>
    </button>
  );
};

export const AppShell: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white font-sans overflow-x-hidden flex">
      {/* Thanh điều hướng DỌC (style Dashboard) */}
      <aside className="sticky top-0 h-screen z-50 backdrop-blur-md bg-gray-900/70 border-r border-gray-700/50 w-16 lg:w-60 flex-shrink-0 flex flex-col py-4 px-2 lg:px-4 gap-2 shadow-xl">
        <div className="flex items-center gap-3 cursor-pointer px-1 lg:px-2 pb-4 border-b border-gray-700/50" onClick={() => navigate('/dashboard')}>
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-purple-500/20 flex-shrink-0">
            <Gamepad2 className="w-6 h-6 text-white" />
          </div>
          <div className="hidden lg:block">
            <h1 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 tracking-tight leading-none">
              OmniDeck Arena
            </h1>
            <p className="text-[11px] text-gray-400 font-medium mt-1">{t('nav.tagline')}</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1.5 overflow-y-auto flex-grow py-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const label = t(tab.label);
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                title={label}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-transparent shadow-lg shadow-purple-500/20'
                      : 'bg-transparent text-gray-300 border-transparent hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0 mx-auto lg:mx-0" />
                <span className="hidden lg:inline">{label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="pt-3 border-t border-gray-700/50 hidden lg:flex items-center gap-2 text-[11px] text-gray-400">
          <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          {user ? (
            <span>{t('nav.statsLine')}: <strong className="text-white">{user.stats?.totalWins || 0} / {user.stats?.totalGames || 0}</strong></span>
          ) : (
            <span>{t('nav.instant')}</span>
          )}
        </div>
      </aside>

      {/* Cột nội dung: topbar + trang */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar — toggle ngôn ngữ + đăng nhập/đăng ký & số tiền BÊN PHẢI */}
        <header className="sticky top-0 z-40 backdrop-blur-md bg-gray-900/60 border-b border-gray-700/50 px-4 sm:px-6 py-3 flex items-center justify-end gap-2 sm:gap-3 shadow-lg">
          <LangToggle />
          {user ? (
            <>
              <div className="flex items-center gap-2 bg-gray-800/80 px-4 py-2 rounded-full border border-gray-700/50 shadow-inner">
                <Coins className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-yellow-400">{user.balance.toLocaleString('vi-VN')} 🪙</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center font-bold shadow-md border-2 border-indigo-400">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="font-semibold text-xs leading-tight text-gray-100">{user.displayName}</span>
                  <span className="text-[11px] text-indigo-300">@{user.username}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors"
                  title={t('top.logout')}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => openAuth('login')}
                className="px-5 py-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700 text-sm font-bold flex items-center gap-1.5 transition-all"
              >
                <User className="w-4 h-4 text-indigo-400" />
                {t('top.login')}
              </button>
              <button
                onClick={() => openAuth('register')}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
              >
                <UserPlus className="w-4 h-4" />
                {t('top.register')}
              </button>
            </>
          )}
        </header>

        <main className="flex-grow w-full px-4 sm:px-6 pt-6 pb-8">
          <Outlet />
        </main>
      </div>

      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} initialMode={authMode} onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
};

export default AppShell;
