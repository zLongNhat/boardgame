import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { SlotsHubView } from '../components/slots/SlotsHubView';
import { WildBountySlot } from '../components/slots/WildBountySlot';

export const SlotsPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const handleSelectGame = (gameId: string) => {
    navigate(`/slots/${gameId}`);
  };

  const handleBackToHub = () => {
    navigate('/slots');
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4">
      {id ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToHub}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white text-xs font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay Lại Sảnh Slot</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PG SOFT™ SLOTS</span>
            </div>
          </div>

          {id === 'wild-bounty-showdown' ? (
            <WildBountySlot />
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p>Trò chơi đang phát triển và sẽ sớm ra mắt!</p>
              <button
                onClick={handleBackToHub}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold"
              >
                Về Sảnh Slot
              </button>
            </div>
          )}
        </div>
      ) : (
        <SlotsHubView onSelectGame={handleSelectGame} />
      )}
    </div>
  );
};
