import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TaiXiuView from '../components/tai-xiu/TaiXiuView';
import { AuthModal } from '../components/auth/AuthModal';
import { useGameSocketContext } from '../hooks/GameSocketContext';
import { useAuth } from '../context/AuthContext';

const Connecting: React.FC = () => (
  <div className="w-full py-24 flex flex-col items-center justify-center text-white gap-4 font-sans">
    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    <p className="font-bold text-gray-300 animate-pulse">Đang kết nối máy chủ...</p>
  </div>
);

export const TaiXiuPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { socket } = useGameSocketContext();
  const [showAuth, setShowAuth] = useState(false);

  const handleBalanceUpdate = useCallback((_b: number) => refreshUser(), [refreshUser]);

  if (!socket) return <Connecting />;

  return (
    <>
      {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}
      <TaiXiuView
        user={user}
        socket={socket}
        onBack={() => navigate('/dashboard')}
        onBalanceUpdate={handleBalanceUpdate}
        onOpenAuth={() => setShowAuth(true)}
      />
    </>
  );
};

export default TaiXiuPage;
