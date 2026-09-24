import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BattleLobbyView } from '../components/cases/BattleLobbyView';
import { BattleArenaView } from '../components/cases/BattleArenaView';

export const BattlePage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(params.id || null);

  if (selectedBattleId) {
    return (
      <BattleArenaView
        battleId={selectedBattleId}
        onBack={() => {
          setSelectedBattleId(null);
          navigate('/battles');
        }}
        onOpenInventory={() => navigate('/inventory')}
      />
    );
  }

  return (
    <BattleLobbyView
      onSelectBattle={(bId) => {
        setSelectedBattleId(bId);
        navigate(`/battles/${bId}`);
      }}
    />
  );
};

export default BattlePage;
