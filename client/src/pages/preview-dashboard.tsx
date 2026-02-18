import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Bell, Clock, MapPin, Newspaper, ExternalLink, UserCheck, Home as HomeIcon, Image, Trophy, Users, Activity, ChevronRight } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { parseLocalDate } from "@/lib/dateUtils";
import type { Game, NewsArticle, Photo } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/Untitled_design_1771440870559.png";
import heroStaticUrl from "@assets/Gemini_Generated_Image_uyffn8uyffn8uyff_1771441141726.png";

const sportColors: Record<string, string> = {
  "Football": "hsl(210, 85%, 35%)",
  "Boys Basketball": "hsl(150, 60%, 45%)",
  "Girls Basketball": "hsl(25, 75%, 50%)",
  "Volleyball": "hsl(340, 70%, 55%)",
  "Boys Hockey": "hsl(195, 80%, 40%)",
  "Girls Ice Hockey": "hsl(330, 70%, 55%)",
  "Basketball": "hsl(150, 60%, 45%)",
  "Hockey": "hsl(195, 80%, 40%)",
  "Soccer": "hsl(25, 75%, 50%)",
};

const getSportColor = (sport: string) => sportColors[sport] || "hsl(210, 15%, 50%)";

export default function PreviewDashboard() {
  const [goingGames, setGoingGames] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: games = [], isLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const { data: newsArticles = [] } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news"],
  });

  const { data: photos = [] } = useQuery<Photo[]>({
    queryKey: ["/api/photos"],
  });

  useEffect(() => {
    const stored = localStorage.getItem("goingGames");
    if (stored) {
      setGoingGames(new Set(JSON.parse(stored)));
    }
  }, []);

  const attendanceMutation = useMutation({
    mutationFn: async (gameId: string) => {
      const response = await apiRequest(`/api/games/${gameId}/attendance`, { method: "POST" });
      return response.json();
    },
    onSuccess: (data, gameId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      const newGoingGames = new Set(goingGames);
      newGoingGames.add(gameId);
      setGoingGames(newGoingGames);
      localStorage.setItem("goingGames", JSON.stringify(Array.from(newGoingGames)));
      toast({
        title: "You're going!",
        description: "We've added you to the attendance count.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update attendance. Please try again.",
        variant: "destructive",
      });
    },
  });

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const allUpcomingGames = useMemo(() =>
    games
      .filter((game) => parseLocalDate(game.date) >= now && !game.final)
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()),
    [games]
  );

  const recentResults = useMemo(() =>
    games
      .filter((game) => game.final)
      .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
      .slice(0, 6),
    [games]
  );

  const wins = recentResults.filter(g => {
    if (g.homeScore == null || g.awayScore == null) return false;
    return g.isHome === "home" ? g.homeScore > g.awayScore : g.awayScore > g.homeScore;
  }).length;

  const losses = recentResults.filter(g => {
    if (g.homeScore == null || g.awayScore == null) return false;
    return g.isHome === "home" ? g.homeScore < g.awayScore : g.awayScore < g.homeScore;
  }).length;

  const uniqueSports = new Set(games.map(g => g.sport)).size;
  const nextGame = allUpcomingGames[0];
  const daysUntilNext = nextGame ? differenceInDays(parseLocalDate(nextGame.date), now) : null;

  const latestResult = recentResults[0];
  const latestLakersScore = latestResult ? (latestResult.isHome === "home" ? latestResult.homeScore : latestResult.awayScore) : null;
  const latestOpponentScore = latestResult ? (latestResult.isHome === "home" ? latestResult.awayScore : latestResult.homeScore) : null;

  return (
    <div className="min-h-screen bg-[#000814] text-white font-sans">
      <nav className="flex items-center justify-between gap-3 px-4 md:px-8 py-4 border-b border-white/5 bg-[#000814]/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3 transition-opacity" data-testid="link-dashboard-banner-home">
          <div className="h-12 w-12 md:h-14 md:w-14 bg-[#002366] border-2 border-[#4CBB17] rounded-lg flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(76,187,23,0.3)]">
            <img src={logoUrl} alt="CHS Lakers" className="h-10 w-10 md:h-12 md:w-12 object-contain" data-testid="img-dashboard-logo" />
          </div>
          <span className="font-black italic tracking-tighter text-xl md:text-2xl" data-testid="text-dashboard-header">
            LAKER<span className="text-[#4CBB17]">NATION</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 md:gap-6">
          <div className="hidden md:flex gap-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <Link href="/" className="text-[#4CBB17]" data-testid="link-dashboard-home">Dashboard</Link>
            <Link href="/schedule" className="hover:text-white transition" data-testid="link-dashboard-schedule">Schedules</Link>
            <Link href="/gallery" className="hover:text-white transition" data-testid="link-dashboard-gallery">Gallery</Link>
          </div>
          <Link href="/subscribe">
            <Button variant="outline" className="bg-white/5 border-white/10 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-full" data-testid="button-dashboard-notifications">
              <Bell className="mr-2 h-3 w-3" />
              <span className="hidden md:inline">Get Alerts</span>
              <span className="md:hidden">Alerts</span>
            </Button>
          </Link>
          <div className="flex md:hidden gap-1">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-slate-400" data-testid="link-dashboard-home-mobile">
                <HomeIcon className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/schedule">
              <Button variant="ghost" size="icon" className="text-slate-400" data-testid="link-dashboard-schedule-mobile">
                <Calendar className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/gallery">
              <Button variant="ghost" size="icon" className="text-slate-400" data-testid="link-dashboard-gallery-mobile">
                <Image className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {nextGame ? (
          <div className="relative group overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-[#001D4D] border border-white/10 h-[300px] md:h-[420px] flex items-center" data-testid="card-dashboard-featured">
            <div className="absolute inset-0 bg-gradient-to-r from-[#000814] via-[#000814]/60 to-transparent z-10" />
            <img
              src={heroStaticUrl}
              alt="Lakers Athletics"
              className="absolute right-0 top-0 h-full w-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700"
            />
            <div className="relative z-20 pl-6 md:pl-12 space-y-3 md:space-y-4 max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4CBB17] text-black rounded-full text-[10px] font-black uppercase tracking-widest">
                <span className="w-2 h-2 bg-black rounded-full animate-pulse" />
                {daysUntilNext === 0 ? "Game Day" : daysUntilNext === 1 ? "Tomorrow" : `In ${daysUntilNext} Days`}
              </div>
              <h1 className="text-4xl md:text-7xl font-black italic uppercase leading-none tracking-tighter" data-testid="text-dashboard-featured-title">
                Lakers <br /><span className="text-[#4CBB17]">{nextGame.isHome === "home" ? "vs" : "@"}</span> {nextGame.opponent}
              </h1>
              <p className="text-base md:text-xl text-slate-300 font-medium" data-testid="text-dashboard-featured-details">
                {nextGame.sport} &bull; {nextGame.location} &bull; {nextGame.time}
              </p>
              <div className="flex flex-wrap gap-3 pt-2 md:pt-4">
                <Button
                  className="bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-xl"
                  onClick={() => {
                    if (!goingGames.has(nextGame.id)) {
                      attendanceMutation.mutate(nextGame.id);
                    }
                  }}
                  disabled={goingGames.has(nextGame.id) || attendanceMutation.isPending}
                  data-testid="button-dashboard-featured-going"
                >
                  {goingGames.has(nextGame.id) ? "You're Going!" : "I'm Going"}
                </Button>
                <Link href="/schedule">
                  <Button variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 text-white font-black uppercase text-[10px] tracking-widest rounded-xl" data-testid="button-dashboard-featured-details">
                    Game Details
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[2rem] md:rounded-[2.5rem] bg-[#001D4D] border border-white/10 p-10 md:p-16 text-center" data-testid="card-dashboard-featured-empty">
            <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter mb-2">
              LAKER<span className="text-[#4CBB17]">NATION</span>
            </h1>
            <p className="text-slate-400 text-lg">Colchester High School Athletics</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-5 md:mt-6">
          <div className="bg-white/5 border border-white/10 p-5 md:p-6 rounded-2xl" data-testid="card-stat-upcoming">
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-3">Upcoming</p>
            <p className="text-3xl md:text-4xl font-black italic text-white">{allUpcomingGames.length}</p>
            <p className="text-xs text-slate-500 mt-1">games scheduled</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 md:p-6 rounded-2xl" data-testid="card-stat-record">
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-3">Record</p>
            <p className="text-3xl md:text-4xl font-black italic">
              <span className="text-[#4CBB17]">{wins}</span>
              <span className="text-slate-600">-</span>
              <span className="text-white">{losses}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">win-loss</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 md:p-6 rounded-2xl" data-testid="card-stat-sports">
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-3">Active</p>
            <p className="text-3xl md:text-4xl font-black italic text-white">{uniqueSports}</p>
            <p className="text-xs text-slate-500 mt-1">sports</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 md:p-6 rounded-2xl" data-testid="card-stat-next-game">
            <p className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-3">Next Game</p>
            <p className="text-3xl md:text-4xl font-black italic text-[#4CBB17]">
              {daysUntilNext != null ? (daysUntilNext === 0 ? "NOW" : `${daysUntilNext}d`) : "--"}
            </p>
            <p className="text-xs text-slate-500 mt-1">{daysUntilNext === 0 ? "game day" : "countdown"}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6 mt-5 md:mt-6">
          {latestResult && (
            <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-2xl transition-colors" data-testid="card-dashboard-latest-result">
              <h3 className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-5">Latest Result</h3>
              <div className="flex justify-between gap-2 items-center font-black italic text-xl md:text-2xl uppercase">
                <span>Lakers</span>
                <span className="text-[#4CBB17]">{latestLakersScore}</span>
              </div>
              <div className="flex justify-between gap-2 items-center font-black italic text-xl md:text-2xl uppercase opacity-40 mt-1">
                <span className="truncate">{latestResult.opponent}</span>
                <span>{latestOpponentScore}</span>
              </div>
              <div className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                {latestResult.sport} &bull; Final
              </div>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-2xl" data-testid="card-dashboard-upcoming-compact">
            <h3 className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-5">Next Up</h3>
            {allUpcomingGames.slice(0, 3).map((game) => (
              <div key={game.id} className="flex items-center justify-between gap-2 py-2 border-b border-white/5 last:border-b-0" data-testid={`row-dashboard-upcoming-${game.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{game.isHome === "home" ? "vs" : "@"} {game.opponent}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide">{game.sport}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-slate-300">{format(parseLocalDate(game.date), "MMM d")}</p>
                  <p className="text-[10px] text-slate-500">{game.time}</p>
                </div>
              </div>
            ))}
            <Link href="/schedule" className="block mt-4">
              <Button variant="outline" size="sm" className="w-full bg-white/5 border-white/10 text-slate-300 font-black uppercase text-[10px] tracking-widest rounded-xl" data-testid="button-dashboard-view-schedule">
                All Games
                <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-2xl" data-testid="card-dashboard-news">
            <h3 className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-5">News</h3>
            {newsArticles.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No news yet</p>
            ) : (
              <div className="space-y-3">
                {newsArticles.slice(0, 3).map((article, idx) => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block py-2 border-b border-white/5 last:border-b-0 group"
                    data-testid={`link-dashboard-news-${idx}`}
                  >
                    <p className="text-sm font-medium text-slate-200 line-clamp-2 group-hover:text-[#4CBB17] transition-colors">{article.title}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">
                      Burlington Free Press
                      {article.publishedAt && ` \u2022 ${new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {recentResults.length > 1 && (
          <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-2xl mt-5 md:mt-6" data-testid="card-dashboard-results">
            <h3 className="text-slate-500 font-black uppercase text-[10px] tracking-widest mb-5">Recent Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentResults.slice(1, 5).map((game) => {
                const lakersScore = game.isHome === "home" ? game.homeScore : game.awayScore;
                const opponentScore = game.isHome === "home" ? game.awayScore : game.homeScore;
                const isWin = lakersScore != null && opponentScore != null && lakersScore > opponentScore;
                return (
                  <div
                    key={game.id}
                    className="flex items-center justify-between gap-3 py-3 px-4 bg-white/[0.03] rounded-xl border border-white/5"
                    data-testid={`row-dashboard-result-${game.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-1 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: isWin ? '#4CBB17' : 'rgba(255,255,255,0.15)' }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">
                          {game.isHome === "home" ? "vs" : "@"} {game.opponent}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{game.sport}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-lg font-black italic" data-testid={`text-dashboard-score-${game.id}`}>
                        <span className={isWin ? "text-[#4CBB17]" : "text-white"}>{lakersScore}</span>
                        <span className="text-slate-600">-</span>
                        <span className="text-slate-400">{opponentScore}</span>
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isWin ? 'bg-[#4CBB17]/20 text-[#4CBB17]' : 'bg-white/5 text-slate-500'}`} data-testid={`badge-dashboard-result-${game.id}`}>
                        {isWin ? "W" : "L"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-r from-[#002366] to-[#001D4D] border border-[#4CBB17]/30 mt-8 md:mt-10 p-8 md:p-12 text-center" data-testid="card-dashboard-cta">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(76,187,23,0.15),_transparent_70%)]" />
          <div className="relative z-10">
            <Bell className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-[#4CBB17]" />
            <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter mb-3">Never Miss a Game</h3>
            <p className="text-base md:text-lg text-slate-300 mb-6 max-w-2xl mx-auto">
              Get notifications 24 hours before each game and on game day morning.
            </p>
            <Link href="/subscribe">
              <Button className="bg-[#4CBB17] text-black font-black uppercase text-xs tracking-widest rounded-xl" size="lg" data-testid="button-dashboard-subscribe-cta">
                <Bell className="mr-2 h-4 w-4" />
                Subscribe Now
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            &copy; 2025 CHS Laker Nation &bull; Go Lakers!
          </p>
        </div>
      </footer>
    </div>
  );
}
