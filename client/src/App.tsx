import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { LobbyView } from './components/lobby/LobbyView';
import { TableView } from './components/table/TableView';
import { useGameSocket } from './hooks/useGameSocket';

const GameContent: React.FC = () => {
  const {
    connected,
    room,
    player,
    gameState,
    seeFutureCards,
    setSeeFutureCards,
    errorMsg,
    createRoom,
    joinRoom,
    addBot,
    removeBot,
    updateSettings,
    setReady,
    startGame,
    restartGame,
    sendAction,
    sendChatMessage,
    leaveRoom
  } = useGameSocket();

  // If in game:
  if (room && room.inGame) {
    // If gameState or player is still synchronizing from server, display loading spinner instead of falling back to lobby
    if (!gameState || !player) {
      return (
        <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4 font-['Outfit',sans-serif]">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xl font-bold tracking-wide animate-pulse">Đang tải ván chơi...</p>
        </div>
      );
    }

    return (
      <TableView
        room={room}
        player={player}
        gameState={gameState}
        seeFutureCards={seeFutureCards}
        onCloseSeeFuture={() => setSeeFutureCards(null)}
        onSendAction={sendAction}
        onRestartGame={restartGame}
        onLeaveRoom={leaveRoom}
        onSendMessage={sendChatMessage}
      />
    );
  }

  // Otherwise render LobbyView (Join/Create or Room Lobby)
  return (
    <LobbyView
      room={room}
      player={player}
      connected={connected}
      onCreateRoom={createRoom}
      onJoinRoom={joinRoom}
      onAddBot={addBot}
      onRemoveBot={removeBot}
      onUpdateSettings={updateSettings}
      onSetReady={setReady}
      onStartGame={startGame}
      onLeaveRoom={leaveRoom}
      onSendMessage={sendChatMessage}
      errorMsg={errorMsg}
    />
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <GameContent />
    </AuthProvider>
  );
};

export default App;
