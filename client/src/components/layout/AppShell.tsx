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
  Package,
  Zap,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../i18n/LanguageContext';
import { DictKey } from '../../i18n/dict';
import { AuthModal } from '../auth/AuthModal';

interface NavItem {
  to: string;
  label: DictKey;
  icon: any;
  end: boolean;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Tổng Quan & Ví',
    items: [
      { to: '/dashboard', label: 'nav.dashboard', icon: LayoutGrid, end: true },
      { to: '/hustle', label: 'nav.hustle', icon: Briefcase, end: true, badge: '3s', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      { to: '/inventory', label: 'nav.inventory', icon: Package, end: true, badge: 'Kho', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      { to: '/leaderboard', label: 'nav.leaderboard', icon: Trophy, end: true },
    ]
  },
  {
    title: 'Đấu Trường Bài',
    items: [
      { to: '/play', label: 'nav.play', icon: Gamepad2, end: false, badge: 'PVP', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' }
    ]
  },
  {
    title: 'Vũ Khí & Nâng Cấp CS2',
    items: [
      { to: '/cases', label: 'nav.cases', icon: Package, end: true, badge: 'CS2', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
      { to: '/upgrade', label: 'nav.upgrade', icon: Zap, end: true, badge: '95%', badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30' }
    ]
  },
  {
    title: 'Casino & Minigames',
    items: [
      { to: '/tai-xiu', label: 'nav.taixiu', icon: Dices, end: true, badge: 'MD5', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      { to: '/mines', label: 'nav.mines', icon: Pickaxe, end: true },
      { to: '/goals', label: 'nav.goals', icon: Target, end: true },
      { to: '/roulette', label: 'nav.roulette', icon: CircleDot, end: true },
      { to: '/aviator', label: 'nav.aviator', icon: Plane, end: true },
      { to: '/chicken', label: 'nav.chicken', icon: Bird, end: true },
      { to: '/hilo', label: 'nav.hilo', icon: ArrowUpDown, end: true },
      { to: '/coinflip', label: 'nav.coinflip', icon: Coins, end: true },
      { to: '/rps', label: 'nav.rps', icon: Hand, end: true },
    ]
  }
];

export const LangToggle: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
      title="Tiếng Việt / English"
      className={`flex items-center gap-1.5 rounded-full border border-gray-700/60 bg-gray-800/80 hover:bg-gray-700 font-black transition-colors ${
        compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs'
      }`}
    >
      <Languages className="w-3.5 h-3.5 text-indigo-300" />
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const inventoryCount = user?.inventory?.length || 0;

  return (
    <div className="h-screen h-[100dvh] w-full bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white font-sans overflow-hidden flex">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Navigation Sidebar (Desktop fixed + Mobile sliding drawer) */}
      <aside
        className={`fixed lg:static top-0 h-full z-50 backdrop-blur-xl bg-gray-950/95 lg:bg-gray-900/80 border-r border-gray-800/80 w-64 flex-shrink-0 flex flex-col py-4 px-3 gap-2 shadow-2xl transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pb-3 border-b border-gray-800/80">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => {
              navigate('/dashboard');
              setMobileMenuOpen(false);
            }}
          >
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-purple-500/20 flex-shrink-0">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 tracking-tight leading-none">
                OmniDeck Arena
              </h1>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">{t('nav.tagline')}</p>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex flex-col gap-4 overflow-y-auto flex-grow py-2 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-800 [&::-webkit-scrollbar-track]:bg-transparent">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className="flex flex-col gap-1">
              <div className="px-3 text-[10px] uppercase font-black tracking-wider text-gray-500 pb-1">
                {section.title}
              </div>
              {section.items.map((tab) => {
                const Icon = tab.icon;
                const label = t(tab.label);
                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    end={tab.end}
                    onClick={() => setMobileMenuOpen(false)}
                    title={label}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white border-transparent shadow-lg shadow-purple-900/30'
                          : 'bg-transparent text-gray-300 border-transparent hover:bg-gray-800/70 hover:text-white'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{label}</span>
                    </div>

                    {tab.badge && (
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border ${
                          tab.badgeColor || 'bg-gray-800 text-gray-400 border-gray-700'
                        }`}
                      >
                        {tab.to === '/inventory' && inventoryCount > 0 ? `${inventoryCount}` : tab.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Stats / Footer in Sidebar */}
        <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between px-2 text-[11px] text-gray-400">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            {user ? (
              <span>Thắng: <strong className="text-white">{user.stats?.totalWins || 0}</strong> ván</span>
            ) : (
              <span>{t('nav.instant')}</span>
            )}
          </div>
          <span className="text-[10px] text-indigo-400 font-bold">v2.5</span>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <header className="flex-shrink-0 z-40 backdrop-blur-md bg-gray-950/80 border-b border-gray-800/80 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-lg">
          {/* Left: Mobile hamburger menu & logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              title="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div
              className="flex items-center gap-2 cursor-pointer lg:hidden"
              onClick={() => navigate('/dashboard')}
            >
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-1.5 rounded-lg">
                <Gamepad2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-sm bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                OmniDeck
              </span>
            </div>
          </div>

          {/* Right: Balance, Inventory, LangToggle, User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LangToggle compact />

            {user ? (
              <>
                {/* Inventory Quick Button */}
                <button
                  onClick={() => navigate('/inventory')}
                  className="flex items-center gap-1.5 bg-gray-900/90 hover:bg-gray-800 border border-gray-800 px-3 py-1.5 rounded-full text-xs font-bold text-gray-200 transition-all cursor-pointer shadow-inner"
                  title="Kho Đồ Cá Nhân"
                >
                  <Package className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden sm:inline">Kho:</span>
                  <span className="text-purple-300 font-black">{inventoryCount}</span>
                </button>

                {/* Coin Balance */}
                <div
                  onClick={() => navigate('/hustle')}
                  className="flex items-center gap-1.5 bg-gray-900/90 hover:bg-gray-800/90 border border-yellow-500/30 px-3.5 py-1.5 rounded-full shadow-inner cursor-pointer transition-colors"
                  title="Đi làm để kiếm thêm xu"
                >
                  <Coins className="w-4 h-4 text-yellow-400 animate-pulse" />
                  <span className="font-black text-xs sm:text-sm text-yellow-400">
                    {user.balance?.toLocaleString('vi-VN') || 0} 🪙
                  </span>
                </div>

                {/* Profile Pill */}
                <div className="flex items-center gap-2 pl-1 border-l border-gray-800">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-xs shadow-md border border-indigo-400">
                    {user.displayName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="font-bold text-xs leading-tight text-gray-200 truncate max-w-[100px]">{user.displayName}</span>
                    <span className="text-[10px] text-indigo-300">@{user.username}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors cursor-pointer"
                    title={t('top.logout')}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuth('login')}
                  className="px-3.5 py-1.5 rounded-full bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('top.login')}</span>
                </button>
                <button
                  onClick={() => openAuth('register')}
                  className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('top.register')}</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto w-full px-4 sm:px-6 pt-6 pb-12">
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
