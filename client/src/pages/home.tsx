import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Trophy
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import type { Game, SportType } from "@shared/schema";
import logoUrl from "@assets/image_1760554231081.png";

const SPORTS: (SportType | "All Sports")[] = ["All Sports", "Football", "Soccer", "Basketball", "Volleyball"];

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
  "Soccer": { 
    bg: "bg-chart-2", 
    text: "text-white", 
    border: "border-chart-2",
    dot: "bg-chart-2"
  },
  "Basketball": { 
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
};

const SPORT_ICONS: Record<string, typeof Trophy> = {
  "Football": Trophy,
  "Soccer": Trophy,
  "Basketball": Trophy,
  "Volleyball": Trophy,
};

export default function Home() {
  const [selectedSport, setSelectedSport] = useState<SportType | "All Sports">("All Sports");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: games = [], isLoading, isError, error } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  // Filter games by selected sport
  const filteredGames = selectedSport === "All Sports" 
    ? games 
    : games.filter(game => game.sport === selectedSport);

  // Filter games by selected date if one is selected
  const displayedGames = selectedDate
    ? filteredGames.filter(game => isSameDay(new Date(game.date), selectedDate))
    : filteredGames;

  // Get days for the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get games for each day in the current month
  const getGamesForDay = (day: Date) => {
    return filteredGames.filter(game => isSameDay(new Date(game.date), day));
  };

  // Calculate padding days to align with proper weekday
  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Branded Header with Gradient */}
      <header className="w-full bg-gradient-to-r from-primary via-primary to-[#1e3a5f] shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-20 md:h-24 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img 
              src={logoUrl} 
              alt="Colchester Lakers Logo" 
              className="h-12 md:h-16 w-auto"
              data-testid="img-logo"
            />
            <h1 className="text-white text-2xl md:text-3xl font-bold">
              Colchester Lakers Athletics Schedule
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Sport Filter Buttons */}
        <div className="flex flex-wrap gap-4 mb-8" role="group" aria-label="Sport filters">
          {SPORTS.map((sport) => {
            const isActive = selectedSport === sport;
            const colors = SPORT_COLORS[sport];
            
            return (
              <Button
                key={sport}
                onClick={() => {
                  setSelectedSport(sport);
                  setSelectedDate(null);
                }}
                variant={isActive ? "default" : "outline"}
                className={`
                  rounded-full transition-all duration-200
                  ${isActive 
                    ? `${colors.bg} ${colors.text} shadow-md` 
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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Interactive Calendar - 3 columns */}
          <div className="lg:col-span-3">
            <Card className="shadow-md rounded-lg overflow-hidden">
              {/* Month Header */}
              <div className="bg-primary text-primary-foreground p-6 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="text-white hover:bg-white/20"
                  data-testid="button-prev-month"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                
                <h2 className="text-2xl font-bold" data-testid="text-current-month">
                  {format(currentMonth, "MMMM yyyy")}
                </h2>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="text-white hover:bg-white/20"
                  data-testid="button-next-month"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="p-6">
                {/* Day Names */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center text-sm font-semibold text-muted-foreground">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
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
                          transition-colors duration-150 relative
                          ${isCurrentDay ? 'bg-blue-50' : ''}
                          ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}
                          ${hasGames ? 'hover:bg-accent/10 cursor-pointer' : 'cursor-default'}
                          ${!isSameMonth(day, currentMonth) ? 'text-muted-foreground/30' : 'text-foreground'}
                        `}
                        data-testid={`button-calendar-day-${format(day, 'yyyy-MM-dd')}`}
                        aria-label={`${format(day, 'MMMM d, yyyy')}${hasGames ? `, ${dayGames.length} game${dayGames.length > 1 ? 's' : ''}` : ''}`}
                      >
                        <span className={`text-base font-medium ${isCurrentDay ? 'font-bold' : ''}`}>
                          {format(day, "d")}
                        </span>
                        
                        {hasGames && (
                          <div className="flex gap-1 mt-1">
                            {Array.from(new Set(dayGames.map(g => g.sport))).map((sport) => (
                              <div
                                key={sport}
                                className={`w-1.5 h-1.5 rounded-full ${SPORT_COLORS[sport]?.dot || 'bg-primary'}`}
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
            <h2 className="text-2xl font-semibold mb-6 text-foreground">
              {selectedDate ? `Games on ${format(selectedDate, "MMM d")}` : "Upcoming Games"}
            </h2>
            
            <div className="space-y-4 max-h-[600px] lg:max-h-[700px] overflow-y-auto pr-2">
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
                  const colors = SPORT_COLORS[game.sport];
                  const SportIcon = SPORT_ICONS[game.sport] || Trophy;
                  
                  return (
                    <Card 
                      key={game.id} 
                      className="p-6 shadow-sm border hover-elevate transition-all duration-200"
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
                          {format(new Date(game.date), "MMM d, yyyy")}
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
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span data-testid={`text-location-${game.id}`}>{game.location}</span>
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
