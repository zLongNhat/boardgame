import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthModal } from '../components/auth/AuthModal';
import { useGameSocketContext } from '../hooks/GameSocketContext';
import { useAuth } from '../context/AuthContext';
import { RouletteView } from '../components/casino/RouletteView';
import { AviatorView } from '../components/casino/AviatorView';
import { ChickenView } from '../components/casino/ChickenView';
import { HiloView } from '../components/casino/HiloView';
import { CoinflipView } from '../components/casino/CoinflipView';
import { RpsView } from '../components/casino/RpsView';

const Connecting: React.FC = () => (
  <div className="w-full py-24 flex flex-col items-center justify-center text-white gap-4 font-sans">
    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    <p className="font-bold text-gray-300 animate-pulse">Đang kết nối máy chủ...</p>
  </div>
);

function useCasinoPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { socket } = useGameSocketContext();
  const [showAuth, setShowAuth] = useState(false);
  const handleBalanceUpdate = useCallback((_b: number) => refreshUser(), [refreshUser]);
  return {
    user, socket, showAuth, setShowAuth, handleBalanceUpdate,
    back: () => navigate('/dashboard'),
    openAuth: () => setShowAuth(true),
  };
}

const wrap = (View: React.ComponentType<any>) => {
  const Page: React.FC = () => {
    const p = useCasinoPage();
    if (!p.socket) return <Connecting />;
    return (
      <>
        {p.showAuth && <AuthModal isOpen={p.showAuth} onClose={() => p.setShowAuth(false)} />}
        <View user={p.user} socket={p.socket} onBack={p.back} onBalanceUpdate={p.handleBalanceUpdate} onOpenAuth={p.openAuth} />
      </>
    );
  };
  return Page;
};

export const RoulettePage = wrap(RouletteView);
export const AviatorPage = wrap(AviatorView);
export const ChickenPage = wrap(ChickenView);
export const HiloPage = wrap(HiloView);
export const CoinflipPage = wrap(CoinflipView);
export const RpsPage = wrap(RpsView);
