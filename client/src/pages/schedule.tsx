import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Trophy,
  Bell,
  UserCheck,
  Home as HomeIcon,
  Calendar,
  Image
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import { parseLocalDate } from "@/lib/dateUtils";
import type { Game, SportType } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/CHSLakerNation_1770824041645.png";

const SPORTS: (SportType | "All Sports")[] = ["All Sports", "Football", "Boys Basketball", "Girls Basketball", "Volleyball", "Boys Hockey", "Girls Ice Hockey"];

const DEFAULT_SPORT_COLOR = { 
  bg: "bg-muted", 
  text: "text-muted-foreground", 
  border: "border-muted",
  dot: "bg-muted"
};

const SPORT_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "All Sports": { 
    bg: "bg-primary", 
    text: "text-primary-foreground", 
    border: "border-primary",
    dot: "bg-primary"
  },
  "Football": { 
    bg: "bg-chart-1", 
    text: "text-white", 
    border: "border-chart-1",
    dot: "bg-chart-1"
  },
  "Boys Basketball": { 
    bg: "bg-chart-2", 
    text: "text-white", 
    border: "border-chart-2",
    dot: "bg-chart-2"
  },
  "Girls Basketball": { 
    bg: "bg-chart-3", 
    text: "text-white", 
    border: "border-chart-3",
    dot: "bg-chart-3"
  },
  "Volleyball": { 
    bg: "bg-chart-4", 
    text: "text-white", 
    border: "border-chart-4",
    dot: "bg-chart-4"
  },
  "Boys Hockey": { 
    bg: "bg-chart-5", 
    text: "text-white", 
    border: "border-chart-5",
    dot: "bg-chart-5"
  },
  "Girls Ice Hockey": { 
    bg: "bg-pink-500", 
    text: "text-white", 
    border: "border-pink-500",
    dot: "bg-pink-500"
  },
  // Legacy sport names for backward compatibility
  "Basketball": { 
    bg: "bg-chart-2", 
    text: "text-white", 
    border: "border-chart-2",
    dot: "bg-chart-2"
  },
  "Hockey": { 
    bg: "bg-chart-5", 
    text: "text-white", 
    border: "border-chart-5",
    dot: "bg-chart-5"
  },
  "Soccer": { 
    bg: "bg-chart-3", 
    text: "text-white", 
    border: "border-chart-3",
    dot: "bg-chart-3"
  },
};

const getSportColors = (sport: string) => SPORT_COLORS[sport] || DEFAULT_SPORT_COLOR;

const SPORT_ICONS: Record<string, typeof Trophy> = {
  "Football": Trophy,
  "Boys Basketball": Trophy,
  "Girls Basketball": Trophy,
  "Volleyball": Trophy,
  "Boys Hockey": Trophy,
  "Girls Ice Hockey": Trophy,
};

