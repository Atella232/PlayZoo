import { useEffect } from 'react';
import { AppProvider, useApp } from './lib/store';
import { usePath } from './lib/router';
import { AdHost, TabBar } from './components/common';
import { Welcome } from './screens/Welcome';
import { Home } from './screens/Home';
import { Training } from './screens/Training';
import { GameInfo } from './screens/GameInfo';
import { Play, type PlayMode } from './screens/Play';
import { Ranking } from './screens/Ranking';
import { GroupScreen } from './screens/Group';
import { Profile } from './screens/Profile';
import { Dev } from './screens/Dev';

function Shell() {
  const { ready, me } = useApp();
  const path = usePath();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  if (!ready) return <div className="welcome center"><div className="logo">🦊</div></div>;
  if (!me) return <Welcome />;

  const play = path.match(/^\/jugar\/(ranked|try|train)\/([a-z0-9-]+)$/);
  if (play) return <Play key={play[1] + play[2]} mode={play[1] as PlayMode} id={play[2]} />;

  const info = path.match(/^\/juego\/([a-z0-9-]+)$/);

  return (
    <>
      {path === '/' && <Home />}
      {path === '/entrenar' && <Training />}
      {info && <GameInfo id={info[1]} />}
      {path === '/ranking' && <Ranking />}
      {path === '/grupo' && <GroupScreen />}
      {path === '/perfil' && <Profile />}
      {path === '/dev' && <Dev />}
      <TabBar />
    </>
  );
}

export function App() {
  return (
    <AppProvider>
      <Shell />
      <AdHost />
    </AppProvider>
  );
}
