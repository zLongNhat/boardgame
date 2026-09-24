import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GameSocketProvider } from './hooks/GameSocketContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LanguageProvider } from './i18n/LanguageContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { PlayPage } from './pages/PlayPage';
import { RoomPage } from './pages/RoomPage';
import { HustlePage } from './pages/HustlePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { TaiXiuPage } from './pages/TaiXiuPage';
import { MinesPage } from './pages/MinesPage';
import { GoalsPage } from './pages/GoalsPage';
import { RoulettePage, AviatorPage, ChickenPage, HiloPage, CoinflipPage, RpsPage } from './pages/CasinoPages';
import { CasesPage } from './pages/CasesPage';
import { UpgradePage } from './pages/UpgradePage';
import { InventoryPage } from './pages/InventoryPage';
import { BattlePage } from './pages/BattlePage';

/**
 * OmniDeck Arena — URL Router.
 * - /dashboard ......... Navigation Panel (trung tâm mọi dịch vụ)
 * - /play .............. Vào Phòng Đấu (tạo/vào phòng cược)
 * - /room/:roomId ...... Phòng chờ + bàn đấu (mã phòng)
 * - /room?id=XXX ....... Deep-link phòng (query)
 * - /room-id?id=XXX .... Alias đúng yêu cầu /room-id=?
 * - /hustle ............ Đi Làm kiếm coins
 * - /leaderboard ....... Bảng xếp hạng
 * - /cases ............. Mở Hòm CS2
 * - /upgrade ........... Nâng Cấp SkinClub
 * - /inventory ......... Kho Đồ Skin
 * - /tai-xiu /mines /goals ... Casino minh bạch
 */
export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <LanguageProvider>
      <AuthProvider>
        <GameSocketProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/play" element={<PlayPage />} />
              <Route path="/room" element={<RoomPage />} />
              <Route path="/room/:roomId" element={<RoomPage />} />
              <Route path="/room-id" element={<RoomPage />} />
              <Route path="/hustle" element={<HustlePage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/cases" element={<CasesPage />} />
              <Route path="/battles" element={<BattlePage />} />
              <Route path="/battles/:id" element={<BattlePage />} />
              <Route path="/upgrade" element={<UpgradePage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              {/* Giữ tương thích điều hướng cũ */}
              <Route path="/lobby" element={<Navigate to="/play" replace />} />
              <Route path="/work" element={<Navigate to="/hustle" replace />} />
              {/* Arena trong cùng khung Navigation Panel để tab sáng đúng */}
              <Route path="/tai-xiu" element={<TaiXiuPage />} />
              <Route path="/mines" element={<MinesPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/roulette" element={<RoulettePage />} />
              <Route path="/aviator" element={<AviatorPage />} />
              <Route path="/chicken" element={<ChickenPage />} />
              <Route path="/hilo" element={<HiloPage />} />
              <Route path="/coinflip" element={<CoinflipPage />} />
              <Route path="/rps" element={<RpsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </GameSocketProvider>
    </AuthProvider>
      </LanguageProvider>
  </ErrorBoundary>
  );
};

export default App;
