import { useState, useEffect } from 'react';
import { Play, Calendar, History, LayoutGrid, MonitorPlay, ChevronLeft, Search, Users, Globe } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query } from 'firebase/firestore';

// --- TRANSLATIONS DICTIONARY ---
const i18n = {
  en: {
    liveNow: "Live Now",
    upcoming: "Upcoming Broadcasts",
    past: "Recently Played",
    home: "Live & Home",
    multiview: "Multi-View Dashboard",
    teams: "Teams",
    schedule: "Schedule",
    archive: "Archive",
    showing: "Showing",
    activeStreams: "active streams",
    noLive: "No games are currently live.",
    gameDetails: "Game Details",
    detailsDesc: "Match integration, live box scores, and team rosters could be placed here in the future.",
    vs: "vs",
    liveBadge: "LIVE",
    upcomingBadge: "UPCOMING",
    finalBadge: "FINAL",
    selectTeam: "Select a Team",
    back: "Back",
    search: "Search"
  },
  sv: {
    liveNow: "Live Just Nu",
    upcoming: "Kommande Sändningar",
    past: "Tidigare Matcher",
    home: "Hem",
    multiview: "Multivy",
    teams: "Lag",
    schedule: "Spelschema",
    archive: "Arkiv",
    showing: "Visar",
    activeStreams: "aktiva sändningar",
    noLive: "Inga matcher sänds just nu.",
    gameDetails: "Matchdetaljer",
    detailsDesc: "Integration av matchhändelser, live-statistik och laguppställningar kan placeras här i framtiden.",
    vs: "mot",
    liveBadge: "LIVE",
    upcomingBadge: "KOMMANDE",
    finalBadge: "SLUT",
    selectTeam: "Välj ett Lag",
    back: "Tillbaka",
    search: "Sök"
  }
};

type Language = 'en' | 'sv';

// --- TYPESCRIPT DEFINITIONS ---
type Game = {
  id: string;
  title: string;
  team1: string;
  team2: string;
  status: 'live' | 'upcoming' | 'past';
  videoId: string;
  startTime: string;
  league: string;
  sport?: 'Baseball' | 'Softball' | 'Unknown';
  season?: string;
};

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCIhHn43vsrzHFOmaTIRE7vWHTptgoWNJ4",
  authDomain: "swebasetv.firebaseapp.com",
  projectId: "swebasetv",
  storageBucket: "swebasetv.firebasestorage.app",
  messagingSenderId: "951909848848",
  appId: "1:951909848848:web:c84ab1c92001bf74a3b795"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function to format the start time based on language
