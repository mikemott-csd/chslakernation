import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Bell, Clock, MapPin, Newspaper, ExternalLink, UserCheck, Home as HomeIcon, Menu, Image, Trophy, Users, Activity } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { parseLocalDate } from "@/lib/dateUtils";
import type { Game, NewsArticle, Photo } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/CHSLakerNation_1770824041645.png";

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(210,20%,98%)] to-white">
      <header className="h-16 md:h-24 bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] flex items-center justify-between gap-2 px-3 md:px-8 shadow-md">
        <Link href="/" className="flex items-center gap-2 md:gap-4 hover:opacity-90 transition-opacity" data-testid="link-dashboard-banner-home">
          <img src={logoUrl} alt="CHS Lakers" className="h-10 md:h-18 w-auto object-contain rounded" data-testid="img-dashboard-logo" />
          <h1 className="text-white text-base md:text-2xl font-bold hidden sm:block" data-testid="text-dashboard-header">
            CHS Laker Nation
          </h1>
          <h1 className="text-white text-base font-bold sm:hidden" data-testid="text-dashboard-header-mobile">
            Lakers
          </h1>
        </Link>
        <nav className="flex gap-1 md:gap-3 items-center">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="link-dashboard-home-mobile">
              <HomeIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white border-white/20 bg-white/10 hidden md:flex" data-testid="link-dashboard-home">
              Home
            </Button>
          </Link>
          <Link href="/schedule">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="link-dashboard-schedule-mobile">
              <Calendar className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white border-white/20 bg-white/10 hidden md:flex" data-testid="link-dashboard-schedule">
              Schedule
            </Button>
          </Link>
          <Link href="/gallery">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="link-dashboard-gallery-mobile">
              <Image className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white border-white/20 bg-white/10 hidden md:flex" data-testid="link-dashboard-gallery">
              Gallery
            </Button>
          </Link>
          <Link href="/subscribe">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="button-dashboard-notifications-mobile">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="outline" className="bg-white/20 backdrop-blur-sm border-white/40 text-white hidden md:flex" data-testid="button-dashboard-notifications">
              <Bell className="mr-2 h-4 w-4" />
              Get Notifications
            </Button>
          </Link>
        </nav>
      </header>

      <section className="bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] py-6 md:py-10 text-center text-white">
        <h2 className="text-2xl md:text-4xl font-bold mb-1" data-testid="text-dashboard-hero-title">Go Lakers!</h2>
        <p className="text-sm md:text-lg opacity-90" data-testid="text-dashboard-hero-subtitle">Colchester High School Athletics Dashboard</p>
      </section>

      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card data-testid="card-stat-upcoming">
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 text-[hsl(210,85%,35%)]" />
              <p className="text-2xl font-bold text-[hsl(215,25%,20%)]">{allUpcomingGames.length}</p>
              <p className="text-xs text-muted-foreground">Upcoming</p>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-record">
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 mx-auto mb-2 text-[hsl(150,60%,45%)]" />
              <p className="text-2xl font-bold text-[hsl(215,25%,20%)]">{wins}-{losses}</p>
              <p className="text-xs text-muted-foreground">Record</p>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-sports">
            <CardContent className="p-4 text-center">
              <Activity className="h-6 w-6 mx-auto mb-2 text-[hsl(340,70%,55%)]" />
              <p className="text-2xl font-bold text-[hsl(215,25%,20%)]">{uniqueSports}</p>
              <p className="text-xs text-muted-foreground">Sports</p>
            </CardContent>
          </Card>
          <Card data-testid="card-stat-next-game">
            <CardContent className="p-4 text-center">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-[hsl(25,75%,50%)]" />
              <p className="text-2xl font-bold text-[hsl(215,25%,20%)]">
                {daysUntilNext != null ? (daysUntilNext === 0 ? "Today" : `${daysUntilNext}d`) : "--"}
              </p>
              <p className="text-xs text-muted-foreground">Next Game</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <Card data-testid="card-dashboard-upcoming">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-[hsl(210,85%,35%)]" />
                <CardTitle className="text-lg">Upcoming Games</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : allUpcomingGames.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming games</p>
              ) : (
                <div className="space-y-2">
                  {allUpcomingGames.slice(0, 8).map((game) => (
                    <div
                      key={game.id}
                      className="flex items-center gap-2 py-2 border-b last:border-b-0"
                      data-testid={`row-dashboard-upcoming-${game.id}`}
                    >
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white flex-shrink-0"
                        style={{ backgroundColor: getSportColor(game.sport) }}
                        data-testid={`badge-dashboard-sport-${game.id}`}
                      >
                        {game.sport}
                      </span>
                      <span className="text-sm font-medium truncate flex-1" data-testid={`text-dashboard-opponent-${game.id}`}>
                        {game.isHome === "home" ? "vs" : "@"} {game.opponent}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {format(parseLocalDate(game.date), "M/d")}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {game.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/schedule" className="block mt-3">
                <Button variant="outline" size="sm" className="w-full" data-testid="button-dashboard-view-schedule">
                  View Full Schedule
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="space-y-4 md:space-y-6">
            <Card data-testid="card-dashboard-results">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-[hsl(150,60%,45%)]" />
                  <CardTitle className="text-lg">Recent Results</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {recentResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No results yet</p>
                ) : (
                  <div className="space-y-2">
                    {recentResults.slice(0, 4).map((game) => {
                      const lakersScore = game.isHome === "home" ? game.homeScore : game.awayScore;
                      const opponentScore = game.isHome === "home" ? game.awayScore : game.homeScore;
                      const isWin = lakersScore != null && opponentScore != null && lakersScore > opponentScore;
                      return (
                        <div
                          key={game.id}
                          className="flex items-center gap-2 py-2 border-b last:border-b-0"
                          data-testid={`row-dashboard-result-${game.id}`}
                        >
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white flex-shrink-0"
                            style={{ backgroundColor: getSportColor(game.sport) }}
                          >
                            {game.sport}
                          </span>
                          <span className="text-sm truncate flex-1">
                            {game.isHome === "home" ? "vs" : "@"} {game.opponent}
                          </span>
                          <span className="text-sm font-bold flex-shrink-0" data-testid={`text-dashboard-score-${game.id}`}>
                            {lakersScore}-{opponentScore}
                          </span>
                          <Badge
                            variant={isWin ? "default" : "secondary"}
                            className="text-xs no-default-active-elevate"
                            data-testid={`badge-dashboard-result-${game.id}`}
                          >
                            {isWin ? "W" : "L"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-dashboard-news">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5 text-[hsl(210,85%,35%)]" />
                  <CardTitle className="text-lg">Latest News</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {newsArticles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No news articles</p>
                ) : (
                  <div className="space-y-2">
                    {newsArticles.slice(0, 4).map((article, idx) => (
                      <a
                        key={article.id}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start justify-between gap-2 py-2 border-b last:border-b-0 text-[hsl(215,25%,20%)] hover:text-[hsl(210,85%,35%)] transition-colors"
                        data-testid={`link-dashboard-news-${idx}`}
                      >
                        <span className="text-sm font-medium line-clamp-2 flex-1">{article.title}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0 mt-1 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <section className="mt-8 md:mt-12">
          <Card className="bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] text-white border-0">
            <CardContent className="p-8 md:p-12 text-center">
              <Bell className="h-16 w-16 mx-auto mb-4" />
              <h3 className="text-2xl md:text-3xl font-bold mb-4">Never Miss a Game</h3>
              <p className="text-lg mb-6 max-w-2xl mx-auto opacity-90">
                Subscribe to get email notifications 24 hours before each game and on game day morning.
                Stay connected with CHS Laker Nation!
              </p>
              <Link href="/subscribe">
                <Button size="lg" variant="outline" className="bg-white text-[hsl(210,85%,35%)] border-white/80 font-semibold" data-testid="button-dashboard-subscribe-cta">
                  <Bell className="mr-2 h-5 w-5" />
                  Subscribe to Notifications
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>

      <footer className="bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] text-white py-8 mt-12 shadow-inner">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm opacity-80">
            &copy; 2025 CHS Laker Nation. Go Lakers!
          </p>
        </div>
      </footer>
    </div>
  );
}
