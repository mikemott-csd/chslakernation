# Colchester High School Lakers Athletics Schedule

## Overview
A single-page sports schedule application for Colchester High School Lakers athletics. The app displays upcoming games for Football, Soccer, Basketball, and Volleyball with an interactive calendar and sport filtering capabilities.

**Live URL**: The application runs on port 5000 and can be published for public access.

## Project Status
✅ **Complete with PostgreSQL Database, Google Drive Auto-Sync, and Email Notifications**
- Branded header with CHS Lakers logo
- Sport filtering (Football, Soccer, Basketball, Volleyball, All Sports)
- Interactive monthly calendar with game indicators
- Upcoming games list with detailed information
- Responsive design with Lakers blue and green color scheme
- **PostgreSQL database** for persistent storage of games, subscriptions, and sync logs
- **Automatic Google Drive Excel sync every hour** (configured via environment variable)
- **Manual sync via admin API** with authentication and audit logging
- **Email notification system with Mailjet integration**
- **Subscribe/unsubscribe functionality with token-based security**

## Recent Changes (November 12, 2025 - Database Migration & Admin API)
- **Migrated all data to PostgreSQL database** for persistence across restarts
  - Games table with automatic seeding on first run
  - Subscriptions table for email notifications
  - Sync logs table for audit trail and debugging
- **Created admin sync API endpoints** with ADMIN_SECRET authentication
  - `POST /api/admin/sync` - Manually trigger Google Drive sync
  - `GET /api/admin/sync-logs` - View sync history with statistics
- **Implemented game deduplication** via upsertGamesBatch (matches on sport/date/time/opponent)
- **Fixed Neon database WebSocket** configuration for reliable connections
- Added database-backed sync logging with error tracking
- Email notification system using database-backed subscriptions
- Subscribe/unsubscribe pages with token-based authentication
- Notification scheduler checks for upcoming games every hour (15 min past)
- Sends emails 24 hours before games and on game day morning (8 AM)

## Previous Changes (October 29, 2025)
- Added Google Drive Excel integration with xlsx library
- Implemented hourly automatic sync using node-cron
- Configured sync via SYNC_GOOGLE_DRIVE_URL environment variable
- Fixed critical date parsing bug (Excel serial dates now convert properly)
- Added comprehensive error tracking for skipped spreadsheet rows
- Case-insensitive Home/Away validation ("home", "Home", "away", "Away")
- Simplified deployment - removed admin panel in favor of environment-based configuration

## Architecture

### Tech Stack
- **Frontend**: React with TypeScript, TanStack Query, Wouter routing
- **Backend**: Express.js with PostgreSQL database
- **Database**: PostgreSQL (Replit built-in) with Drizzle ORM
- **Email**: Mailjet for email notifications
- **UI**: Shadcn components with Tailwind CSS
- **Date Handling**: date-fns library
- **Scheduling**: node-cron for automated tasks

### Project Structure
```
client/src/
  pages/
    home.tsx           - Main sports schedule page
    subscribe.tsx      - Email subscription page
    unsubscribe.tsx    - Unsubscribe confirmation page
  App.tsx              - App routing configuration
shared/schema.ts       - Data models and types (games, subscriptions)
server/
  db.ts                - Database connection setup
  storage.ts           - Database storage interface
  routes.ts            - API endpoints (games, subscriptions)
  sync-service.ts      - Google Drive Excel sync logic
  email-service.ts     - Mailjet email service
  notification-service.ts - Game notification scheduler
  cron.ts              - Hourly jobs (sync & notifications)
  index.ts             - Server initialization
design_guidelines.md   - Visual design specifications
.env                   - Environment configuration
```

### Data Models
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