export default function Schedule() {
  const [selectedSport, setSelectedSport] = useState<SportType | "All Sports">("All Sports");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [goingGames, setGoingGames] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: games = [], isLoading, isError, error } = useQuery<Game[]>({
    queryKey: ["/api/games"],
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

  // Filter games by selected sport
  const filteredGames = selectedSport === "All Sports" 
    ? games 
    : games.filter(game => game.sport === selectedSport);

  // Get current date for filtering upcoming games
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Filter games by selected date if one is selected, otherwise show only upcoming games
  const displayedGames = selectedDate
    ? filteredGames.filter(game => isSameDay(parseLocalDate(game.date), selectedDate))
    : filteredGames
        .filter(game => parseLocalDate(game.date) >= now)
        .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

  // Get days for the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get games for each day in the current month
  const getGamesForDay = (day: Date) => {
    return filteredGames.filter(game => isSameDay(parseLocalDate(game.date), day));
  };

  // Calculate padding days to align with proper weekday
  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(210,20%,98%)] to-white">
      {/* Branded Header with Gradient */}
      <header className="w-full bg-gradient-to-r from-primary via-primary to-[#1e3a5f] shadow-md">
        <div className="max-w-7xl mx-auto px-3 md:px-6 h-16 md:h-24 flex items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <img 
              src={logoUrl} 
              alt="Colchester Lakers Logo" 
              className="h-10 md:h-18 w-auto object-contain rounded"
              data-testid="img-logo"
            />
            <h1 className="text-white text-base md:text-3xl font-bold hidden sm:block">
              Colchester Lakers Athletics
            </h1>
            <h1 className="text-white text-base font-bold sm:hidden">
              Lakers
            </h1>
          </div>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-8">
        {/* Page Title */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-[hsl(215,25%,20%)] mb-1 md:mb-2">
            Game Schedule
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            View and filter upcoming Lakers games by sport and date
          </p>
        </div>

        {/* Sport Filter Buttons - Scrollable on mobile */}
        <div className="flex gap-2 md:gap-4 mb-4 md:mb-8 overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible" role="group" aria-label="Sport filters">
          {SPORTS.map((sport) => {
            const isActive = selectedSport === sport;
            const colors = SPORT_COLORS[sport];
            
            return (
              <Button
                key={sport}
                size="sm"
                onClick={() => {
                  setSelectedSport(sport);
                  setSelectedDate(null);
                }}
                variant={isActive ? "default" : "outline"}
                className={`
                  rounded-full transition-all duration-200 flex-shrink-0 text-xs md:text-sm font-semibold
                  ${isActive 
                    ? `${colors.bg} ${colors.text}` 
                    : `bg-white ${colors.border} border-2 text-foreground`
                  }
                `}
                data-testid={`button-filter-${sport.toLowerCase().replace(' ', '-')}`}
                aria-pressed={isActive}
              >
                {sport}
              </Button>
            );
          })}
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-8">
          {/* Interactive Calendar - 3 columns */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg rounded-lg overflow-hidden border-2">
              {/* Month Header */}
              <div className="bg-primary text-primary-foreground p-3 md:p-6 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="text-white"
                  data-testid="button-prev-month"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
                
                <h2 className="text-lg md:text-2xl font-bold" data-testid="text-current-month">
                  {format(currentMonth, "MMMM yyyy")}
                </h2>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="text-white"
                  data-testid="button-next-month"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="p-2 md:p-6">
                {/* Day Names */}
                <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 md:mb-4">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, idx) => (
                    <div key={idx} className="text-center text-xs md:text-sm font-semibold text-muted-foreground md:hidden">
                      {day}
                    </div>
                  ))}
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center text-sm font-semibold text-muted-foreground hidden md:block">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1 md:gap-2">
                  {paddingDays.map((_, index) => (
                    <div key={`padding-${index}`} className="aspect-square" />
                  ))}
                  
                  {daysInMonth.map((day) => {
                    const dayGames = getGamesForDay(day);
                    const hasGames = dayGames.length > 0;
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isCurrentDay = isToday(day);
                    
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(isSelected ? null : day)}
                        className={`
                          aspect-square rounded-md flex flex-col items-center justify-center
                          transition-all duration-150 relative p-0.5 md:p-1
                          ${isCurrentDay ? 'bg-[hsl(210,85%,95%)] border border-[hsl(210,85%,35%)]' : ''}
                          ${isSelected ? 'ring-2 ring-primary ring-offset-1 md:ring-offset-2 bg-[hsl(210,85%,90%)]' : ''}
                          ${hasGames && !isSelected ? 'bg-[hsl(150,60%,95%)] hover:bg-[hsl(150,60%,90%)] cursor-pointer' : hasGames ? 'cursor-pointer' : 'cursor-default'}
                          ${!isSameMonth(day, currentMonth) ? 'text-muted-foreground/30' : 'text-foreground'}
                        `}
                        data-testid={`button-calendar-day-${format(day, 'yyyy-MM-dd')}`}
                        aria-label={`${format(day, 'MMMM d, yyyy')}${hasGames ? `, ${dayGames.length} game${dayGames.length > 1 ? 's' : ''}` : ''}`}
                      >
                        <span className={`text-xs md:text-base font-medium ${isCurrentDay ? 'font-bold' : ''}`}>
                          {format(day, "d")}
                        </span>
                        
                        {hasGames && (
                          <div className="flex gap-0.5 md:gap-1 mt-0.5 md:mt-1">
                            {Array.from(new Set(dayGames.map(g => g.sport))).map((sport) => (
                              <div
                                key={sport}
                                className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${SPORT_COLORS[sport]?.dot || 'bg-primary'}`}
                                aria-hidden="true"
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>

          {/* Upcoming Games List - 2 columns */}
          <div className="lg:col-span-2">
            <Card className="p-3 md:p-6 shadow-lg border-2 mb-4 md:mb-6">
              <h2 className="text-lg md:text-2xl font-bold text-[hsl(215,25%,20%)]">
                {selectedDate ? `Games on ${format(selectedDate, "MMM d")}` : "Upcoming Games"}
              </h2>
            </Card>
            
            <div className="space-y-4 max-h-[600px] lg:max-h-[700px] overflow-y-auto pr-2 scrollbar-thin">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground" data-testid="loading-games">
                  Loading games...
                </div>
              ) : isError ? (
                <Card className="p-8 text-center shadow-sm border-destructive/50" data-testid="error-games">
                  <p className="text-destructive font-semibold mb-2">Failed to load games</p>
                  <p className="text-sm text-muted-foreground">
                    {error instanceof Error ? error.message : "Please try refreshing the page"}
                  </p>
                </Card>
              ) : displayedGames.length === 0 ? (
                <Card className="p-8 text-center shadow-sm" data-testid="empty-games">
                  <p className="text-muted-foreground">
                    {selectedDate 
                      ? "No games scheduled for this date." 
                      : selectedSport === "All Sports"
                      ? "No games scheduled."
                      : `No ${selectedSport} games scheduled.`
                    }
                  </p>
                </Card>
              ) : (
                displayedGames.map((game) => {
                  const colors = getSportColors(game.sport);
                  const SportIcon = SPORT_ICONS[game.sport] || Trophy;
                  
                  return (
                    <Card 
                      key={game.id} 
                      className="p-6 shadow-md border-2 hover-elevate transition-all duration-200"
                      data-testid={`card-game-${game.id}`}
                    >
                      {/* Sport Badge */}
                      <div className="flex items-start justify-between mb-3">
                        <Badge 
                          className={`${colors.bg} ${colors.text} flex items-center gap-1.5`}
                          data-testid={`badge-sport-${game.id}`}
                        >
                          <SportIcon className="h-3.5 w-3.5" />
                          {game.sport}
                        </Badge>
                        <Badge 
                          variant="outline"
                          className="text-xs"
                          data-testid={`badge-type-${game.id}`}
                        >
                          {game.isHome === "home" ? "HOME" : "AWAY"}
                        </Badge>
                      </div>

                      {/* Date & Time */}
                      <div className="mb-3">
                        <p className="text-2xl font-bold text-[#1e3a5f]" data-testid={`text-date-${game.id}`}>
                          {format(parseLocalDate(game.date), "MMM d, yyyy")}
                        </p>
                        <p className="text-lg font-semibold text-foreground" data-testid={`text-time-${game.id}`}>
                          {game.time}
                        </p>
                      </div>

                      {/* Opponent */}
                      <div className="mb-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                          {game.isHome === "home" ? "VS" : "@"}
                        </p>
                        <p className="text-lg font-semibold text-foreground" data-testid={`text-opponent-${game.id}`}>
                          {game.opponent}
                        </p>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                        <MapPin className="h-4 w-4" />
                        <span data-testid={`text-location-${game.id}`}>{game.location}</span>
                      </div>

                      {/* Attendance */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t">
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
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
