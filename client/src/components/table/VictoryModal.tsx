import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Crown, RotateCcw, Trophy } from 'lucide-react';
import { sounds } from '../../utils/sound';

interface VictoryModalProps {
  winners: string[];
  players: { id: string; name: string; avatar: string; isBot: boolean }[];
  isHost: boolean;
  onRestartGame: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  winners,
  players,
  isHost,
  onRestartGame
}) => {
  useEffect(() => {
    sounds.playVictory();
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  const winnerPlayer = players.find(p => p.id === winners[0]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-amber-500/10 text-center animate-bounce-short">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
          <Trophy className="w-10 h-10" />
        </div>

        <h2 className="text-3xl font-black bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent mb-1">
          CHIẾN THẮNG!
        </h2>
        <p className="text-slate-400 text-sm mb-6">Trận đấu đã kết thúc!</p>

        {/* Winner Highlight */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6 flex items-center justify-center gap-3">
          <Crown className="w-6 h-6 text-amber-400" />
          <div className="text-left">
            <span className="text-xs text-amber-300 font-bold uppercase tracking-wider block">Nhà Vô Địch</span>
            <span className="text-lg font-black text-white">{winnerPlayer?.name || 'Người Thắng'}</span>
          </div>
        </div>

        {/* Standings List */}
        <div className="space-y-2 mb-6 text-left max-h-40 overflow-y-auto pr-1">
          {winners.map((wid, idx) => {
            const p = players.find(player => player.id === wid);
            return (
              <div
                key={wid}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-400 w-5">#{idx + 1}</span>
                  <span className="font-semibold text-slate-200">{p?.name || 'Người chơi'}</span>
                </div>
                <span className="text-slate-500 text-[11px]">{idx === 0 ? 'Vô Địch' : 'Hoàn Thành'}</span>
              </div>
            );
          })}
        </div>

        {isHost ? (
          <button
            onClick={onRestartGame}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Về Lại Phòng Chờ
          </button>
        ) : (
          <p className="text-xs text-slate-500">Đang chờ chủ phòng quay về phòng chờ...</p>
        )}
      </div>
    </div>
  );
};