type Subscription = {
  id: string;
  email: string;
  sports: string[]; // Array of sports to receive notifications for
  unsubscribeToken: string; // Unique token for unsubscribe links
  createdAt: Date;
}
```

### API Endpoints

**Public Endpoints:**
- `GET /api/games` - Returns all games sorted by date
- `POST /api/subscriptions` - Create a new email subscription
- `POST /api/unsubscribe` - Unsubscribe using token

**Admin Endpoints (require ADMIN_SECRET):**
- `POST /api/admin/sync` - Manually trigger Google Drive sync
  - Authentication: Header `x-admin-secret` or body field `adminSecret`
  - Returns: `{ success: boolean, message: string, stats: { added, updated, skipped } }`
  - Logs: Creates entry in sync_logs table with audit trail
- `GET /api/admin/sync-logs` - View sync history
  - Authentication: Header `x-admin-secret` or query param `adminSecret`
  - Returns: Array of sync logs with timestamp, status, games counts, errors

### Google Drive Integration
The schedule automatically syncs from a Google Drive Excel file every hour.

**Configuration:**
- Set the `SYNC_GOOGLE_DRIVE_URL` environment variable with your public Google Drive file URL
- The file must be publicly accessible (Anyone with the link can view)
- Sync runs automatically at the top of every hour

**Excel File Format:**
Required columns:
- **Sport**: Football, Soccer, Basketball, or Volleyball
- **Opponent**: Team name
- **Date**: YYYY-MM-DD format (e.g., 2025-11-15) or Excel date serial number
- **Time**: Game time string (e.g., "7:00 PM") or Excel time format (decimal)
- **Location**: Venue name
- **Home/Away** or **Home / Away** (with spaces): "home" or "away" (case-insensitive)

**Features:**
- Converts Google Drive sharing URLs to export URLs automatically
- Validates all required fields with detailed error tracking
- Skipped rows are tracked and logged to server console
- Date parsing handles both Excel serial numbers and YYYY-MM-DD strings
- Time parsing handles both Excel time format (decimals) and text strings
- Column name flexibility: supports both "Home/Away" and "Home / Away"
- Case-insensitive Home/Away validation

### Email Notification System
Users can subscribe to receive email notifications for Lakers games.

**Configuration:**
- Set the `MAILJET_API_KEY` environment variable with your Mailjet API key
- Set the `MAILJET_SECRET_KEY` environment variable with your Mailjet secret key
- Set the `FROM_EMAIL` environment variable (optional, defaults to noreply@colchesterlakers.com)
- Set the `FROM_NAME` environment variable (optional, defaults to "Colchester Lakers Athletics")
- The system uses the built-in PostgreSQL database to store subscriptions
- **Free Tier:** Mailjet offers 6,000 free emails per month (200/day)

**Features:**
- Users can subscribe via the /subscribe page
- Sport-specific subscriptions (users select which sports to follow)
- Two notifications per game:
  - **24-hour reminder**: Sent 24 hours before game time
  - **Game day reminder**: Sent at 8 AM on game day
- Branded HTML email templates with Lakers colors
- Secure unsubscribe links with unique tokens
- Welcome email sent upon subscription

**How it works:**
1. User visits /subscribe and enters email + selects sports
2. Subscription is saved to database with unique unsubscribe token
3. Welcome email is sent immediately
4. Notification scheduler runs every hour (15 minutes past the hour)
5. Scheduler checks for games in next 24 hours and games today
6. Emails are sent to subscribers interested in those sports
7. Each email includes unsubscribe link

**Notification Timing:**
- 24-hour reminders: Sent when game is 23-25 hours away
- Game day reminders: Sent between 8:00 AM - 9:00 AM on game day
- Hourly check ensures no duplicate emails (once per window)

## Environment Variables

The following environment variables can be configured in the Replit Secrets panel:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string (automatically configured by Replit)
- `SESSION_SECRET` - Session encryption key (automatically configured by Replit)

**Optional (Features):**
- `SYNC_GOOGLE_DRIVE_URL` - Public URL to Google Drive Excel file for automatic game imports
  - Format: `https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing`
  - Leave unset to disable automatic sync (games can still be manually added to database)
- `MAILJET_API_KEY` - Mailjet API key for email notifications
  - Get from [Mailjet Dashboard](https://app.mailjet.com/account/api_keys)
  - Free tier: 6,000 emails/month (200/day)
  - Leave unset to disable email notifications
- `MAILJET_SECRET_KEY` - Mailjet secret key (required with API key)
  - Get from [Mailjet Dashboard](https://app.mailjet.com/account/api_keys)
- `FROM_EMAIL` - Sender email address for notifications (default: `noreply@colchesterlakers.com`)
  - Must be verified in your Mailjet account
- `FROM_NAME` - Sender name for notifications (default: `Colchester Lakers Athletics`)
- `ADMIN_SECRET` - Secret token for admin API endpoints
  - Used to authenticate POST /api/admin/sync and GET /api/admin/sync-logs
  - Example: Generate a strong random token and store it securely

**Usage Example:**
```bash
# Trigger manual sync
curl -X POST https://your-app.replit.app/api/admin/sync \
  -H "x-admin-secret: YOUR_ADMIN_SECRET_HERE"

# View sync logs
curl "https://your-app.replit.app/api/admin/sync-logs?adminSecret=YOUR_ADMIN_SECRET_HERE"
```

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
- Game results and scores tracking
- Team roster pages
- Printable schedule view
- Notification system for schedule changes
- Export to calendar (iCal/Google Calendar)
- Support for additional sports beyond the current four
- Admin panel for manual schedule updates

## Running the Project
```bash
npm run dev
```
Server runs on port 5000 with both frontend and backend.

## Assets
- CHS Lakers logo: `attached_assets/image_1760554231081.png`
- Logo features green dragon with blue "C" letter
