# Colchester High School Sports Schedule

## Overview

This is a web application for displaying the Colchester High School Lakers athletics schedule. The application provides a calendar-based interface for viewing upcoming games across multiple sports (Football, Soccer, Basketball, Volleyball). Users can filter by sport and navigate through months to see game schedules with details like opponent, location, and time.

The application follows a modern sports website design approach inspired by ESPN, TeamSnap, and college athletics sites, featuring the school's Lakers brand colors (blue and green) with sport-specific color coding for visual distinction.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system based on Lakers branding

**Design System**:
- Custom color palette derived from school colors (Lakers Blue: `210 85% 35%`, Lakers Green: `150 60% 45%`)
- Sport-specific color coding for visual categorization
- Consistent spacing using Tailwind's 4/6/8/12 unit system
- Inter font family for typography
- Component variants using class-variance-authority

**Key Components**:
- Calendar view with month navigation
- Sport filter tabs
- Game card display with home/away indicators
- Responsive layout supporting mobile and desktop

### Backend Architecture

**Server Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **Development**: tsx for TypeScript execution
- **Production Build**: esbuild for server bundling, Vite for client bundling

**API Design**:
- RESTful endpoints under `/api` prefix
- Simple JSON response format
- Error handling middleware with status code normalization

**Current Endpoints**:
- `GET /api/games` - Retrieve all games sorted by date

**Storage Layer**:
- In-memory storage implementation (`MemStorage` class)
- Seeded with sample game data
- Interface-based design (`IStorage`) allows for easy database migration
- Game data includes: sport, opponent, date, time, location, home/away status

### Data Schema

**Database ORM**: Drizzle ORM configured for PostgreSQL
- Schema validation with Zod
- Type-safe queries and inserts

**Core Tables**:
1. **users** - User authentication (id, username, password)
2. **games** - Sports schedule (id, sport, opponent, date, time, location, isHome)

**Type Safety**:
- Shared TypeScript types between client and server
- Zod schemas for runtime validation
- Drizzle-zod integration for schema-to-type conversion

### External Dependencies

**Database**: PostgreSQL (via Neon serverless driver)
- Connection pooling with `@neondatabase/serverless`
- Session storage with `connect-pg-simple`
- Environment-based configuration via `DATABASE_URL`

**UI Libraries**:
- Radix UI primitives for accessible components (dialogs, dropdowns, tooltips, etc.)
- Embla Carousel for carousel functionality
- Lucide React for iconography
- date-fns for date manipulation and formatting

**Development Tools**:
- Vite with React plugin for fast development
- TypeScript for type safety
- Replit-specific plugins for development experience (error overlay, cartographer, dev banner)
- Drizzle Kit for database migrations

**Build & Deployment**:
- Vite for client-side bundling
- esbuild for server-side bundling
- Environment-based configuration (development vs production)
- Static file serving in production