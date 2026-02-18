import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Bell, Clock, MapPin, Newspaper, ExternalLink, UserCheck, Home as HomeIcon, Image, Trophy } from "lucide-react";
import { format } from "date-fns";
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

const ALL_SPORTS = ["Football", "Boys Basketball", "Girls Basketball", "Volleyball", "Boys Hockey", "Girls Ice Hockey"];

type FeedItem = {
  type: "result" | "upcoming" | "news";
  sortDate: number;
  game?: Game;
  article?: NewsArticle;
};

export default function PreviewFeed() {
  const [goingGames, setGoingGames] = useState<Set<string>>(new Set());
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
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

  const feedItems = useMemo(() => {
    const items: FeedItem[] = [];

    const filteredGames = selectedSport
      ? games.filter(g => g.sport === selectedSport)
      : games;

    filteredGames
      .filter(g => g.final)
      .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
      .slice(0, 6)
      .forEach(game => {
        items.push({
          type: "result",
          sortDate: parseLocalDate(game.date).getTime(),
          game,
        });
      });

    filteredGames
      .filter(g => parseLocalDate(g.date) >= now && !g.final)
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime())
      .slice(0, 6)
      .forEach(game => {
        items.push({
          type: "upcoming",
          sortDate: parseLocalDate(game.date).getTime(),
          game,
        });
      });

    if (!selectedSport) {
      newsArticles.slice(0, 5).forEach(article => {
        items.push({
          type: "news",
          sortDate: article.publishedAt ? new Date(article.publishedAt).getTime() : 0,
          article,
        });
      });
    }

    items.sort((a, b) => {
      if (a.type === "upcoming" && b.type !== "upcoming") return -1;
      if (b.type === "upcoming" && a.type !== "upcoming") return 1;
      if (a.type === "result" && b.type === "news") return -1;
      if (b.type === "result" && a.type === "news") return 1;
      return b.sortDate - a.sortDate;
    });

    return items;
  }, [games, newsArticles, selectedSport]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(210,20%,98%)] to-white">
      <header className="h-16 md:h-24 bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] flex items-center justify-between gap-2 px-3 md:px-8 shadow-md">
        <Link href="/" className="flex items-center gap-2 md:gap-4 hover:opacity-90 transition-opacity" data-testid="link-feed-banner-home">
          <img src={logoUrl} alt="CHS Lakers" className="h-10 md:h-18 w-auto object-contain rounded" data-testid="img-feed-logo" />
          <h1 className="text-white text-base md:text-2xl font-bold hidden sm:block" data-testid="text-feed-header">
            CHS Laker Nation
          </h1>
          <h1 className="text-white text-base font-bold sm:hidden" data-testid="text-feed-header-mobile">
            Lakers
          </h1>
        </Link>
        <nav className="flex gap-1 md:gap-3 items-center">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="link-feed-home-mobile">
              <HomeIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white border-white/20 bg-white/10 hidden md:flex" data-testid="link-feed-home">
              Home
            </Button>
          </Link>
          <Link href="/schedule">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="link-feed-schedule-mobile">
              <Calendar className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white border-white/20 bg-white/10 hidden md:flex" data-testid="link-feed-schedule">
              Schedule
            </Button>
          </Link>
          <Link href="/gallery">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="link-feed-gallery-mobile">
              <Image className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white border-white/20 bg-white/10 hidden md:flex" data-testid="link-feed-gallery">
              Gallery
            </Button>
          </Link>
          <Link href="/subscribe">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="button-feed-notifications-mobile">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="outline" className="bg-white/20 backdrop-blur-sm border-white/40 text-white hidden md:flex" data-testid="button-feed-notifications">
              <Bell className="mr-2 h-4 w-4" />
              Get Notifications
            </Button>
          </Link>
        </nav>
      </header>

      <section className="bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] py-4 md:py-6 text-center text-white">
        <h2 className="text-xl md:text-3xl font-bold mb-1" data-testid="text-feed-hero-title">Go Lakers!</h2>
        <p className="text-xs md:text-sm opacity-90" data-testid="text-feed-hero-subtitle">Colchester High School Athletics Feed</p>
      </section>

      <div className="container mx-auto px-3 md:px-4 py-4 md:py-6 max-w-2xl">
        <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
          <Button
            size="sm"
            variant={selectedSport === null ? "default" : "outline"}
            onClick={() => setSelectedSport(null)}
            data-testid="button-feed-filter-all"
          >
            All Sports
          </Button>
          {ALL_SPORTS.map((sport) => (
            <Button
              key={sport}
              size="sm"
              variant={selectedSport === sport ? "default" : "outline"}
              onClick={() => setSelectedSport(selectedSport === sport ? null : sport)}
              data-testid={`button-feed-filter-${sport.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {sport}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Loading feed...
            </CardContent>
          </Card>
        ) : feedItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No items to display
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {feedItems.map((item, idx) => {
              if (item.type === "result" && item.game) {
                const game = item.game;
                const lakersScore = game.isHome === "home" ? game.homeScore : game.awayScore;
                const opponentScore = game.isHome === "home" ? game.awayScore : game.homeScore;
                const isWin = lakersScore != null && opponentScore != null && lakersScore > opponentScore;
                return (
                  <Card key={`result-${game.id}`} data-testid={`feed-result-${game.id}`}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <Trophy className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white flex-shrink-0"
                        style={{ backgroundColor: getSportColor(game.sport) }}
                      >
                        {game.sport}
                      </span>
                      <span className="text-sm flex-1 truncate">
                        {game.isHome === "home" ? "vs" : "@"} {game.opponent}
                      </span>
                      <span className="text-sm font-bold flex-shrink-0" data-testid={`text-feed-score-${game.id}`}>
                        {lakersScore}-{opponentScore}
                      </span>
                      <Badge
                        variant={isWin ? "default" : "secondary"}
                        className="text-xs no-default-active-elevate"
                        data-testid={`badge-feed-result-${game.id}`}
                      >
                        {isWin ? "W" : "L"}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              }

              if (item.type === "upcoming" && item.game) {
                const game = item.game;
                return (
                  <Card key={`upcoming-${game.id}`} data-testid={`feed-upcoming-${game.id}`}>
                    <CardContent className="flex items-center gap-3 p-3">
                      <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white flex-shrink-0"
                        style={{ backgroundColor: getSportColor(game.sport) }}
                        data-testid={`badge-feed-sport-${game.id}`}
                      >
                        {game.sport}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`text-feed-opponent-${game.id}`}>
                          {game.isHome === "home" ? "vs" : "@"} {game.opponent}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {format(parseLocalDate(game.date), "MMM d")} · {game.time} · {game.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground hidden sm:inline" data-testid={`text-feed-attendance-${game.id}`}>
                          <UserCheck className="h-3 w-3 inline mr-0.5" />{game.attendanceCount}
                        </span>
                        <Button
                          size="sm"
                          variant={goingGames.has(game.id) ? "secondary" : "default"}
                          onClick={() => attendanceMutation.mutate(game.id)}
                          disabled={goingGames.has(game.id) || attendanceMutation.isPending}
                          data-testid={`button-feed-going-${game.id}`}
                        >
                          {goingGames.has(game.id) ? "Going!" : "I'm going"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              if (item.type === "news" && item.article) {
                const article = item.article;
                return (
                  <Card key={`news-${article.id}`} className="hover-elevate" data-testid={`feed-news-${idx}`}>
                    <CardContent className="p-3">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-[hsl(215,25%,20%)] hover:text-[hsl(210,85%,35%)] transition-colors"
                      >
                        <Newspaper className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">{article.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Burlington Free Press
                            {article.publishedAt && ` · ${new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                          </p>
                        </div>
                        <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                      </a>
                    </CardContent>
                  </Card>
                );
              }

              return null;
            })}
          </div>
        )}

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
                <Button size="lg" variant="outline" className="bg-white text-[hsl(210,85%,35%)] border-white/80 font-semibold" data-testid="button-feed-subscribe-cta">
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
