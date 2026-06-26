import { useEffect } from 'react';
import { useArcade } from './useArcade.ts';
import { HomeScreen } from './components/HomeScreen.tsx';
import { RoomScreen } from './components/RoomScreen.tsx';
import { MuteButton } from './components/MuteButton.tsx';
import { ErrorToast } from './components/ErrorToast.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

export function App() {
  const { state, arcade } = useArcade();

  // On first load, try to resume a room from a saved token.
  useEffect(() => {
    arcade.tryResume();
  }, [arcade]);

  const inRoom = state.code !== null && (state.room !== null || state.status === 'connecting');

  return (
    <div className="app">
      <div className="scanlines" aria-hidden="true" />
      <header className="topbar">
        <h1 className="logo">
          <span className="logo-el">EL</span> <span className="logo-arcade">ARCADE</span>
        </h1>
        <MuteButton />
      </header>

      <main className="stage">
        <ErrorBoundary>{inRoom ? <RoomScreen /> : <HomeScreen />}</ErrorBoundary>
      </main>

      <ErrorToast message={state.error} onDismiss={() => arcade.dismissError()} />
    </div>
  );
}
