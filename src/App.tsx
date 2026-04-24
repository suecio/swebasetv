import { useState } from 'react';
import { Play, Calendar, History, LayoutGrid, MonitorPlay, ChevronLeft, Search } from 'lucide-react';

// --- TYPESCRIPT DEFINITIONS ---
// This tells the app exactly what a "Game" object looks like
type Game = {
  id: string;
  title: string;
  team1: string;
  team2: string;
  status: 'live' | 'upcoming' | 'past';
  videoId: string;
  startTime: string;
  league: string;
};

// --- MOCK DATA ---
const MOCK_GAMES: Game[] = [
  {
    id: 'game1',
    title: 'Stockholm Monarchs vs Leksand Lumberjacks',
    team1: 'Monarchs',
    team2: 'Lumberjacks',
    status: 'live',
    videoId: 'M7lc1UVf-VE',
    startTime: 'Today, 14:00',
    league: 'Elitserien'
  },
  {
    id: 'game2',
    title: 'Sundbyberg Heat vs Sölvesborg Firehawks',
    team1: 'Heat',
    team2: 'Firehawks',
    status: 'live',
    videoId: 'M7lc1UVf-VE', 
    startTime: 'Today, 14:00',
    league: 'Elitserien'
  },
  {
    id: 'game3',
    title: 'Karlskoga Bats vs Rättvik Butchers',
    team1: 'Bats',
    team2: 'Butchers',
    status: 'upcoming',
    videoId: 'M7lc1UVf-VE',
    startTime: 'Tomorrow, 12:00',
    league: 'Elitserien'
  },
  {
    id: 'game4',
    title: 'Gefle BC vs Umeå Blue Sox',
    team1: 'Gefle',
    team2: 'Umeå',
    status: 'past',
    videoId: 'M7lc1UVf-VE',
    startTime: 'Yesterday',
    league: 'Regional'
  }
];

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'watch' | 'multiview'>('home');
  const [activeGame, setActiveGame] = useState<Game | null>(null);

  const liveGames = MOCK_GAMES.filter(g => g.status === 'live');
  const upcomingGames = MOCK_GAMES.filter(g => g.status === 'upcoming');
  const pastGames = MOCK_GAMES.filter(g => g.status === 'past');

  const playVideo = (game: Game) => {
    setActiveGame(game);
    setCurrentView('watch');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans pb-20 md:pb-0 flex flex-col md:flex-row">
      
      {/* Mobile Top Nav */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2 text-blue-500 font-bold text-xl">
          <MonitorPlay size={24} />
          <span>SweBase<span className="text-white">TV</span></span>
        </div>
        <button className="p-2 text-slate-400 hover:text-white" aria-label="Search">
          <Search size={20} />
        </button>
      </div>

      {/* Desktop Sidebar / Mobile Bottom Nav */}
      <nav className="fixed bottom-0 w-full md:w-64 md:relative md:flex-shrink-0 bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 z-50 flex md:flex-col justify-around md:justify-start p-2 md:p-4 gap-2">
        <div className="hidden md:flex items-center gap-2 text-blue-500 font-bold text-2xl mb-8 p-2">
          <MonitorPlay size={28} />
          <span>SweBase<span className="text-white">TV</span></span>
        </div>

        <NavItem icon={<Play />} label="Live & Home" active={currentView === 'home'} onClick={() => setCurrentView('home')} />
        <NavItem icon={<LayoutGrid />} label="Multi-View" active={currentView === 'multiview'} onClick={() => setCurrentView('multiview')} />
        <NavItem icon={<Calendar />} label="Schedule" active={false} onClick={() => alert("Schedule view coming soon!")} />
        <NavItem icon={<History />} label="Archive" active={false} onClick={() => alert("Archive view coming soon!")} />
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto">
        
        {/* HOME VIEW */}
        {currentView === 'home' && (
          <div className="p-4 md:p-8 space-y-8 animate-in fade-in">
            {/* Featured Live */}
            {liveGames.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <h2 className="text-xl font-bold uppercase tracking-wider text-slate-200">Live Now</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {liveGames.map(game => (
                    <GameCard key={game.id} game={game} onClick={() => playVideo(game)} isLarge />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming */}
            <section>
               <div className="flex items-center gap-2 mb-4">
                  <Calendar className="text-blue-400" size={20} />
                  <h2 className="text-xl font-bold uppercase tracking-wider text-slate-200">Upcoming Broadcasts</h2>
                </div>
              <div className="flex overflow-x-auto pb-4 gap-4 snap-x">
                {upcomingGames.map(game => (
                  <div key={game.id} className="min-w-[280px] snap-start">
                    <GameCard game={game} onClick={() => playVideo(game)} />
                  </div>
                ))}
              </div>
            </section>

             {/* Recent/Archive */}
             <section>
               <div className="flex items-center gap-2 mb-4">
                  <History className="text-slate-400" size={20} />
                  <h2 className="text-xl font-bold uppercase tracking-wider text-slate-200">Recently Played</h2>
                </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastGames.map(game => (
                  <GameCard key={game.id} game={game} onClick={() => playVideo(game)} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* WATCH VIEW (Single Game) */}
        {currentView === 'watch' && activeGame && (
          <div className="flex flex-col h-full animate-in slide-in-from-right-4">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center gap-4 sticky top-0 md:top-auto z-40">
              <button 
                onClick={() => setCurrentView('home')}
                className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition"
              >
                <ChevronLeft size={20} />
              </button>
              <div>
                <h2 className="font-bold">{activeGame.title}</h2>
                <p className="text-sm text-slate-400">{activeGame.league} • {activeGame.status === 'live' ? 'Live Now' : activeGame.startTime}</p>
              </div>
            </div>
            
            <div className="w-full aspect-video bg-black flex items-center justify-center relative shadow-2xl">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={`https://www.youtube.com/embed/${activeGame.videoId}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>

            <div className="p-4 md:p-8 flex-1">
               <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
                 <h3 className="text-lg font-bold mb-2">Game Details</h3>
                 <p className="text-slate-400">Match integration, live box scores, and team rosters could be placed here in the future to create a complete second-screen experience.</p>
               </div>
            </div>
          </div>
        )}

        {/* MULTI-VIEW */}
        {currentView === 'multiview' && (
          <div className="p-4 h-full flex flex-col animate-in fade-in">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <LayoutGrid className="text-blue-500" /> Multi-View Dashboard
              </h2>
              <span className="text-sm bg-slate-800 px-3 py-1 rounded-full text-slate-300">Showing {liveGames.length} active streams</span>
            </div>
            
            <div className={`grid gap-2 md:gap-4 flex-1 min-h-[50vh] ${liveGames.length === 1 ? 'grid-cols-1' : liveGames.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2'}`}>
              {liveGames.map((game, idx) => (
                <div key={idx} className="bg-black rounded-lg overflow-hidden relative border border-slate-800 aspect-video group">
                  <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur px-2 py-1 rounded text-xs font-bold text-white flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                    {game.team1} vs {game.team2}
                  </div>
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${game.videoId}?mute=1`}
                    title={game.title}
                    frameBorder="0"
                    allowFullScreen
                  ></iframe>
                </div>
              ))}
              {liveGames.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center text-slate-500 h-64 bg-slate-900 rounded-xl border border-dashed border-slate-700">
                  <MonitorPlay size={48} className="mb-4 opacity-50" />
                  <p>No games are currently live.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

// --- SUBCOMPONENTS ---

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 p-2 md:p-3 rounded-xl transition-all duration-200 w-full ${
        active 
          ? 'text-blue-400 bg-blue-500/10 md:bg-slate-800' 
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
      }`}
    >
      <div className={`${active ? 'scale-110' : ''} transition-transform`}>
        {icon}
      </div>
      <span className="text-[10px] md:text-sm font-medium">{label}</span>
    </button>
  );
}

interface GameCardProps {
  game: Game;
  onClick: () => void;
  isLarge?: boolean;
}

function GameCard({ game, onClick, isLarge = false }: GameCardProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/20"
    >
      <div className={`${isLarge ? 'h-48 md:h-64' : 'h-32'} bg-slate-800 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-100 via-slate-900 to-black"></div>
        
        <div className="absolute top-3 left-3 z-20">
          {game.status === 'live' && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 shadow-lg shadow-red-500/30">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> LIVE
            </span>
          )}
          {game.status === 'upcoming' && (
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
              UPCOMING
            </span>
          )}
          {game.status === 'past' && (
            <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded shadow-lg">
              FINAL
            </span>
          )}
        </div>

        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-blue-500/80 backdrop-blur-sm p-4 rounded-full text-white transform scale-90 group-hover:scale-100 transition-all shadow-xl">
            <Play fill="currentColor" size={isLarge ? 32 : 24} />
          </div>
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs text-blue-400 font-semibold tracking-wider mb-1">{game.league}</p>
        <h3 className={`font-bold text-slate-100 leading-tight mb-2 ${isLarge ? 'text-xl' : 'text-base'}`}>
          {game.team1} <span className="text-slate-500 font-normal">vs</span> {game.team2}
        </h3>
        <p className="text-sm text-slate-400 flex items-center gap-1">
          <Calendar size={14} /> {game.startTime}
        </p>
      </div>
    </div>
  );
}
