# Colchester High School Sports Schedule - Design Guidelines

## Design Approach
**Reference-Based**: Drawing inspiration from modern sports/athletic websites (ESPN, TeamSnap, college athletics sites) combined with clean educational interfaces. The design prioritizes information clarity and quick access while maintaining school spirit through the Lakers branding.

## Color Palette

**Primary Colors (from CHS Lakers Logo)**
- Lakers Blue: 210 85% 35% (primary brand color, headers, active states)
- Lakers Green: 150 60% 45% (secondary brand color, accents, sport categories)
- Navy: 215 70% 25% (darker variation for text and depth)

**Neutral Colors**
- Background: 210 20% 98% (light blue-gray tint)
- Card Background: 0 0% 100% (pure white)
- Border: 210 15% 88%
- Text Primary: 215 25% 20%
- Text Secondary: 215 15% 45%

**Sport Category Colors** (subtle variations for visual distinction)
- Football: 210 85% 35% (Lakers Blue)
- Soccer: 150 60% 45% (Lakers Green)
- Basketball: 25 75% 50% (Orange accent)
- Volleyball: 340 70% 55% (Burgundy)

**Interactive States**
- Hover: Lighten primary colors by 10%
- Active/Selected: Full saturation primary colors with subtle shadow
- Calendar Day with Game: Light green/blue tint (155 50% 95%) with colored dot indicator

## Typography

**Font Stack**: 'Inter', system-ui, -apple-system, sans-serif (via Google Fonts)

**Hierarchy**
- Hero Title: 2.5rem (40px), bold, Lakers Navy
- Section Headers: 1.75rem (28px), semibold
- Calendar Month: 1.5rem (24px), bold
- Game Titles: 1.125rem (18px), semibold
- Body Text: 1rem (16px), regular
- Meta Information: 0.875rem (14px), medium

## Layout System

**Spacing Primitives**: Use Tailwind units of 4, 6, 8, and 12 for consistency
- Component padding: p-6 or p-8
- Section spacing: mb-8 or mb-12
- Element gaps: gap-4 or gap-6

**Grid Structure**
- Container: max-w-7xl mx-auto px-6
- Header: Full-width with centered content
- Main Layout: Two-column on desktop (Calendar 60% | Games List 40%), single-column mobile
- Filter Buttons: Horizontal flex wrap with gap-4

## Component Library

**Branded Header**
- Full-width bar with gradient (Lakers Blue to Navy)
- CHS Lakers logo (actual PNG) on left, centered vertically
- "Colchester Lakers Athletics Schedule" title in white, adjacent to logo
- Height: h-20 on mobile, h-24 on desktop
- Shadow: Subtle drop shadow for depth

**Sport Filter Buttons**
- Pill-shaped buttons with rounded-full
- Default: White background, colored border matching sport, colored text
- Active: Filled with sport color, white text, shadow-md
- Layout: Flex wrap, gap-4, mb-8
- Include "All Sports" option with Lakers Blue

**Interactive Calendar**
- Card container with rounded-lg, shadow-md
- Month/year header with Lakers Blue background, white text, navigation arrows
- 7-column grid for days of week
- Day cells: Square aspect ratio, hover states, clickable
- Game indicators: Small colored dots (3px) below date number matching sport color
- Selected date: Ring outline in Lakers Blue
- Current day: Light blue background tint

**Upcoming Games List**
- Scrollable container (max-h-96 overflow-y-auto on desktop)
- Game cards with rounded-md, border, white background
- Each card displays: Sport icon/badge (colored), Date/Time (bold), Opponent name, Location (with pin icon), Home/Away indicator
- Divider lines between cards
- Empty state message when no games match filters

**Game Card Structure**
- Sport badge: Top-left, small rounded pill with sport color and icon
- Date/Time: Large, bold, Lakers Navy
- VS/@ label: Small, uppercase, text-secondary
- Opponent: Medium size, semibold
- Location: Small, with location pin icon, text-secondary

## Visual Effects

**Shadows**: Use sparingly
- Cards: shadow-sm for elevation
- Active buttons: shadow-md
- Header: shadow-md

**Transitions**: Apply to interactive elements
- Buttons: transition-all duration-200
- Calendar days: transition-colors duration-150
- Hover effects: Smooth color and scale changes

**No Animations**: Keep interface snappy and distraction-free

## Accessibility

- Maintain WCAG AA contrast ratios (4.5:1 for text)
- Focus rings on all interactive elements using Lakers Blue
- Semantic HTML (nav, main, section, article)
- ARIA labels for calendar navigation and sport filters
- Keyboard navigation support for calendar

## Images

**Logo Placement**: Use the provided CHS Lakers logo PNG in the header - positioned left side with h-16 on desktop, h-12 on mobile

**No Hero Image Required**: This is a functional schedule page; the branded header with logo is sufficient. Focus screen space on the interactive calendar and game information.

## Responsive Breakpoints

- Mobile (<768px): Single column, stacked calendar above games list
- Tablet (768px-1024px): Maintain two-column with adjusted proportions
- Desktop (>1024px): Full two-column layout with optimal calendar sizing

## Key Design Principles

1. **Information First**: Prioritize quick scanning of schedule data
2. **School Spirit**: Blue/green Lakers colors throughout without overwhelming functionality
3. **Touch-Friendly**: Large tap targets (min 44px) for calendar and buttons
4. **Clear Hierarchy**: Sport filters → Calendar → Games list visual flow
5. **Performance**: Fast interactions, no loading states for filters