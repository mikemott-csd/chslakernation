# Colchester High School Lakers Athletics Schedule

## Overview
A single-page sports schedule application for Colchester High School Lakers athletics. The app displays upcoming games for Football, Soccer, Basketball, and Volleyball with an interactive calendar and sport filtering capabilities.

**Live URL**: The application runs on port 5000 and can be published for public access.

## Project Status
✅ **MVP Complete** - All core features implemented and tested
- Branded header with CHS Lakers logo
- Sport filtering (Football, Soccer, Basketball, Volleyball, All Sports)
- Interactive monthly calendar with game indicators
- Upcoming games list with detailed information
- Responsive design with Lakers blue and green color scheme

## Recent Changes (October 15, 2025)
- Initial implementation completed with all MVP features
- Data schema created for games with support for 4 sports
- In-memory storage seeded with games from October 2025 through January 2026
- Frontend components built with exceptional visual quality following design guidelines
- Backend API endpoint implemented for fetching games
- End-to-end testing completed successfully - all features working

## Architecture

### Tech Stack
- **Frontend**: React with TypeScript, TanStack Query, Wouter routing
- **Backend**: Express.js with in-memory storage
- **UI**: Shadcn components with Tailwind CSS
- **Date Handling**: date-fns library

### Project Structure
```
client/src/
  pages/home.tsx          - Main sports schedule page
  App.tsx                 - App routing configuration
shared/schema.ts          - Data models and types
server/
  storage.ts             - In-memory storage with game data
  routes.ts              - API endpoints
design_guidelines.md     - Visual design specifications
```

### Data Model
```typescript
type Game = {
  id: string;
  sport: "Football" | "Soccer" | "Basketball" | "Volleyball";
  opponent: string;
  date: Date;
  time: string;
  location: string;
  isHome: "home" | "away";
}
```

### API Endpoints
- `GET /api/games` - Returns all games sorted by date

## Key Features

### 1. Branded Header
- Full-width gradient background (Lakers Blue to Navy)
- CHS Lakers logo on left
- "Colchester Lakers Athletics Schedule" title in white
- Responsive height (h-20 mobile, h-24 desktop)

### 2. Sport Filter Buttons
- Pill-shaped buttons with rounded-full styling
- Options: All Sports, Football, Soccer, Basketball, Volleyball
- Active state: Filled with sport color, white text, shadow-md
- Inactive state: White background, colored border and text

### 3. Interactive Calendar
- Card-based design with shadow-md
- Lakers Blue header with month/year and navigation arrows
- 7-column grid for days of week
- Game indicators: Colored dots (1.5px) below date numbers
- Selected date: Ring outline in Lakers Blue
- Current day: Light blue background tint
- Click to filter games by date

### 4. Upcoming Games List
- Scrollable container (max-h-96 on desktop)
- Game cards display:
  - Sport badge with color and icon
  - Date & time in bold Lakers Navy
  - VS/@ label for home/away
  - Opponent name
  - Location with map pin icon
- Empty state messages
- Loading state
- Error state with helpful message

## Color Scheme (Lakers Branding)
- **Lakers Blue** (Primary): `210 85% 35%` - Headers, active states, Football
- **Lakers Green** (Accent): `150 60% 45%` - Accents, Soccer
- **Basketball**: `25 75% 50%` (Orange)
- **Volleyball**: `340 70% 55%` (Burgundy)
- **Background**: `210 20% 98%` (Light blue-gray tint)
- **Text Primary**: `215 25% 20%` (Navy)
- **Text Secondary**: `215 15% 45%`

## User Interaction Flow
1. User lands on home page and sees upcoming games for all sports
2. User can click sport filter buttons to view specific sport schedules
3. User navigates calendar months using arrow buttons
4. User clicks calendar day to see games on that specific date
5. Calendar dots indicate which days have games and which sports
6. User can deselect date to return to full upcoming games view

## Design Principles
1. **Information First**: Quick scanning of schedule data
2. **School Spirit**: Lakers blue/green throughout
3. **Touch-Friendly**: Large tap targets (min 44px)
4. **Clear Hierarchy**: Filters → Calendar → Games list
5. **Responsive**: Single column mobile, two-column desktop

## Testing
- All user interactions tested end-to-end
- Sport filtering verified for all sports
- Calendar navigation and date selection working correctly
- Games list updates properly based on filters and date
- Responsive behavior confirmed across breakpoints
- Visual quality and color scheme verified

## Future Enhancements
- Admin interface to add/edit games
- Game results and scores tracking
- Team roster pages
- Printable schedule view
- Notification system for schedule changes
- Export to calendar (iCal/Google Calendar)

## Running the Project
```bash
npm run dev
```
Server runs on port 5000 with both frontend and backend.

## Assets
- CHS Lakers logo: `attached_assets/image_1760554231081.png`
- Logo features green dragon with blue "C" letter
