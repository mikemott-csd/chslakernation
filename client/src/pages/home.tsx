import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Bell, Trophy, Clock, MapPin, Newspaper, ExternalLink, UserCheck, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import type { Game, NewsArticle } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/Champ_(1)_(1)_1764791051222.png";
import basketballImg from "@assets/generated_images/Lakers_basketball_game_action_d0021acb.png";
import footballImg from "@assets/generated_images/Lakers_football_team_huddle_2dd07c0a.png";
import soccerImg from "@assets/generated_images/Lakers_soccer_action_shot_12c64d04.png";
import volleyballImg from "@assets/generated_images/Lakers_volleyball_spike_action_2c2516e6.png";

const heroImages = [basketballImg, footballImg, soccerImg, volleyballImg];

const sportColors = {
  Football: "hsl(210, 85%, 35%)",
  Soccer: "hsl(150, 60%, 45%)",
  Basketball: "hsl(25, 75%, 50%)",
  Volleyball: "hsl(340, 70%, 55%)",
  Hockey: "hsl(195, 80%, 40%)",
};

export default function Home() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [goingGames, setGoingGames] = useState<Set<string>>(new Set());
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const { toast } = useToast();

  const { data: games = [], isLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const { data: newsArticles = [] } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news"],
  });

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
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date();
  const allUpcomingGames = games
    .filter((game) => new Date(game.date) >= now && !game.final)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const allRecentGames = games
    .filter((game) => game.final)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const upcomingGames = showAllUpcoming ? allUpcomingGames : allUpcomingGames.slice(0, 2);
  const recentGames = showAllRecent ? allRecentGames : allRecentGames.slice(0, 2);
  
  const hasMoreUpcoming = allUpcomingGames.length > 2;
  const hasMoreRecent = allRecentGames.length > 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(210,20%,98%)] to-white">
      {/* Header */}
      <header className="h-20 md:h-24 bg-gradient-to-r from-[hsl(210,85%,35%)] to-[hsl(210,85%,25%)] flex items-center justify-between px-4 md:px-8 shadow-md">
        <div className="flex items-center gap-4">
          <img src={logoUrl} alt="CHS Lakers" className="h-14 md:h-18 w-auto object-contain rounded" data-testid="img-logo" />
          <h1 className="text-white text-xl md:text-2xl font-bold" data-testid="text-header">
            Colchester Lakers Athletics
          </h1>
        </div>
        <nav className="flex gap-2 md:gap-4 items-center">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-white/20" data-testid="link-home">
              Home
            </Button>
          </Link>
          <Link href="/schedule">
            <Button variant="ghost" className="text-white hover:bg-white/20" data-testid="link-schedule">
              Schedule
            </Button>
          </Link>
          <Link href="/subscribe">
            <Button variant="outline" className="bg-white/10 backdrop-blur-sm border-white text-white hover:bg-white/20" data-testid="button-get-notifications">
              <Bell className="mr-2 h-4 w-4" />
              Get Notifications
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section with Shuffling Images */}
      <section className="relative h-[400px] md:h-[500px] overflow-hidden">
        {heroImages.map((img, index) => (
          <div
            key={index}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: currentImageIndex === index ? 1 : 0 }}
          >
            <img
              src={img}
              alt="Lakers Athletics"
              className="w-full h-full object-contain bg-gradient-to-br from-[hsl(210,85%,35%)] to-[hsl(210,85%,20%)]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          </div>
        ))}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-4">
          <h2 className="text-4xl md:text-6xl font-bold mb-4" data-testid="text-hero-title">
            Go Lakers!
          </h2>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl">
            Follow Colchester High School athletics and never miss a game
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/schedule">
              <Button size="lg" variant="default" className="bg-[hsl(210,85%,35%)] border-[hsl(210,85%,30%)]" data-testid="button-view-schedule">
                <Calendar className="mr-2 h-5 w-5" />
                View Full Schedule
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Upcoming Games */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Clock className="h-8 w-8 text-[hsl(210,85%,35%)]" />
              <h3 className="text-2xl md:text-3xl font-bold text-[hsl(215,25%,20%)]" data-testid="text-upcoming-header">
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
                            style={{ backgroundColor: sportColors[game.sport as keyof typeof sportColors] }}
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
                            {format(new Date(game.date), "EEEE, MMMM d, yyyy")} at {game.time}
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
                    variant="ghost"
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
                        Show {allUpcomingGames.length - 2} More Games
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </section>

          {/* Recent Games with Scores */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="h-8 w-8 text-[hsl(150,60%,45%)]" />
              <h3 className="text-2xl md:text-3xl font-bold text-[hsl(215,25%,20%)]" data-testid="text-recent-header">
                Recent Results
              </h3>
            </div>
            {isLoading ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Loading results...
                </CardContent>
              </Card>
            ) : recentGames.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No completed games yet. Check back after the first game!
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {recentGames.map((game) => {
                  const lakersScore = game.isHome === "home" ? game.homeScore : game.awayScore;
                  const opponentScore = game.isHome === "home" ? game.awayScore : game.homeScore;
                  const won = lakersScore !== null && opponentScore !== null && lakersScore > opponentScore;

                  return (
                    <Card key={game.id} className="hover-elevate transition-all" data-testid={`card-recent-${game.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div
                              className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white mb-2"
                              style={{ backgroundColor: sportColors[game.sport as keyof typeof sportColors] }}
                              data-testid={`badge-sport-recent-${game.id}`}
                            >
                              {game.sport}
                            </div>
                            <CardTitle className="text-xl">
                              {game.isHome === "home" ? "vs" : "@"} {game.opponent}
                            </CardTitle>
                          </div>
                          {lakersScore !== null && opponentScore !== null && (
                            <div className="text-right">
                              <div
                                className={`text-2xl font-bold ${won ? "text-[hsl(150,60%,45%)]" : "text-muted-foreground"}`}
                                data-testid={`score-${game.id}`}
                              >
                                {lakersScore} - {opponentScore}
                              </div>
                              <div className={`text-sm font-semibold ${won ? "text-[hsl(150,60%,45%)]" : "text-muted-foreground"}`}>
                                {won ? "WIN" : "LOSS"}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground" data-testid={`text-date-recent-${game.id}`}>
                          {format(new Date(game.date), "MMMM d, yyyy")}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {hasMoreRecent && (
                  <Button
                    variant="ghost"
                    className="w-full mt-2"
                    onClick={() => setShowAllRecent(!showAllRecent)}
                    data-testid="button-toggle-recent"
                  >
                    {showAllRecent ? (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Show {allRecentGames.length - 2} More Results
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Laker Sports News */}
        <section className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <Newspaper className="h-8 w-8 text-[hsl(210,85%,35%)]" />
            <h3 className="text-2xl md:text-3xl font-bold text-[hsl(215,25%,20%)]" data-testid="text-news-header">
              Laker Sports News
            </h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {newsArticles.slice(0, 4).map((article, index) => (
              <Card key={article.id} className="hover-elevate transition-all">
                <CardContent className="p-6">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between gap-3 text-[hsl(215,25%,20%)] hover:text-[hsl(210,85%,35%)] transition-colors"
                    data-testid={`link-news-${index}`}
                  >
                    <span className="font-semibold">{article.title}</span>
                    <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1" />
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
                Stay connected with Lakers Athletics!
              </p>
              <Link href="/subscribe">
                <Button size="lg" variant="outline" className="bg-white text-[hsl(210,85%,35%)] border-0" data-testid="button-subscribe-cta">
                  <Bell className="mr-2 h-5 w-5" />
                  Subscribe to Notifications
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-[hsl(215,25%,20%)] text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm opacity-80">
            © 2025 Colchester High School Lakers Athletics. Go Lakers!
          </p>
        </div>
      </footer>
    </div>
  );
}
