import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Calendar, Bell, Clock, MapPin, Newspaper, ExternalLink, UserCheck, Home as HomeIcon, Menu, Image, Trophy } from "lucide-react";
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

export default function PreviewColumns() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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

  const heroImages = useMemo(() => {
    const validPhotos = photos.filter(photo => photo.googleDriveId);
    if (validPhotos.length > 0) {
      const recentPhotos = [...validPhotos]
        .sort((a, b) => {
          const dateA = a.syncedAt ? new Date(a.syncedAt).getTime() : (a.createdTime ? new Date(a.createdTime).getTime() : 0);
          const dateB = b.syncedAt ? new Date(b.syncedAt).getTime() : (b.createdTime ? new Date(b.createdTime).getTime() : 0);
          return dateB - dateA;
        })
        .slice(0, 10);
      return recentPhotos.map(photo => `/api/photos/${photo.googleDriveId}/image`);
    }
    return [];
  }, [photos]);

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

  useEffect(() => {
    if (heroImages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  useEffect(() => {
    if (currentImageIndex >= heroImages.length && heroImages.length > 0) {
      setCurrentImageIndex(0);
    }
  }, [heroImages.length, currentImageIndex]);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcomingGames = useMemo(() =>
    games
      .filter((game) => parseLocalDate(game.date) >= now && !game.final)
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime())
      .slice(0, 6),
    [games]
  );

  const recentResults = useMemo(() =>
    games
      .filter((game) => game.final)
      .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
      .slice(0, 6),
    [games]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(210,20%,98%)] to-white">
      <header className="h-16 md:h-24 bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] flex items-center justify-between gap-2 px-3 md:px-8 shadow-md">
        <Link href="/" className="flex items-center gap-2 md:gap-4 hover:opacity-90 transition-opacity" data-testid="link-columns-banner-home">
          <img src={logoUrl} alt="CHS Lakers" className="h-10 md:h-18 w-auto object-contain rounded" data-testid="img-columns-logo" />
          <h1 className="text-white text-base md:text-2xl font-bold hidden sm:block" data-testid="text-columns-header">
            CHS Laker Nation
          </h1>
          <h1 className="text-white text-base font-bold sm:hidden" data-testid="text-columns-header-mobile">
            Lakers
          </h1>
        </Link>
        <nav className="flex gap-1 md:gap-3 items-center">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="link-columns-home-mobile">
              <HomeIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white border-white/20 bg-white/10 hidden md:flex" data-testid="link-columns-home">
              Home
            </Button>
          </Link>
          <Link href="/schedule">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="link-columns-schedule-mobile">
              <Calendar className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white border-white/20 bg-white/10 hidden md:flex" data-testid="link-columns-schedule">
              Schedule
            </Button>
          </Link>
          <Link href="/gallery">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="link-columns-gallery-mobile">
              <Image className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white border-white/20 bg-white/10 hidden md:flex" data-testid="link-columns-gallery">
              Gallery
            </Button>
          </Link>
          <Link href="/subscribe">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="button-columns-notifications-mobile">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="outline" className="bg-white/20 backdrop-blur-sm border-white/40 text-white hidden md:flex" data-testid="button-columns-notifications">
              <Bell className="mr-2 h-4 w-4" />
              Get Notifications
            </Button>
          </Link>
        </nav>
      </header>

      <section className="relative w-full overflow-hidden">
        <div className="block md:hidden">
          <AspectRatio ratio={16 / 9}>
            <div className="relative w-full h-full bg-gradient-to-br from-[hsl(210,85%,35%)] to-[hsl(210,85%,20%)]">
              {heroImages.length > 0 && heroImages.map((img, index) => {
                const isActive = currentImageIndex === index;
                const nextIndex = (currentImageIndex + 1) % heroImages.length;
                const shouldRender = isActive || index === nextIndex;
                if (!shouldRender) return null;
                return (
                  <div
                    key={img}
                    className="absolute inset-0 transition-opacity duration-1000"
                    style={{ opacity: isActive ? 1 : 0 }}
                  >
                    <img
                      src={img}
                      alt="Lakers Athletics"
                      className="w-full h-full object-cover object-center"
                      loading={isActive ? "eager" : "lazy"}
                    />
                  </div>
                );
              })}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
                <h2 className="text-3xl font-bold mb-2" data-testid="text-columns-hero-title">Go Lakers!</h2>
                <p className="text-base max-w-2xl">Follow Colchester High School athletics</p>
              </div>
            </div>
          </AspectRatio>
        </div>
        <div className="hidden md:block">
          <AspectRatio ratio={21 / 9}>
            <div className="relative w-full h-full bg-gradient-to-br from-[hsl(210,85%,35%)] to-[hsl(210,85%,20%)]">
              {heroImages.length > 0 && heroImages.map((img, index) => {
                const isActive = currentImageIndex === index;
                const nextIndex = (currentImageIndex + 1) % heroImages.length;
                const shouldRender = isActive || index === nextIndex;
                if (!shouldRender) return null;
                return (
                  <div
                    key={img}
                    className="absolute inset-0 transition-opacity duration-1000"
                    style={{ opacity: isActive ? 1 : 0 }}
                  >
                    <img
                      src={img}
                      alt="Lakers Athletics"
                      className="w-full h-full object-cover object-center"
                      loading={isActive ? "eager" : "lazy"}
                    />
                  </div>
                );
              })}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
                <h2 className="text-5xl font-bold mb-3" data-testid="text-columns-hero-title-desktop">Go Lakers!</h2>
                <p className="text-xl max-w-2xl">Follow Colchester High School athletics and never miss a game</p>
              </div>
            </div>
          </AspectRatio>
        </div>
      </section>

      <div className="container mx-auto px-3 md:px-4 py-6 md:py-8 max-w-6xl">
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          <Card data-testid="card-columns-results">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-[hsl(150,60%,45%)]" />
                <CardTitle className="text-lg">Recent Results</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
              {recentResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No results yet</p>
              ) : (
                <div className="space-y-3">
                  {recentResults.map((game) => {
                    const lakersScore = game.isHome === "home" ? game.homeScore : game.awayScore;
                    const opponentScore = game.isHome === "home" ? game.awayScore : game.homeScore;
                    const isWin = lakersScore != null && opponentScore != null && lakersScore > opponentScore;
                    return (
                      <div key={game.id} className="py-2 border-b last:border-b-0" data-testid={`row-columns-result-${game.id}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: getSportColor(game.sport) }}
                          >
                            {game.sport}
                          </span>
                          <Badge
                            variant={isWin ? "default" : "secondary"}
                            className="text-xs no-default-active-elevate"
                            data-testid={`badge-columns-result-${game.id}`}
                          >
                            {isWin ? "WIN" : "LOSS"}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium" data-testid={`text-columns-result-opponent-${game.id}`}>
                          {game.isHome === "home" ? "vs" : "@"} {game.opponent}
                        </p>
                        <p className="text-lg font-bold text-[hsl(215,25%,20%)]" data-testid={`text-columns-score-${game.id}`}>
                          {lakersScore} - {opponentScore}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseLocalDate(game.date), "MMM d, yyyy")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-columns-upcoming">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-[hsl(210,85%,35%)]" />
                <CardTitle className="text-lg">Upcoming Games</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
              ) : upcomingGames.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming games</p>
              ) : (
                <div className="space-y-3">
                  {upcomingGames.map((game) => (
                    <div key={game.id} className="py-2 border-b last:border-b-0" data-testid={`row-columns-upcoming-${game.id}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: getSportColor(game.sport) }}
                          data-testid={`badge-columns-sport-${game.id}`}
                        >
                          {game.sport}
                        </span>
                      </div>
                      <p className="text-sm font-medium" data-testid={`text-columns-opponent-${game.id}`}>
                        {game.isHome === "home" ? "vs" : "@"} {game.opponent}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(parseLocalDate(game.date), "MMM d")} at {game.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{game.location}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="text-xs text-muted-foreground" data-testid={`text-columns-attendance-${game.id}`}>
                          <UserCheck className="h-3 w-3 inline mr-1" />
                          {game.attendanceCount} going
                        </span>
                        <Button
                          size="sm"
                          variant={goingGames.has(game.id) ? "secondary" : "default"}
                          onClick={() => attendanceMutation.mutate(game.id)}
                          disabled={goingGames.has(game.id) || attendanceMutation.isPending}
                          data-testid={`button-columns-going-${game.id}`}
                        >
                          {goingGames.has(game.id) ? "Going!" : "I'm going"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-columns-news">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-[hsl(210,85%,35%)]" />
                <CardTitle className="text-lg">News & Updates</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
              {newsArticles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No news articles</p>
              ) : (
                <div className="space-y-3">
                  {newsArticles.slice(0, 8).map((article, idx) => (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block py-2 border-b last:border-b-0 text-[hsl(215,25%,20%)] hover:text-[hsl(210,85%,35%)] transition-colors"
                      data-testid={`link-columns-news-${idx}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium line-clamp-2 flex-1">{article.title}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0 mt-1 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Burlington Free Press
                        {article.publishedAt && ` · ${new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                      </p>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
                <Button size="lg" variant="outline" className="bg-white text-[hsl(210,85%,35%)] border-white/80 font-semibold" data-testid="button-columns-subscribe-cta">
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
