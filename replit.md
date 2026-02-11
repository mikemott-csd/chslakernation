# Colchester High School Lakers Athletics Schedule

## Overview
A multi-page sports application for Colchester High School Lakers athletics featuring a dynamic home page with recent results, upcoming games, and a dedicated schedule page with interactive calendar and sport filtering capabilities. The project includes a PostgreSQL database, Google Drive Excel auto-sync for game data, and an email notification system for game reminders.

**Business Vision**: To provide a centralized, easy-to-use platform for Colchester High School students, parents, and fans to stay informed about Lakers athletic events, fostering community engagement and school spirit.
**Market Potential**: Serves as a model for other high schools or local sports organizations seeking to streamline athletic schedule management and communication.
**Project Ambition**: To be the definitive source for CHS Lakers athletics information, offering a seamless user experience and robust administrative features.

## User Preferences
I prefer clear and concise explanations. I want iterative development with frequent, small updates. Ask before making major changes to the project structure or core functionality. Ensure that all new features integrate smoothly with existing components and maintain the established Lakers branding. Do not make changes to the `design_guidelines.md` file.

## System Architecture

### UI/UX Decisions
The application features a responsive design with a strong emphasis on Colchester High School's Lakers branding, utilizing a Lakers blue and green color scheme. The UI incorporates Shadcn components with Tailwind CSS for a modern and consistent look. Key UI elements include:
- **Branded Header**: Full-width gradient background (Lakers Blue to Navy) with the CHS Lakers logo and "Colchester Lakers Athletics Schedule" title. The logo uses CSS screen blend mode with brightness/contrast filters for transparency against the blue background. Header includes "Get Notifications" button across all pages.
- **Sport Filter Buttons**: Pill-shaped buttons allowing users to filter games by sport (Football, Soccer, Basketball, Volleyball, Hockey).
- **Interactive Calendar**: Card-based design with Lakers Blue header, navigation arrows, and game indicators (colored dots) for days with scheduled events.
- **Upcoming Games List**: Scrollable game cards displaying sport badges, date/time, opponent, location, attendance count, and "I'm going" button.
- **Dynamic Home Page**: Features auto-rotating hero images (Lakers-themed sports photos), a "Recent Results" section with scores and WIN/LOSS indicators, and an "Upcoming Games Preview" (next 5 games).

### Technical Implementations
- **Frontend**: React with TypeScript, TanStack Query for data fetching, and Wouter for routing.
- **Backend**: Express.js with a PostgreSQL database.
- **Database**: PostgreSQL (Replit built-in) managed with Drizzle ORM for persistent storage of games, subscriptions, sync logs, and push subscriptions.
- **PWA (Progressive Web App)**: Manifest at `client/public/manifest.json`, service worker at `client/public/firebase-messaging-sw.js`. Registered in `client/src/main.tsx`. Offline caching for app shell. Install prompt component in `client/src/components/InstallPrompt.tsx`.
- **Push Notifications (Firebase Cloud Messaging)**: Cross-platform push via FCM. Client module at `client/src/lib/firebase.ts`, server admin SDK at `server/firebase-admin.ts`. Push subscriptions stored in `push_subscriptions` table with `fcmToken` as the unique identifier. Integrated into existing notification cron job to send push alongside email reminders.
- **Date Handling**: `date-fns` library for robust date and time manipulation.
- **Scheduling**: `node-cron` for automated tasks like Google Drive sync, email notifications, and weekly news updates.
- **Score Tracking**: Database fields `homeScore`, `awayScore`, and a `final` boolean flag for completed games.
- **Attendance Tracking**: Database field `attendanceCount` (integer, default 0) with atomic SQL increment to prevent race conditions under concurrent requests. Users can mark attendance via "I'm going" button with localStorage persistence.
- **Game Deduplication**: Implemented via `upsertGamesBatch` based on sport, date, time, and opponent.
- **Email Notification System**: Integration with Mailjet for sending game reminders with robust deduplication and reliability features:
  - **Three-phase commit**: Notifications use 'pending' → 'sending' → 'sent' status tracking to distinguish crash points
  - **24-hour reminders**: Sent within a 6-hour window (21-27 hours before game) to ensure delivery despite server restarts
  - **Game day reminders**: Sent between 8-9 AM on the day of the game
  - **Atomic deduplication**: Database unique constraint prevents duplicate notifications even under concurrent processing
  - **Stale recovery with crash handling**:
    - Stale 'pending' records (>5 min): Retried (crash before email sent)
    - Stale 'sending' records (>5 min): Retried (crash during email - prioritizes delivery over duplicate prevention)
    - Trade-off: Missing a notification is worse than a rare duplicate reminder
  - **Atomic claims**: Uses UPDATE...WHERE...RETURNING to prevent concurrent workers from claiming the same stale record
