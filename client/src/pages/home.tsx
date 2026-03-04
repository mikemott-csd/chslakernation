import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Calendar, Bell, Clock, MapPin, Newspaper, ExternalLink, UserCheck, ChevronDown, ChevronUp, Home as HomeIcon, Menu, Image } from "lucide-react";
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
  // Legacy sport names for backward compatibility
  "Basketball": "hsl(150, 60%, 45%)",
  "Hockey": "hsl(195, 80%, 40%)",
  "Soccer": "hsl(25, 75%, 50%)",
};

const getSportColor = (sport: string) => sportColors[sport] || "hsl(210, 15%, 50%)";

export default function Home() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [goingGames, setGoingGames] = useState<Set<string>>(new Set());
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
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

  // Load "going" games from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("goingGames");
    if (stored) {
      setGoingGames(new Set(JSON.parse(stored)));
    }
  }, []);

  // Mutation for marking attendance
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

  // Auto-rotate hero images
  useEffect(() => {
    if (heroImages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  // Reset index if it's out of bounds when photos change
  useEffect(() => {
    if (currentImageIndex >= heroImages.length && heroImages.length > 0) {
      setCurrentImageIndex(0);
    }
  }, [heroImages.length, currentImageIndex]);

  // Auto-cycle news articles (show 2 at a time, cycle every 6 seconds)
  const newsPerPage = 2;
  const totalNewsPages = Math.ceil(newsArticles.length / newsPerPage);
  
  useEffect(() => {
    if (newsArticles.length <= newsPerPage) return;
    const interval = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % totalNewsPages);
    }, 6000);
    return () => clearInterval(interval);
  }, [newsArticles.length, totalNewsPages]);

  // Reset news index if it's out of bounds
  useEffect(() => {
    if (currentNewsIndex >= totalNewsPages && totalNewsPages > 0) {
      setCurrentNewsIndex(0);
    }
  }, [totalNewsPages, currentNewsIndex]);

  // Get current news articles to display
  const visibleNews = newsArticles.slice(
    currentNewsIndex * newsPerPage,
    currentNewsIndex * newsPerPage + newsPerPage
  );

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const allUpcomingGames = games
    .filter((game) => parseLocalDate(game.date) >= now && !game.final)
    .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

  // Limit upcoming games to 10 max when expanded, 2 when collapsed
  const upcomingGames = showAllUpcoming ? allUpcomingGames.slice(0, 10) : allUpcomingGames.slice(0, 2);
  
  const hasMoreUpcoming = allUpcomingGames.length > 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(210,20%,98%)] to-white">
      {/* Header */}
      <header className="h-16 md:h-24 bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] flex items-center justify-between px-3 md:px-8 shadow-md">
        <Link href="/" className="flex items-center gap-2 md:gap-4 hover:opacity-90 transition-opacity" data-testid="link-banner-home">
          <img src={logoUrl} alt="CHS Lakers" className="h-10 md:h-18 w-auto object-contain rounded" data-testid="img-logo" />
          <h1 className="text-white text-base md:text-2xl font-bold hidden sm:block" data-testid="text-header">
            CHS Laker Nation
          </h1>
          <h1 className="text-white text-base font-bold sm:hidden" data-testid="text-header-mobile">
            Lakers
          </h1>
        </Link>
        <nav className="flex gap-1 md:gap-3 items-center">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="link-home-mobile">
              <HomeIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white border-white/20 bg-white/10 hidden md:flex" data-testid="link-home">
              Home
            </Button>
          </Link>
          <Link href="/schedule">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="link-schedule-mobile">
              <Calendar className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white border-white/20 bg-white/10 hidden md:flex" data-testid="link-schedule">
              Schedule
            </Button>
          </Link>
          <Link href="/gallery">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="link-gallery-mobile">
              <Image className="h-5 w-5" />
            </Button>
            <Button variant="ghost" className="text-white border-white/20 bg-white/10 hidden md:flex" data-testid="link-gallery">
              Gallery
            </Button>
          </Link>
          <Link href="/subscribe">
            <Button variant="ghost" size="icon" className="text-white border-white/20 bg-white/10 md:hidden" data-testid="button-get-notifications-mobile">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="outline" className="bg-white/20 backdrop-blur-sm border-white/40 text-white hidden md:flex" data-testid="button-get-notifications">
              <Bell className="mr-2 h-4 w-4" />
              Get Notifications
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section with Shuffling Images */}
      <section className="relative w-full overflow-hidden">
        {/* Mobile: 4:3 aspect ratio, Desktop: 16:9 aspect ratio */}
        <div className="block md:hidden">
          <AspectRatio ratio={4/3}>
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
                <h2 className="text-3xl sm:text-4xl font-bold mb-2" data-testid="text-hero-title">
                  Go Lakers!
                </h2>
                <p className="text-base sm:text-xl mb-4 max-w-2xl">
                  Follow Colchester High School athletics and never miss a game
                </p>
                <Link href="/schedule">
                  <Button size="default" className="bg-white text-[hsl(210,85%,35%)] border-white/80 font-semibold" data-testid="button-view-schedule-mobile">
                    <Calendar className="mr-2 h-4 w-4" />
                    View Full Schedule
                  </Button>
                </Link>
              </div>
            </div>
          </AspectRatio>
        </div>
        <div className="hidden md:block">
          <AspectRatio ratio={16/9}>
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
                <h2 className="text-6xl font-bold mb-4" data-testid="text-hero-title-desktop">
                  Go Lakers!
                </h2>
                <p className="text-2xl mb-8 max-w-2xl">
                  Follow Colchester High School athletics and never miss a game
                </p>
                <Link href="/schedule">
                  <Button size="lg" className="text-lg bg-white text-[hsl(210,85%,35%)] border-white/80 font-semibold" data-testid="button-view-schedule">
                    <Calendar className="mr-2 h-5 w-5" />
                    View Full Schedule
                  </Button>
                </Link>
              </div>
            </div>
          </AspectRatio>
        </div>
      </section>

      <div className="container mx-auto px-3 md:px-4 py-6 md:py-12 max-w-3xl">
        <div>
          {/* Upcoming Games */}
          <section>
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <Clock className="h-6 w-6 md:h-8 md:w-8 text-[hsl(210,85%,35%)]" />
              <h3 className="text-xl md:text-3xl font-bold text-[hsl(215,25%,20%)]" data-testid="text-upcoming-header">
                Upcoming Games
              </h3>
            </div>
            {isLoading ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Loading games...
                </CardContent>
              </Card>
            ) : upcomingGames.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No upcoming games scheduled
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingGames.map((game) => (
                  <Card key={game.id} className="hover-elevate transition-all" data-testid={`card-upcoming-${game.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div
                            className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white mb-2"
                            style={{ backgroundColor: getSportColor(game.sport) }}
                            data-testid={`badge-sport-${game.id}`}
                          >
                            {game.sport}
                          </div>
                          <CardTitle className="text-xl">
                            {game.isHome === "home" ? "vs" : "@"} {game.opponent}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2" data-testid={`text-date-${game.id}`}>
                            <Calendar className="h-4 w-4" />
                            {format(parseLocalDate(game.date), "EEEE, MMMM d, yyyy")} at {game.time}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4" />
                            {game.location}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 pt-2 border-t">
                          <span className="text-sm text-muted-foreground" data-testid={`text-attendance-${game.id}`}>
                            <UserCheck className="h-4 w-4 inline mr-1" />
                            {game.attendanceCount} {game.attendanceCount === 1 ? 'person' : 'people'} going
                          </span>
                          <Button
                            size="sm"
                            variant={goingGames.has(game.id) ? "secondary" : "default"}
                            onClick={() => attendanceMutation.mutate(game.id)}
                            disabled={goingGames.has(game.id) || attendanceMutation.isPending}
                            data-testid={`button-going-${game.id}`}
                          >
                            {goingGames.has(game.id) ? "You're going!" : "I'm going"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {hasMoreUpcoming && (
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                    data-testid="button-toggle-upcoming"
                  >
                    {showAllUpcoming ? (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Show More Games
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Laker Sports News */}
        <section className="mt-8 md:mt-12">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 md:gap-3">
                <Newspaper className="h-6 w-6 md:h-8 md:w-8 text-[hsl(210,85%,35%)]" />
                <h3 className="text-xl md:text-3xl font-bold text-[hsl(215,25%,20%)]" data-testid="text-news-header">
                  Laker Sports News
                </h3>
              </div>
              <p className="text-sm text-muted-foreground ml-8 md:ml-11" data-testid="text-news-source">
                From Burlington Free Press
              </p>
            </div>
            {totalNewsPages > 1 && (
              <div className="flex items-center gap-2" data-testid="news-page-indicators">
                {Array.from({ length: totalNewsPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentNewsIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentNewsIndex 
                        ? "bg-[hsl(210,85%,35%)] w-4" 
                        : "bg-[hsl(210,85%,35%)]/30 hover:bg-[hsl(210,85%,35%)]/50"
                    }`}
                    aria-label={`Go to news page ${idx + 1}`}
                    data-testid={`button-news-page-${idx}`}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-6 transition-opacity duration-500" data-testid="news-grid">
            {visibleNews.map((article, index) => (
              <Card key={article.id} className="hover-elevate transition-all animate-in fade-in duration-500">
                <CardContent className="p-6">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[hsl(215,25%,20%)] hover:text-[hsl(210,85%,35%)] transition-colors"
                    data-testid={`link-news-${currentNewsIndex * newsPerPage + index}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-semibold">{article.title}</span>
                      <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Burlington Free Press
                      {article.publishedAt && ` · ${new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </p>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Get Notifications CTA */}
        <section className="mt-12">
          <Card className="bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] text-white border-0">
            <CardContent className="p-8 md:p-12 text-center">
              <Bell className="h-16 w-16 mx-auto mb-4" />
              <h3 className="text-2xl md:text-3xl font-bold mb-4">Never Miss a Game</h3>
              <p className="text-lg mb-6 max-w-2xl mx-auto opacity-90">
                Subscribe to get email notifications 24 hours before each game and on game day morning.
                Stay connected with CHS Laker Nation!
              </p>
              <Link href="/subscribe">
                <Button size="lg" variant="outline" className="bg-white text-[hsl(210,85%,35%)] border-white/80 font-semibold" data-testid="button-subscribe-cta">
                  <Bell className="mr-2 h-5 w-5" />
                  Subscribe to Notifications
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] text-white py-8 mt-12 shadow-inner">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm opacity-80">
            © 2025 CHS Laker Nation. Go Lakers!
          </p>
        </div>
      </footer>
    </div>
  );
}