const formatTime = (timeStr: string, lang: Language) => {
  if (timeStr === 'Live Now') return i18n[lang].liveBadge;
  if (timeStr === 'Upcoming') return i18n[lang].upcomingBadge;
  
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr; // Return raw string if not a valid date
    
    // Formats to e.g., "fre 18:00" (SV) or "Fri 6:00 PM" (EN)
    return new Intl.DateTimeFormat(lang === 'sv' ? 'sv-SE' : 'en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(d);
  } catch (e) {
    return timeStr;
  }
};

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'watch' | 'multiview' | 'teams' | 'teamDetail'>('home');
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [language, setLanguage] = useState<Language>('sv'); // Default to Swedish
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const t = i18n[language]; // Quick translation helper

  // Fetch games from Firebase automatically
  useEffect(() => {
    const q = query(collection(db, 'games'));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const gamesData: Game[] = [];
      snapshot.forEach((doc: any) => {
        gamesData.push({ id: doc.id, ...doc.data() } as Game);
      });
      setGames(gamesData);
    });
    return () => unsubscribe();
  }, []);

  // Filter logic
  let displayGames = games;
  if (currentView === 'teamDetail' && selectedTeam) {
    displayGames = games.filter(g => g.team1 === selectedTeam || g.team2 === selectedTeam);
  }

  const liveGames = displayGames.filter(g => g.status === 'live');
  const upcomingGames = displayGames.filter(g => g.status === 'upcoming');
  const pastGames = displayGames.filter(g => g.status === 'past');

  // Extract unique teams for the Teams page
  const uniqueTeams = Array.from(new Set(games.flatMap(g => [g.team1, g.team2]))).filter(t => t && t !== 'TBD');

  const playVideo = (game: Game) => {
    setActiveGame(game);
    setCurrentView('watch');
  };

  const openTeam = (team: string) => {
    setSelectedTeam(team);
    setCurrentView('teamDetail');
  };

  const toggleLanguage = () => setLanguage(prev => prev === 'en' ? 'sv' : 'en');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans pb-20 md:pb-0 flex flex-col md:flex-row">
      
      {/* Mobile Top Nav */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center gap-2 text-blue-500 font-bold text-xl">
          <MonitorPlay size={24} />
          <span>SweDiamond<span className="text-white">TV</span></span>
        </div>
        <div className="flex gap-4">
          <button onClick={toggleLanguage} className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1">
            <Globe size={16} /> {language === 'sv' ? 'EN' : 'SV'}
          </button>
          <button className="text-slate-400 hover:text-white" aria-label="Search"><Search size={20} /></button>
        </div>
      </div>

      {/* Desktop Sidebar / Mobile Bottom Nav */}
      <nav className="fixed bottom-0 w-full md:w-64 md:relative md:flex-shrink-0 bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 z-50 flex md:flex-col justify-around md:justify-start p-2 md:p-4 gap-2">
        <div className="hidden md:flex items-center justify-between mb-8 p-2">
          <div className="flex items-center gap-2 text-blue-500 font-bold text-2xl">
            <MonitorPlay size={28} />
            <span>SweDiamond<span className="text-white">TV</span></span>
          </div>
          <button onClick={toggleLanguage} className="hidden md:flex text-xs font-bold bg-slate-800 px-2 py-1 rounded text-slate-300 hover:bg-slate-700 transition">
            <Globe size={14} className="mr-1 inline" /> {language === 'sv' ? 'EN' : 'SV'}
          </button>
        </div>

        <NavItem icon={<Play />} label={t.home} active={currentView === 'home'} onClick={() => setCurrentView('home')} />
        <NavItem icon={<LayoutGrid />} label={t.multiview} active={currentView === 'multiview'} onClick={() => setCurrentView('multiview')} />
        <NavItem icon={<Users />} label={t.teams} active={currentView === 'teams' || currentView === 'teamDetail'} onClick={() => setCurrentView('teams')} />
        <NavItem icon={<Calendar />} label={t.schedule} active={false} onClick={() => alert("Schedule coming soon")} />
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto">
        
        {/* HOME & TEAM DETAIL VIEW */}
        {(currentView === 'home' || currentView === 'teamDetail') && (
          <div className="p-4 md:p-8 space-y-8 animate-in fade-in">
            
            {currentView === 'teamDetail' && (
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-800">
                <button onClick={() => setCurrentView('teams')} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700"><ChevronLeft size={20} /></button>
                <h1 className="text-3xl font-bold">{selectedTeam}</h1>
              </div>
            )}

            {/* Featured Live */}
            {liveGames.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <h2 className="text-xl font-bold uppercase tracking-wider text-slate-200">{t.liveNow}</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {liveGames.map(game => (
                    <GameCard key={game.id} game={game} lang={language} i18n={t} onClick={() => playVideo(game)} isLarge />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming */}
            {(upcomingGames.length > 0 || currentView === 'home') && (
              <section>
                 <div className="flex items-center gap-2 mb-4">
                    <Calendar className="text-blue-400" size={20} />
                    <h2 className="text-xl font-bold uppercase tracking-wider text-slate-200">{t.upcoming}</h2>
                  </div>
                <div className="flex overflow-x-auto pb-4 gap-4 snap-x">
                  {upcomingGames.map(game => (
                    <div key={game.id} className="min-w-[280px] snap-start">
                      <GameCard game={game} lang={language} i18n={t} onClick={() => playVideo(game)} />
                    </div>
                  ))}
                  {upcomingGames.length === 0 && <p className="text-slate-500 italic">No upcoming games scheduled.</p>}
                </div>
              </section>
            )}

             {/* Recent/Archive */}
             {(pastGames.length > 0 || currentView === 'home') && (
               <section>
                 <div className="flex items-center gap-2 mb-4">
                    <History className="text-slate-400" size={20} />
                    <h2 className="text-xl font-bold uppercase tracking-wider text-slate-200">{t.past}</h2>
                  </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastGames.map(game => (
                    <GameCard key={game.id} game={game} lang={language} i18n={t} onClick={() => playVideo(game)} />
                  ))}
                </div>
              </section>
             )}
          </div>
        )}

        {/* TEAMS DIRECTORY VIEW */}
        {currentView === 'teams' && (
           <div className="p-4 md:p-8 animate-in fade-in">
             <div className="flex items-center gap-2 mb-8">
                <Users className="text-blue-500" size={28} />
                <h1 className="text-3xl font-bold">{t.teams}</h1>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
               {uniqueTeams.map((team, idx) => (
                 <button 
                   key={idx} 
                   onClick={() => openTeam(team)}
                   className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center hover:bg-slate-800 hover:border-blue-500 transition-all shadow-lg group"
                 >
                   <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
                     <Users className="text-slate-500" />
                   </div>
                   <h3 className="font-bold text-slate-200">{team}</h3>
                 </button>
               ))}
             </div>
           </div>
        )}

        {/* WATCH VIEW (Single Game) */}
        {currentView === 'watch' && activeGame && (
          <div className="flex flex-col h-full animate-in slide-in-from-right-4">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center gap-4 sticky top-0 md:top-auto z-40">
              <button onClick={() => setCurrentView('home')} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition">
                <ChevronLeft size={20} />
              </button>
              <div>
                <h2 className="font-bold">{activeGame.title}</h2>
                <p className="text-sm text-slate-400">{activeGame.league} • {activeGame.status === 'live' ? t.liveBadge : formatTime(activeGame.startTime, language)}</p>
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
                 <h3 className="text-lg font-bold mb-2">{t.gameDetails}</h3>
                 <p className="text-slate-400">{t.detailsDesc}</p>
               </div>
            </div>
          </div>
        )}

        {/* MULTI-VIEW */}
        {currentView === 'multiview' && (
          <div className="p-4 h-full flex flex-col animate-in fade-in">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <LayoutGrid className="text-blue-500" /> {t.multiview}
              </h2>
              <span className="text-sm bg-slate-800 px-3 py-1 rounded-full text-slate-300">{t.showing} {liveGames.length} {t.activeStreams}</span>
            </div>
            
            <div className={`grid gap-2 md:gap-4 flex-1 min-h-[50vh] ${liveGames.length === 1 ? 'grid-cols-1' : liveGames.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2'}`}>
              {liveGames.map((game, idx) => (
                <div key={idx} className="bg-black rounded-lg overflow-hidden relative border border-slate-800 aspect-video group">
                  <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur px-2 py-1 rounded text-xs font-bold text-white flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                    {game.team1} {t.vs} {game.team2}
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
                  <p>{t.noLive}</p>
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
  lang: Language;
  i18n: any;
  onClick: () => void;
  isLarge?: boolean;
}

function GameCard({ game, lang, i18n, onClick, isLarge = false }: GameCardProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/20 flex flex-col"
    >
      <div className={`${isLarge ? 'h-48 md:h-64' : 'h-32'} bg-slate-800 relative overflow-hidden shrink-0`}>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-100 via-slate-900 to-black"></div>
        
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-1">
          {game.status === 'live' && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 shadow-lg shadow-red-500/30 w-max">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> {i18n.liveBadge}
            </span>
          )}
          {game.status === 'upcoming' && (
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg w-max">
              {i18n.upcomingBadge}
            </span>
          )}
          {game.status === 'past' && (
            <span className="bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 rounded shadow-lg w-max">
              {i18n.finalBadge}
            </span>
          )}
          {game.sport && (
            <span className="bg-slate-800/80 backdrop-blur text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-600 w-max uppercase tracking-wider">
              {game.sport}
            </span>
          )}
        </div>

        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-blue-500/80 backdrop-blur-sm p-4 rounded-full text-white transform scale-90 group-hover:scale-100 transition-all shadow-xl">
            <Play fill="currentColor" size={isLarge ? 32 : 24} />
          </div>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-1">
          <p className="text-xs text-blue-400 font-semibold tracking-wider">{game.league}</p>
          {game.season && <p className="text-xs text-slate-500 font-medium">{game.season}</p>}
        </div>
        <h3 className={`font-bold text-slate-100 leading-tight mb-2 ${isLarge ? 'text-xl' : 'text-base'}`}>
          {game.team1} <span className="text-slate-500 font-normal">{i18n.vs}</span> {game.team2}
        </h3>
        <div className="mt-auto">
          <p className="text-sm text-slate-400 flex items-center gap-1">
            <Calendar size={14} /> {formatTime(game.startTime, lang)}
          </p>
        </div>
      </div>
    </div>
  );
}