- **Admin API**: Secure endpoints for manual Google Drive synchronization and viewing sync logs, authenticated via an `ADMIN_SECRET`.

### Feature Specifications
- **Dynamic Home Page**: Displays auto-rotating hero images, recent game results with scores, a preview of upcoming games, and a "Laker Sports News" section with articles from Burlington Free Press.
- **Automated News Updates**: Weekly cron job (Sundays at 6 AM) fetches sports news articles from Burlington Free Press, stored in the `news_articles` database table. Articles display on the home page with direct links to the source.
- **Dedicated Schedule Page**: An interactive calendar with sport filtering capabilities.
- **Attendance Tracking**: "I'm going" button on all game cards allows users to indicate attendance. Features:
  - Atomic SQL increment preventing race conditions
  - localStorage tracking to prevent duplicate submissions
  - Visual feedback with attendance count ("X people going")
  - Button state changes to "You're going!" after clicking
- **Email Notifications**: Users can subscribe to receive game reminders for specific sports, delivered via Mailjet. "Get Notifications" button accessible from header navigation on all pages.
- **Google Drive Sync**: Hourly automatic synchronization of game schedules from a public Google Drive Excel file. Supports various date/time formats and case-insensitive "Home/Away" parsing.
- **Photo Gallery**: Displays photos synced from Google Drive folder (ID: `1wU0xYomfpuH8U7LTTDrZtMGthmAa_Uo8`). Features:
  - Hourly automatic sync from Google Drive (runs at minute 30)
  - **Disk-based image caching**: Photos (thumbnails + full-size) are downloaded to `photo-cache/` directory during sync and served directly from disk via `res.sendFile()`. No live Google Drive proxying needed. On startup, `ensurePhotosDownloaded()` pre-fetches any missing photos. Removed photos are cleaned up from disk during sync.
  - Responsive grid layout with lightbox viewer for full-size images
  - Service account: `csd-ai-lakers-photo-sync@csd-ai-club.iam.gserviceaccount.com` (requires Viewer access to folder)
  - Supports shared drives with `supportsAllDrives` option
- **Admin Functionality**: API endpoints for manual data synchronization and viewing sync history, protected by an administrator secret.
- **Responsive Design**: Adapts to different screen sizes, providing an optimal viewing experience on both mobile and desktop.

### System Design Choices
The application follows a client-server architecture. The frontend handles user interaction and displays data fetched from the backend. The backend manages data persistence, business logic, external integrations (Google Drive, Mailjet), and scheduled tasks. Data models are defined using TypeScript for type safety across the stack. The system prioritizes data integrity through database-backed logging and deduplication during synchronization.

## Required Secrets (Environment Variables)
All secrets must be configured in the Replit Secrets tab. If any are missing, the corresponding feature will not work.

| Secret | Purpose | Used By |
|--------|---------|---------|
| `FIREBASE_API_KEY` | Firebase client-side API key | Push notifications (client config) |
| `FIREBASE_AUTH_DOMAIN` | Firebase auth domain (e.g., `project.firebaseapp.com`) | Push notifications (client config) |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Push notifications (client + server) |
| `FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID | Push notifications (client config) |
| `FIREBASE_APP_ID` | Firebase app ID | Push notifications (client config) |
| `FIREBASE_VAPID_KEY` | VAPID public key for web push | Push subscription (client-side) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin SDK credentials (full JSON) | Sending push notifications (server) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google service account for Drive API | Photo gallery sync, game schedule sync |
| `MAILJET_API_KEY` | Mailjet API key | Email notifications |
| `MAILJET_SECRET_KEY` | Mailjet secret key | Email notifications |

## External Dependencies

-   **PostgreSQL**: Primary database for storing game schedules, user subscriptions, sync logs, push subscriptions, and news articles.
-   **Firebase Cloud Messaging (FCM)**: Cross-platform push notification delivery. Configured via 7 Firebase secrets listed above. Client config served via `/api/firebase-config` and `/api/vapid-key` endpoints.
-   **Mailjet**: Email service provider for sending game notifications and subscription management emails.
-   **Google Drive (via Excel)**: Used as the source for game schedule data, automatically synchronized via a public Excel file URL set in `SYNC_GOOGLE_DRIVE_URL`.
-   **Google Drive (Photos)**: Photo gallery synced from a shared Google Drive folder using a service account.
-   **Wouter**: A lightweight React router for client-side navigation.
-   **TanStack Query**: For efficient data fetching, caching, and state management in the React frontend.
-   **Drizzle ORM**: TypeScript ORM for interacting with the PostgreSQL database.
-   **date-fns**: JavaScript date utility library.
-   **node-cron**: For scheduling recurring tasks (e.g., hourly Google Drive sync, hourly notification checks).
-   **Shadcn UI**: React components built with Tailwind CSS for styling and UI elements.
-   **Tailwind CSS**: A utility-first CSS framework for rapid UI development.